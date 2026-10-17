const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { create: contentDisposition } = require('content-disposition');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');
const docs = require('./documents');
const index = require('./search-index');
const media = require('./media');
const jobs = require('./jobs');
const access = require('./access');
const { normalize, ftsQuery, tokens } = require('./arabic');
const { TYPES, typeOf, typeCondition } = require('./filetypes');

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// اسم الملف يصل أحياناً بترميز latin1 فتظهر الحروف العربية مشوهة
function fixName(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return /[^\x00-\xff]/.test(name) || decoded.includes('�') ? name : decoded;
}

// اسم آمن لملف ينشئه التطبيق (ملاحظة أو رابط) من عنوان يكتبه المستخدم
function safeName(title, fallback) {
  const clean = String(title || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
  return clean || fallback;
}

function parseUrl(raw) {
  let text = String(raw || '').trim();
  if (text && !/^[a-z][a-z0-9+.-]*:/i.test(text)) text = 'https://' + text;
  try {
    const u = new URL(text);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u;
  } catch {}
  throw httpError(400, 'الرابط غير صحيح. مثال: https://example.com');
}

const parseUrlFile = (buf) => /^URL=(.+)$/m.exec(buf.toString('utf8'))?.[1].trim() || null;
const urlFile = (url) => Buffer.from(`[InternetShortcut]\r\nURL=${url}\r\n`, 'utf8');
const URL_MIME = 'application/internet-shortcut';

// الأنواع التي تُعرض داخل التطبيق بدلاً من تنزيلها
const INLINE_MIME = /^(application\/pdf|image\/(png|jpe?g|gif|webp|bmp|avif)|text\/plain|video\/[\w.+-]+|audio\/[\w.+-]+)$/;

const SHARE_DAYS = new Set([1, 7, 30, 0]); // 0 = بدون انتهاء

// لا نقرأ محتوى الملفات الضخمة للبحث، فتُبحث بالاسم والوسوم فقط
const MAX_INDEX_BYTES = 50 * 1024 * 1024;

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(/[,،]/);
  return [...new Set(list.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean))].join('، ');
}

// تاريخ بصيغة YYYY-MM-DD أو null
function parseDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw httpError(400, 'تاريخ الانتهاء غير صحيح');
  return s;
}

const parseId = (v) => (v == null || v === '' || v === 'root' ? null : Number(v));

function createApp({ storage, onChange = () => {} }) {
  const app = express();
  const d = db.get();
  // الملفات المرفوعة تُكتب على القرص مباشرة، فيمكن رفع فيديو بعدة غيغابايت دون استهلاك الذاكرة
  fs.mkdirSync(config.uploadTmpDir, { recursive: true });
  const upload = multer({
    dest: config.uploadTmpDir,
    limits: config.maxUploadMb > 0 ? { fileSize: config.maxUploadMb * 1024 * 1024 } : {},
  });
  const cleanupUploads = (req, res, next) => {
    res.on('close', () => {
      for (const f of [].concat(req.files || [], req.file || [])) fs.rm(f.path, { force: true }, () => {});
    });
    next();
  };

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });

  const log = (userId, fileId, action, detail = '') =>
    d.prepare('INSERT INTO activity (user_id, file_id, action, detail) VALUES (?, ?, ?, ?)').run(userId, fileId, action, detail);

  // ---------- الصلاحيات ----------

  const visibleFolders = (req) => (req._visible === undefined ? (req._visible = access.visibleFolderIds(req.user)) : req._visible);

  const folderRow = (req, id) => {
    if (id == null) return null;
    const f = d.prepare('SELECT * FROM folders WHERE id = ?').get(Number(id));
    if (!f || !access.canSeeFolder(req.user, f.id, visibleFolders(req))) throw httpError(404, 'المجلد غير موجود');
    return f;
  };

  const fileRow = (req, id) => {
    const f = d.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL').get(Number(id));
    if (!f || !access.canSeeFolder(req.user, f.folder_id, visibleFolders(req))) throw httpError(404, 'الملف غير موجود');
    return f;
  };

  const versionRow = (fileId, no) => {
    const v = d.prepare('SELECT * FROM versions WHERE file_id = ? AND version_no = ?').get(fileId, no);
    if (!v) throw httpError(404, 'النسخة غير موجودة');
    return v;
  };

  // ---------- عرض الملفات ----------

  const today = () => new Date().toISOString().slice(0, 10);
  const daysUntil = (date) => Math.round((Date.parse(date) - Date.parse(today())) / 86_400_000);

  function expiryState(f) {
    if (!f.expires_on) return null;
    const left = daysUntil(f.expires_on);
    if (left < 0) return 'expired';
    return left <= (f.remind_days ?? 30) ? 'soon' : 'ok';
  }

  const serializeFile = (f, folders) => ({
    id: f.id,
    name: f.name,
    archiveNo: f.archive_no,
    type: typeOf(f.name).key,
    category: f.category,
    tags: f.tags,
    description: f.description,
    url: f.url || null,
    mime: f.mime,
    size: f.size,
    version: f.current_version,
    editable: docs.editKind(f.name),
    thumb: f.thumb_version ? `/api/files/${f.id}/thumb?v=${f.thumb_version}` : null,
    folderId: f.folder_id,
    folderPath: f.folder_id ? access.folderPath(f.folder_id, folders) : [],
    expiresOn: f.expires_on,
    remindDays: f.remind_days,
    expiry: expiryState(f),
    daysLeft: f.expires_on ? daysUntil(f.expires_on) : null,
    createdAt: f.created_at,
    createdBy: f.created_by_name,
    createdById: f.created_by,
    updatedAt: f.updated_at,
    updatedBy: f.updated_by_name,
    deletedAt: f.deleted_at,
  });

  const FILE_SELECT = `SELECT f.*, cu.display_name AS created_by_name, uu.display_name AS updated_by_name
    FROM files f LEFT JOIN users cu ON cu.id = f.created_by LEFT JOIN users uu ON uu.id = f.updated_by`;

  const loadFile = (id) => serializeFile(d.prepare(`${FILE_SELECT} WHERE f.id = ?`).get(id), access.allFolders());

  // ---------- الحفظ ----------

  // source: Buffer أو { path } لملف مرفوع على القرص
  async function indexableText(source, name, size) {
    if (!docs.canExtract(name) || size > MAX_INDEX_BYTES) return '';
    return docs.extractText(Buffer.isBuffer(source) ? source : await fs.promises.readFile(source.path), name);
  }

  const hashOf = (source) =>
    Buffer.isBuffer(source) ? crypto.createHash('sha256').update(source).digest('hex') : jobs.hashFile(source.path);

  // الصورة المصغرة تُنشأ من الملف المرفوع قبل نقله إلى التخزين، فلا نحتاج لتنزيله من Drive لاحقاً
  const thumbOf = (source, name) => (Buffer.isBuffer(source) ? null : media.makeThumb(source.path, name));

  async function prepare(source, name, size) {
    const [hash, text, thumb] = await Promise.all([hashOf(source), indexableText(source, name, size), thumbOf(source, name)]);
    return { hash, text, thumb };
  }

  // إذا فشل تسجيل الملف في قاعدة البيانات بعد حفظه، نحذف المحتوى حتى لا يبقى ملف يتيم
  async function withCleanup(key, fn) {
    try {
      return fn();
    } catch (err) {
      await storage.remove(key).catch(() => {});
      throw err;
    }
  }

  // تسجيل نسخة جديدة دون المساس بالنسخ السابقة
  async function addVersion(file, source, size, mime, note, user, prepared) {
    const p = prepared || (await prepare(source, file.name, size));
    const key = await storage.put(source, `${file.id}-v${file.current_version + 1}-${file.name}`, mime);
    const no = await withCleanup(key, () => recordVersion(file, { key, size, mime, note, user, hash: p.hash, text: p.text }));
    await afterVersion(file.id, no, p.thumb);
    return no;
  }

  function recordVersion(file, { key, size, mime, note, user, hash, text }) {
    return db.transaction(() => {
      const no = d.prepare('SELECT current_version FROM files WHERE id = ?').get(file.id).current_version + 1;
      d.prepare('INSERT INTO versions (file_id, version_no, storage_key, size, mime, note, created_by, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        file.id, no, key, size, mime, note, user.id, hash,
      );
      d.prepare("UPDATE files SET current_version = ?, size = ?, mime = ?, url = ?, thumb_version = NULL, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(
        no, size, mime, file.url ?? null, user.id, file.id,
      );
      // نصوص القراءة الضوئية والتفريغ تخص النسخة السابقة، فتُعاد للنسخة الجديدة في الخلفية
      d.prepare("DELETE FROM file_text WHERE file_id = ? AND source IN ('ocr', 'transcript')").run(file.id);
      index.setText(file.id, 'content', text);
      index.rebuild(file.id);
      return no;
    });
  }

  async function afterVersion(fileId, versionNo, thumb) {
    const kinds = ['ocr', 'transcribe'];
    if (thumb) {
      await media.saveThumb(fileId, versionNo, thumb);
      d.prepare('UPDATE files SET thumb_version = ? WHERE id = ?').run(versionNo, fileId);
    } else kinds.unshift('thumb');
    jobs.enqueueFor(d.prepare('SELECT * FROM files WHERE id = ?').get(fileId), kinds);
  }

  async function createFile({ name, source, size, mime, url = null, body, user, action, folderId, prepared }) {
    const p = prepared || (await prepare(source, name, size));
    const expiresOn = parseDate(body.expiresOn);
    const key = await storage.put(source, `v1-${name}`, mime);
    const id = await withCleanup(key, () => db.transaction(() => {
      const r = d.prepare(`INSERT INTO files (name, category, tags, description, url, mime, size, created_by, updated_by, folder_id, archive_no, expires_on, remind_days, thumb_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`).run(
        name,
        String(body.category || '').trim(),
        cleanTags(body.tags),
        String(body.description || '').trim(),
        url,
        mime,
        size,
        user.id,
        user.id,
        folderId,
        db.nextArchiveNo(),
        expiresOn,
        Math.max(1, Math.min(365, Number(body.remindDays) || 30)),
      );
      const fid = Number(r.lastInsertRowid);
      d.prepare("INSERT INTO versions (file_id, version_no, storage_key, size, mime, note, created_by, hash) VALUES (?, 1, ?, ?, ?, 'النسخة الأصلية', ?, ?)").run(
        fid, key, size, mime, user.id, p.hash,
      );
      index.setText(fid, 'content', p.text);
      index.rebuild(fid);
      log(user.id, fid, action, name);
      return fid;
    }));
    if (p.thumb) {
      await media.saveThumb(id, 1, p.thumb);
      d.prepare('UPDATE files SET thumb_version = 1 WHERE id = ?').run(id);
    }
    jobs.enqueueFor(d.prepare('SELECT * FROM files WHERE id = ?').get(id), p.thumb ? ['ocr', 'transcribe', 'ai_tags'] : undefined);
    return loadFile(id);
  }

  // ملف مطابق تماماً (بنفس البصمة) موجود مسبقاً في الأرشيف
  function findDuplicate(req, hash) {
    if (!hash) return null;
    const rows = d.prepare(`SELECT DISTINCT f.* FROM versions v JOIN files f ON f.id = v.file_id WHERE v.hash = ? AND f.deleted_at IS NULL`).all(hash);
    const visible = visibleFolders(req);
    const f = rows.find((r) => access.canSeeFolder(req.user, r.folder_id, visible)) || rows[0];
    if (!f) return null;
    const seen = access.canSeeFolder(req.user, f.folder_id, visible);
    return seen
      ? { id: f.id, name: f.name, archiveNo: f.archive_no, folderPath: access.folderPath(f.folder_id).map((p) => p.name) }
      : { id: null, name: 'ملف في مجلد خاص', archiveNo: f.archive_no, folderPath: [] };
  }

  const targetFolder = (req, value) => {
    const id = parseId(value);
    if (id != null) folderRow(req, id);
    return id;
  };

  // ---------- إرسال المحتوى ----------

  // طلبات Range تأتي من مشغّل الفيديو أو من استكمال تنزيل متوقف، فلا نحسبها تنزيلاً جديداً
  const isNewDownload = (req, inline) => !inline && !req.get('range');

  async function sendStored(req, res, v, name, inline) {
    res.set('Content-Type', inline ? v.mime : 'application/octet-stream');
    res.set('Content-Disposition', contentDisposition(name, { type: inline ? 'inline' : 'attachment' }));
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.set('Cache-Control', 'private, no-store');

    if (storage.localPath) {
      return res.sendFile(storage.localPath(v.storage_key), { cacheControl: false, lastModified: false });
    }
    const { status, headers, stream } = await storage.openStream(v.storage_key, req.get('range'));
    const header = (k) => (typeof headers.get === 'function' ? headers.get(k) : headers[k]);
    res.status(status === 206 ? 206 : 200);
    res.set('Accept-Ranges', 'bytes');
    for (const k of ['content-length', 'content-range']) if (header(k)) res.set(k, header(k));
    stream.on('error', (err) => res.destroy(err));
    stream.pipe(res);
  }

  const publicBase = (req) => config.publicUrl || `${req.protocol}://${req.get('host')}`;

  const ctx = {
    d, storage, log, httpError, parseId, parseDate, cleanTags, visibleFolders, folderRow, fileRow, versionRow,
    serializeFile, loadFile, FILE_SELECT, publicBase, sendStored, isNewDownload, INLINE_MIME, SHARE_DAYS,
  };

  const api = express.Router();

  // كل طلب يغيّر البيانات يجب أن يحمل هذا الرأس، فلا تستطيع مواقع أخرى إرسال طلبات باسم المستخدم
  api.use((req, res, next) => {
    if (req.method !== 'GET' && req.get('X-Requested-With') !== 'archive-app') {
      return res.status(403).json({ error: 'طلب غير مسموح' });
    }
    next();
  });

  api.post('/login', auth.login);
  api.post('/logout', auth.logout);
  api.use(auth.requireUser);
  api.use((req, res, next) => {
    if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && onChange());
    next();
  });

  api.get('/me', (req, res) => res.json({ user: auth.publicUser(req.user) }));

  api.post('/me/password', (req, res) => {
    const { current, password } = req.body || {};
    if (!require('bcryptjs').compareSync(String(current || ''), req.user.password_hash)) {
      throw httpError(400, 'كلمة المرور الحالية غير صحيحة');
    }
    auth.validatePassword(password);
    d.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(password), req.user.id);
    res.json({ ok: true });
  });

  // أنواع الملفات وألوانها والميزات المتاحة على هذا الخادم
  api.get('/meta', (req, res) => {
    res.json({
      types: TYPES.map(({ key, label, color }) => ({ key, label, color })),
      features: {
        thumbnails: media.capabilities.thumbnails,
        videoThumbnails: media.capabilities.video,
        ocr: config.ocr,
        transcribe: require('./transcribe').enabled() && media.capabilities.audio,
        ai: require('./ai').enabled(),
      },
    });
  });

  // ---------- القائمة والبحث والتصفية ----------

  api.get('/files', (req, res) => {
    const where = ['f.deleted_at IS NULL'];
    const params = [];
    const vis = access.fileVisibility(req.user);
    where.push(vis.sql);
    params.push(...vis.params);

    const q = String(req.query.q || '').trim();
    const fts = ftsQuery(q);
    if (fts) {
      where.push('f.id IN (SELECT rowid FROM files_fts WHERE files_fts MATCH ?)');
      params.push(fts);
    }
    if (req.query.folder !== undefined && req.query.folder !== '') {
      const folderId = parseId(req.query.folder);
      if (folderId == null) where.push('f.folder_id IS NULL');
      else {
        folderRow(req, folderId);
        where.push('f.folder_id = ?');
        params.push(folderId);
      }
    }
    if (req.query.category) {
      where.push('f.category = ?');
      params.push(String(req.query.category));
    }
    if (req.query.uploader) {
      where.push('f.created_by = ?');
      params.push(Number(req.query.uploader));
    }
    if (req.query.type) {
      const cond = typeCondition(String(req.query.type));
      if (cond) {
        where.push(cond.sql);
        params.push(...cond.params);
      }
    }
    if (req.query.expiry === 'soon') {
      where.push("f.expires_on IS NOT NULL AND f.expires_on >= date('now') AND f.expires_on <= date('now', '+' || f.remind_days || ' days')");
    } else if (req.query.expiry === 'expired') {
      where.push("f.expires_on IS NOT NULL AND f.expires_on < date('now')");
    } else if (req.query.expiry === 'any') {
      where.push('f.expires_on IS NOT NULL');
    }
    const order = {
      name: 'f.name COLLATE NOCASE',
      oldest: 'f.updated_at ASC',
      size: 'f.size DESC',
      expiry: 'f.expires_on IS NULL, f.expires_on ASC',
    }[req.query.sort] || 'f.updated_at DESC';
    const rows = d.prepare(`${FILE_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 1000`).all(...params);
    const folders = access.allFolders();
    const files = rows.map((r) => serializeFile(r, folders));
    if (q) attachTranscriptHits(files, q);
    res.json({ files });
  });

  // عند البحث: المقاطع التي ذُكرت فيها الكلمات داخل الفيديو أو الصوت، مع توقيتها
  function attachTranscriptHits(files, q) {
    const words = tokens(q);
    if (!words.length) return;
    const get = d.prepare('SELECT segments FROM transcripts WHERE file_id = ? AND version_no = ?');
    for (const f of files) {
      if (f.type !== 'video' && f.type !== 'audio') continue;
      const row = get.get(f.id, f.version);
      if (!row) continue;
      const segments = JSON.parse(row.segments);
      f.transcriptHits = segments
        .filter((s) => {
          const t = normalize(s.text);
          return words.every((w) => t.includes(w) || t.includes(w.replace(/^(ال|وال|بال|لل)/, '')));
        })
        .slice(0, 5);
    }
  }

  api.get('/categories', (req, res) => {
    const vis = access.fileVisibility(req.user);
    const rows = d
      .prepare(`SELECT category, COUNT(*) AS count FROM files f WHERE deleted_at IS NULL AND category != '' AND ${vis.sql} GROUP BY category ORDER BY category`)
      .all(...vis.params);
    res.json({ categories: rows });
  });

  // الموظفون الذين رفعوا ملفات، لتصفية الملفات حسب من رفعها
  api.get('/uploaders', (req, res) => {
    const vis = access.fileVisibility(req.user);
    const rows = d
      .prepare(`SELECT u.id, u.display_name AS name, COUNT(f.id) AS count FROM users u JOIN files f ON f.created_by = u.id
        WHERE f.deleted_at IS NULL AND ${vis.sql} GROUP BY u.id ORDER BY u.display_name`)
      .all(...vis.params);
    res.json({ uploaders: rows });
  });

  api.get('/expiring', (req, res) => {
    const vis = access.fileVisibility(req.user);
    const rows = d
      .prepare(`${FILE_SELECT} WHERE f.deleted_at IS NULL AND ${vis.sql} AND f.expires_on IS NOT NULL
        AND f.expires_on <= date('now', '+' || f.remind_days || ' days') ORDER BY f.expires_on`)
      .all(...vis.params);
    const folders = access.allFolders();
    res.json({ files: rows.map((r) => serializeFile(r, folders)) });
  });

  // ---------- الرفع ----------

  // فحص سريع قبل الرفع: ملفات بنفس الاسم والحجم موجودة مسبقاً (البصمة الدقيقة تُفحص أثناء الرفع)
  api.post('/files/check', (req, res) => {
    const list = Array.isArray(req.body?.files) ? req.body.files.slice(0, 200) : [];
    const vis = access.fileVisibility(req.user);
    const find = d.prepare(`SELECT f.* FROM files f WHERE f.deleted_at IS NULL AND ${vis.sql} AND f.size = ? AND f.name = ? LIMIT 1`);
    const matches = [];
    for (const item of list) {
      const f = find.get(...vis.params, Number(item.size), String(item.name || ''));
      if (f) matches.push({ name: item.name, existing: { id: f.id, name: f.name, archiveNo: f.archive_no, folderPath: access.folderPath(f.folder_id).map((p) => p.name) } });
    }
    res.json({ matches });
  });

  api.post(
    '/files',
    cleanupUploads,
    upload.array('files', 100),
    async (req, res) => {
      if (!req.files?.length) throw httpError(400, 'لم يتم اختيار أي ملف');
      const folderId = targetFolder(req, req.body.folderId);
      const keepDuplicates = req.body.duplicates === 'keep';
      const created = [];
      const skipped = [];
      for (const up of req.files) {
        const name = fixName(up.originalname).slice(0, 200);
        const source = { path: up.path };
        const prepared = await prepare(source, name, up.size);
        const duplicate = findDuplicate(req, prepared.hash);
        if (duplicate && !keepDuplicates) {
          skipped.push({ name, existing: duplicate });
          continue;
        }
        created.push(await createFile({
          name,
          source,
          size: up.size,
          mime: up.mimetype || 'application/octet-stream',
          body: req.body,
          user: req.user,
          action: 'upload',
          folderId,
          prepared,
        }));
      }
      res.status(created.length ? 201 : 200).json({ files: created, skipped });
    },
  );

  // ملاحظة مكتوبة داخل التطبيق، تُحفظ كملف نصي يمكن تعديله والبحث في محتواه
  api.post('/notes', async (req, res) => {
    const b = req.body || {};
    const content = Buffer.from(String(b.content ?? ''), 'utf8');
    const file = await createFile({
      name: safeName(b.title, 'ملاحظة') + '.txt',
      source: content,
      size: content.length,
      mime: 'text/plain',
      body: b,
      user: req.user,
      action: 'note',
      folderId: targetFolder(req, b.folderId),
    });
    res.status(201).json({ file });
  });

  // رابط موقع: يُحفظ كملف اختصار .url يفتح الموقع عند تنزيله على ويندوز
  api.post('/links', async (req, res) => {
    const b = req.body || {};
    const url = parseUrl(b.url).href;
    const content = urlFile(url);
    const file = await createFile({
      name: safeName(b.title, new URL(url).hostname) + '.url',
      source: content,
      size: content.length,
      mime: URL_MIME,
      url,
      body: b,
      user: req.user,
      action: 'link',
      folderId: targetFolder(req, b.folderId),
    });
    res.status(201).json({ file });
  });

  // ---------- ملف واحد ----------

  api.get('/files/:id', (req, res) => {
    const f = fileRow(req, req.params.id);
    const pending = d.prepare("SELECT kind FROM jobs WHERE file_id = ? AND status IN ('pending', 'running')").all(f.id).map((j) => j.kind);
    const transcript = d.prepare('SELECT 1 FROM transcripts WHERE file_id = ? AND version_no = ?').get(f.id, f.current_version);
    res.json({ file: { ...loadFile(f.id), pendingJobs: pending, hasTranscript: !!transcript } });
  });

  api.patch('/files/:id', async (req, res) => {
    const f = fileRow(req, req.params.id);
    const b = req.body || {};
    const next = {
      ...f,
      name: b.name != null ? String(b.name).trim().slice(0, 200) || f.name : f.name,
      category: b.category != null ? String(b.category).trim() : f.category,
      tags: b.tags != null ? cleanTags(b.tags) : f.tags,
      description: b.description != null ? String(b.description).trim() : f.description,
      url: f.url && b.url != null ? parseUrl(b.url).href : f.url,
      folder_id: b.folderId !== undefined ? targetFolder(req, b.folderId) : f.folder_id,
      expires_on: b.expiresOn !== undefined ? parseDate(b.expiresOn) : f.expires_on,
      remind_days: b.remindDays != null ? Math.max(1, Math.min(365, Number(b.remindDays) || 30)) : f.remind_days,
    };
    if (path.extname(next.name).toLowerCase() !== path.extname(f.name).toLowerCase()) {
      next.name += path.extname(f.name);
    }
    db.transaction(() => {
      d.prepare(`UPDATE files SET name = ?, category = ?, tags = ?, description = ?, folder_id = ?, expires_on = ?, remind_days = ?,
        updated_by = ?, updated_at = datetime('now') WHERE id = ?`).run(
        next.name, next.category, next.tags, next.description, next.folder_id, next.expires_on, next.remind_days, req.user.id, f.id,
      );
      index.rebuild(f.id);
      log(req.user.id, f.id, next.folder_id !== f.folder_id ? 'move' : 'rename', next.name);
    });
    if (next.url !== f.url) {
      const content = urlFile(next.url);
      await addVersion(next, content, content.length, URL_MIME, 'تغيير الرابط', req.user);
    }
    res.json({ file: loadFile(f.id) });
  });

  // نقل عدة ملفات إلى مجلد
  api.post('/files/move', (req, res) => {
    const ids = (req.body?.ids || []).map(Number).filter(Boolean);
    const folderId = targetFolder(req, req.body?.folderId);
    db.transaction(() => {
      for (const id of ids) {
        const f = fileRow(req, id);
        d.prepare("UPDATE files SET folder_id = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(folderId, req.user.id, f.id);
        index.rebuild(f.id);
        log(req.user.id, f.id, 'move', f.name);
      }
    });
    res.json({ moved: ids.length });
  });

  api.delete('/files/:id', (req, res) => {
    const f = fileRow(req, req.params.id);
    d.prepare("UPDATE files SET deleted_at = datetime('now') WHERE id = ?").run(f.id);
    log(req.user.id, f.id, 'delete', f.name);
    res.json({ ok: true });
  });

  api.get('/files/:id/download', async (req, res) => {
    const f = fileRow(req, req.params.id);
    const no = Number(req.query.v) || f.current_version;
    const v = versionRow(f.id, no);
    const ext = path.extname(f.name);
    const name = no === f.current_version ? f.name : `${path.basename(f.name, ext)} (نسخة ${no})${ext}`;
    const inline = req.query.inline === '1' && INLINE_MIME.test(v.mime);
    if (isNewDownload(req, inline)) log(req.user.id, f.id, 'download', `نسخة ${no}`);
    await sendStored(req, res, v, name, inline);
  });

  api.get('/files/:id/thumb', (req, res) => {
    const f = fileRow(req, req.params.id);
    if (!f.thumb_version) throw httpError(404, 'لا توجد صورة مصغرة');
    res.set('Cache-Control', 'private, max-age=604800, immutable');
    res.type('image/webp').sendFile(media.thumbPath(f.id, f.thumb_version));
  });

  api.get('/files/:id/transcript', (req, res) => {
    const f = fileRow(req, req.params.id);
    const row = d.prepare('SELECT segments FROM transcripts WHERE file_id = ? AND version_no = ?').get(f.id, f.current_version);
    res.json({ segments: row ? JSON.parse(row.segments) : [] });
  });

  // اقتراحات الذكاء الاصطناعي للتصنيف والوسوم والوصف (لا تُحفظ إلا إذا اعتمدها الموظف)
  api.post('/files/:id/suggest', async (req, res) => {
    const f = fileRow(req, req.params.id);
    if (!require('./ai').enabled()) throw httpError(400, 'خدمة الذكاء الاصطناعي غير مفعّلة على الخادم');
    try {
      res.json({ suggestion: await jobs.suggestFor(f) });
    } catch (err) {
      console.warn('AI suggestion failed:', err.message);
      throw httpError(502, 'تعذر الحصول على اقتراحات الآن، حاول لاحقاً');
    }
  });

  api.get('/files/:id/versions', (req, res) => {
    const f = fileRow(req, req.params.id);
    const rows = d
      .prepare('SELECT v.version_no, v.size, v.note, v.created_at, u.display_name AS by FROM versions v LEFT JOIN users u ON u.id = v.created_by WHERE v.file_id = ? ORDER BY v.version_no DESC')
      .all(f.id);
    res.json({
      current: f.current_version,
      versions: rows.map((r) => ({ version: r.version_no, size: r.size, note: r.note, createdAt: r.created_at, by: r.by })),
    });
  });

  api.post('/files/:id/versions', cleanupUploads, upload.single('file'), async (req, res) => {
    const f = fileRow(req, req.params.id);
    if (!req.file) throw httpError(400, 'لم يتم اختيار ملف');
    const up = req.file;
    const no = await addVersion(f, { path: up.path }, up.size, up.mimetype || f.mime, String(req.body.note || 'رفع نسخة جديدة'), req.user);
    log(req.user.id, f.id, 'new_version', `نسخة ${no}`);
    res.status(201).json({ version: no });
  });

  api.post('/files/:id/restore', async (req, res) => {
    const f = fileRow(req, req.params.id);
    const from = versionRow(f.id, Number(req.body?.version));
    // نسخ داخل التخزين نفسه، فلا يمر الملف الكبير عبر الخادم
    const key = await storage.copy(from.storage_key, `${f.id}-v${f.current_version + 1}-${f.name}`);
    const small = from.size <= MAX_INDEX_BYTES && (docs.canExtract(f.name) || f.url);
    const content = small ? await storage.get(from.storage_key) : null;
    const text = content && docs.canExtract(f.name) ? await docs.extractText(content, f.name) : '';
    if (f.url) f.url = parseUrlFile(content) || f.url;
    const no = recordVersion(f, { key, size: from.size, mime: from.mime, note: `استرجاع النسخة ${from.version_no}`, user: req.user, hash: from.hash, text });
    await afterVersion(f.id, no, null);
    log(req.user.id, f.id, 'restore', `من نسخة ${from.version_no} إلى ${no}`);
    res.json({ version: no });
  });

  api.get('/files/:id/edit', async (req, res) => {
    const f = fileRow(req, req.params.id);
    if (!docs.editKind(f.name)) throw httpError(400, 'هذا النوع من الملفات لا يمكن تعديله داخل التطبيق');
    const v = versionRow(f.id, f.current_version);
    res.json({ version: f.current_version, ...(await docs.toEditable(await storage.get(v.storage_key), f.name)) });
  });

  api.post('/files/:id/edit', async (req, res) => {
    const f = fileRow(req, req.params.id);
    const kind = docs.editKind(f.name);
    if (!kind) throw httpError(400, 'هذا النوع من الملفات لا يمكن تعديله داخل التطبيق');
    if (Number(req.body?.baseVersion) !== f.current_version) {
      throw httpError(409, 'قام شخص آخر بتعديل الملف أثناء عملك. افتح الملف من جديد لترى آخر نسخة.');
    }
    const current = await storage.get(versionRow(f.id, f.current_version).storage_key);
    const buffer = await docs.fromEditable(kind, current, req.body);
    const mime = kind === 'docx' ? docs.DOCX_MIME : kind === 'sheet' ? docs.XLSX_MIME : f.mime;
    const no = await addVersion(f, buffer, buffer.length, mime, String(req.body.note || 'تعديل داخل التطبيق').slice(0, 300), req.user);
    log(req.user.id, f.id, 'edit', `نسخة ${no}`);
    res.json({ version: no });
  });

  api.get('/files/:id/activity', (req, res) => {
    const f = fileRow(req, req.params.id);
    const rows = d
      .prepare('SELECT a.action, a.detail, a.created_at, u.display_name AS by FROM activity a LEFT JOIN users u ON u.id = a.user_id WHERE a.file_id = ? ORDER BY a.id DESC LIMIT 100')
      .all(f.id);
    res.json({ activity: rows });
  });

  // رمز QR يفتح الملف في التطبيق، لطباعته على الملف الورقي
  api.get('/files/:id/qr.svg', async (req, res) => {
    const f = fileRow(req, req.params.id);
    const svg = await require('qrcode').toString(`${publicBase(req)}/f/${f.id}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
    res.type('image/svg+xml').set('Cache-Control', 'private, max-age=86400').send(svg);
  });

  require('./routes/zip')(api, ctx);
  require('./routes/shares')(api, app, ctx);
  require('./routes/folders')(api, ctx);
  require('./routes/admin')(api, ctx);

  api.use((req, res) => res.status(404).json({ error: 'غير موجود' }));
  app.use('/api', api);

  // صفحة ملصق للطباعة: رمز QR مع الرقم الأرشيفي واسم الملف
  app.get('/label/:id', auth.requireUser, async (req, res) => {
    const f = fileRow(req, req.params.id);
    const svg = await require('qrcode').toString(`${publicBase(req)}/f/${f.id}`, { type: 'svg', margin: 0 });
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'");
    res.type('html').send(require('./label-page')({ file: f, svg, path: access.folderPath(f.folder_id).map((p) => p.name) }));
  });

  const pub = path.join(__dirname, '..', 'public');
  app.get('/vendor/purify.min.js', (req, res) => res.sendFile(require.resolve('dompurify/dist/purify.min.js')));
  app.use(express.static(pub, { index: 'index.html', setHeaders: (res, p) => p.endsWith('sw.js') && res.set('Cache-Control', 'no-cache') }));
  app.get(/^\/(?!api\/|s\/).*/, (req, res) => res.sendFile(path.join(pub, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `حجم الملف أكبر من ${config.maxUploadMb} ميغابايت` : `خطأ في رفع الملف (${err.code})`;
      return res.status(400).json({ error: msg });
    }
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    if (res.headersSent) return res.destroy();
    res.status(status).json({ error: status >= 500 ? 'حدث خطأ في الخادم' : err.message });
  });

  return app;
}

module.exports = { createApp };
