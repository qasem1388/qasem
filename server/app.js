const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { create: contentDisposition } = require('content-disposition');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');
const docs = require('./documents');
const { indexText, ftsQuery } = require('./arabic');

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

// لا نقرأ محتوى الملفات الضخمة للبحث، فتُبحث بالاسم والوسوم فقط
const MAX_INDEX_BYTES = 50 * 1024 * 1024;

function cleanTags(tags) {
  return String(tags || '')
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join('، ');
}

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

  const fileRow = (id) => {
    const f = d.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL').get(Number(id));
    if (!f) throw httpError(404, 'الملف غير موجود');
    return f;
  };

  const versionRow = (fileId, no) => {
    const v = d.prepare('SELECT * FROM versions WHERE file_id = ? AND version_no = ?').get(fileId, no);
    if (!v) throw httpError(404, 'النسخة غير موجودة');
    return v;
  };

  const metaText = (file) => indexText([file.name, file.category, file.tags, file.description, file.url].join(' '));

  const reindex = (file, text) => {
    d.prepare('DELETE FROM files_fts WHERE rowid = ?').run(file.id);
    d.prepare('INSERT INTO files_fts (rowid, meta, content) VALUES (?, ?, ?)').run(file.id, metaText(file), indexText(text));
  };

  const reindexMeta = (file) => {
    const row = d.prepare('SELECT content FROM files_fts WHERE rowid = ?').get(file.id);
    d.prepare('DELETE FROM files_fts WHERE rowid = ?').run(file.id);
    d.prepare('INSERT INTO files_fts (rowid, meta, content) VALUES (?, ?, ?)').run(file.id, metaText(file), row?.content || '');
  };

  // source: Buffer أو { path } لملف مرفوع على القرص
  async function indexableText(source, name, size) {
    if (!docs.canExtract(name) || size > MAX_INDEX_BYTES) return '';
    return docs.extractText(Buffer.isBuffer(source) ? source : await fs.promises.readFile(source.path), name);
  }

  const serializeFile = (f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    tags: f.tags,
    description: f.description,
    url: f.url || null,
    mime: f.mime,
    size: f.size,
    version: f.current_version,
    editable: docs.editKind(f.name),
    createdAt: f.created_at,
    createdBy: f.created_by_name,
    updatedAt: f.updated_at,
    updatedBy: f.updated_by_name,
    deletedAt: f.deleted_at,
  });

  const FILE_SELECT = `SELECT f.*, cu.display_name AS created_by_name, uu.display_name AS updated_by_name
    FROM files f LEFT JOIN users cu ON cu.id = f.created_by LEFT JOIN users uu ON uu.id = f.updated_by`;

  // تسجيل نسخة جديدة دون المساس بالنسخ السابقة
  function recordVersion(file, key, size, mime, note, user, text) {
    return db.transaction(() => {
      const no = d.prepare('SELECT current_version FROM files WHERE id = ?').get(file.id).current_version + 1;
      d.prepare('INSERT INTO versions (file_id, version_no, storage_key, size, mime, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        file.id, no, key, size, mime, note, user.id,
      );
      d.prepare("UPDATE files SET current_version = ?, size = ?, mime = ?, url = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(
        no, size, mime, file.url ?? null, user.id, file.id,
      );
      reindex(file, text);
      return no;
    });
  }

  async function addVersion(file, source, size, mime, note, user) {
    const text = await indexableText(source, file.name, size);
    const key = await storage.put(source, `${file.id}-v${file.current_version + 1}-${file.name}`, mime);
    return recordVersion(file, key, size, mime, note, user, text);
  }

  async function createFile({ name, source, size, mime, url = null, body, user, action }) {
    const text = await indexableText(source, name, size);
    const key = await storage.put(source, `v1-${name}`, mime);
    const id = db.transaction(() => {
      const file = {
        name,
        url,
        category: String(body.category || '').trim(),
        tags: cleanTags(body.tags),
        description: String(body.description || '').trim(),
      };
      const r = d.prepare('INSERT INTO files (name, category, tags, description, url, mime, size, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        name, file.category, file.tags, file.description, url, mime, size, user.id, user.id,
      );
      file.id = Number(r.lastInsertRowid);
      d.prepare("INSERT INTO versions (file_id, version_no, storage_key, size, mime, note, created_by) VALUES (?, 1, ?, ?, ?, 'النسخة الأصلية', ?)").run(
        file.id, key, size, mime, user.id,
      );
      reindex(file, text);
      log(user.id, file.id, action, name);
      return file.id;
    });
    return serializeFile(d.prepare(`${FILE_SELECT} WHERE f.id = ?`).get(id));
  }

  const api = express.Router();
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

  // ---------- الملفات ----------

  api.get('/files', (req, res) => {
    const q = ftsQuery(req.query.q || '');
    const where = ['f.deleted_at IS NULL'];
    const params = [];
    if (q) {
      where.push('f.id IN (SELECT rowid FROM files_fts WHERE files_fts MATCH ?)');
      params.push(q);
    }
    if (req.query.category) {
      where.push('f.category = ?');
      params.push(String(req.query.category));
    }
    const order = { name: 'f.name COLLATE NOCASE', oldest: 'f.updated_at ASC' }[req.query.sort] || 'f.updated_at DESC';
    const rows = d.prepare(`${FILE_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 500`).all(...params);
    res.json({ files: rows.map(serializeFile) });
  });

  api.get('/categories', (req, res) => {
    const rows = d.prepare("SELECT category, COUNT(*) AS count FROM files WHERE deleted_at IS NULL AND category != '' GROUP BY category ORDER BY category").all();
    res.json({ categories: rows });
  });

  api.post(
    '/files',
    cleanupUploads,
    upload.array('files', 100),
    wrap(async (req, res) => {
      if (!req.files?.length) throw httpError(400, 'لم يتم اختيار أي ملف');
      const created = [];
      for (const up of req.files) {
        created.push(await createFile({
          name: fixName(up.originalname).slice(0, 200),
          source: { path: up.path },
          size: up.size,
          mime: up.mimetype || 'application/octet-stream',
          body: req.body,
          user: req.user,
          action: 'upload',
        }));
      }
      res.status(201).json({ files: created });
    }),
  );

  // ملاحظة مكتوبة داخل التطبيق، تُحفظ كملف نصي يمكن تعديله والبحث في محتواه
  api.post(
    '/notes',
    wrap(async (req, res) => {
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
      });
      res.status(201).json({ file });
    }),
  );

  // رابط موقع: يُحفظ كملف اختصار .url يفتح الموقع عند تنزيله على ويندوز
  api.post(
    '/links',
    wrap(async (req, res) => {
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
      });
      res.status(201).json({ file });
    }),
  );

  api.get('/files/:id', (req, res) => {
    fileRow(req.params.id);
    res.json({ file: serializeFile(d.prepare(`${FILE_SELECT} WHERE f.id = ?`).get(Number(req.params.id))) });
  });

  api.patch('/files/:id', async (req, res) => {
    const f = fileRow(req.params.id);
    const b = req.body || {};
    const next = {
      ...f,
      name: b.name != null ? String(b.name).trim().slice(0, 200) || f.name : f.name,
      category: b.category != null ? String(b.category).trim() : f.category,
      tags: b.tags != null ? cleanTags(b.tags) : f.tags,
      description: b.description != null ? String(b.description).trim() : f.description,
      url: f.url && b.url != null ? parseUrl(b.url).href : f.url,
    };
    if (path.extname(next.name).toLowerCase() !== path.extname(f.name).toLowerCase()) {
      next.name += path.extname(f.name);
    }
    db.transaction(() => {
      d.prepare("UPDATE files SET name = ?, category = ?, tags = ?, description = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?").run(
        next.name, next.category, next.tags, next.description, req.user.id, f.id,
      );
      reindexMeta(next);
      log(req.user.id, f.id, 'rename', next.name);
    });
    if (next.url !== f.url) {
      const content = urlFile(next.url);
      await addVersion(next, content, content.length, URL_MIME, 'تغيير الرابط', req.user);
    }
    res.json({ file: serializeFile(d.prepare(`${FILE_SELECT} WHERE f.id = ?`).get(f.id)) });
  });

  api.delete('/files/:id', (req, res) => {
    const f = fileRow(req.params.id);
    d.prepare("UPDATE files SET deleted_at = datetime('now') WHERE id = ?").run(f.id);
    log(req.user.id, f.id, 'delete', f.name);
    res.json({ ok: true });
  });

  api.get(
    '/files/:id/download',
    wrap(async (req, res) => {
      const f = fileRow(req.params.id);
      const no = Number(req.query.v) || f.current_version;
      const v = versionRow(f.id, no);
      const ext = path.extname(f.name);
      const name = no === f.current_version ? f.name : `${path.basename(f.name, ext)} (نسخة ${no})${ext}`;
      const inline = req.query.inline === '1' && INLINE_MIME.test(v.mime);
      // طلبات Range تأتي من مشغّل الفيديو أو من استكمال تنزيل متوقف، فلا نسجلها كتنزيل جديد
      if (!inline && !req.get('range')) log(req.user.id, f.id, 'download', `نسخة ${no}`);
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
    }),
  );

  api.get('/files/:id/versions', (req, res) => {
    const f = fileRow(req.params.id);
    const rows = d
      .prepare('SELECT v.version_no, v.size, v.note, v.created_at, u.display_name AS by FROM versions v LEFT JOIN users u ON u.id = v.created_by WHERE v.file_id = ? ORDER BY v.version_no DESC')
      .all(f.id);
    res.json({
      current: f.current_version,
      versions: rows.map((r) => ({ version: r.version_no, size: r.size, note: r.note, createdAt: r.created_at, by: r.by })),
    });
  });

  api.post(
    '/files/:id/versions',
    cleanupUploads,
    upload.single('file'),
    wrap(async (req, res) => {
      const f = fileRow(req.params.id);
      if (!req.file) throw httpError(400, 'لم يتم اختيار ملف');
      const up = req.file;
      const no = await addVersion(f, { path: up.path }, up.size, up.mimetype || f.mime, String(req.body.note || 'رفع نسخة جديدة'), req.user);
      log(req.user.id, f.id, 'new_version', `نسخة ${no}`);
      res.status(201).json({ version: no });
    }),
  );

  api.post(
    '/files/:id/restore',
    wrap(async (req, res) => {
      const f = fileRow(req.params.id);
      const from = versionRow(f.id, Number(req.body?.version));
      // نسخ داخل التخزين نفسه، فلا يمر الملف الكبير عبر الخادم
      const key = await storage.copy(from.storage_key, `${f.id}-v${f.current_version + 1}-${f.name}`);
      const text = docs.canExtract(f.name) && from.size <= MAX_INDEX_BYTES ? await docs.extractText(await storage.get(from.storage_key), f.name) : '';
      if (f.url) f.url = parseUrlFile(await storage.get(from.storage_key)) || f.url;
      const no = recordVersion(f, key, from.size, from.mime, `استرجاع النسخة ${from.version_no}`, req.user, text);
      log(req.user.id, f.id, 'restore', `من نسخة ${from.version_no} إلى ${no}`);
      res.json({ version: no });
    }),
  );

  api.get(
    '/files/:id/edit',
    wrap(async (req, res) => {
      const f = fileRow(req.params.id);
      if (!docs.editKind(f.name)) throw httpError(400, 'هذا النوع من الملفات لا يمكن تعديله داخل التطبيق');
      const v = versionRow(f.id, f.current_version);
      res.json({ version: f.current_version, ...(await docs.toEditable(await storage.get(v.storage_key), f.name)) });
    }),
  );

  api.post(
    '/files/:id/edit',
    wrap(async (req, res) => {
      const f = fileRow(req.params.id);
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
    }),
  );

  api.get('/files/:id/activity', (req, res) => {
    const f = fileRow(req.params.id);
    const rows = d
      .prepare('SELECT a.action, a.detail, a.created_at, u.display_name AS by FROM activity a LEFT JOIN users u ON u.id = a.user_id WHERE a.file_id = ? ORDER BY a.id DESC LIMIT 100')
      .all(f.id);
    res.json({ activity: rows });
  });

  // ---------- المدير ----------

  api.get('/admin/activity', auth.requireAdmin, (req, res) => {
    const rows = d
      .prepare('SELECT a.action, a.detail, a.created_at, u.display_name AS by, f.name AS file FROM activity a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN files f ON f.id = a.file_id ORDER BY a.id DESC LIMIT 300')
      .all();
    res.json({ activity: rows });
  });

  api.get('/admin/trash', auth.requireAdmin, (req, res) => {
    const rows = d.prepare(`${FILE_SELECT} WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC`).all();
    res.json({ files: rows.map(serializeFile) });
  });

  api.post('/admin/trash/:id/restore', auth.requireAdmin, (req, res) => {
    const r = d.prepare('UPDATE files SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL').run(Number(req.params.id));
    if (!r.changes) throw httpError(404, 'الملف غير موجود في المحذوفات');
    log(req.user.id, Number(req.params.id), 'undelete');
    res.json({ ok: true });
  });

  api.get('/users', auth.requireAdmin, (req, res) => {
    res.json({ users: d.prepare('SELECT * FROM users ORDER BY id').all().map(auth.publicUser) });
  });

  api.post('/users', auth.requireAdmin, (req, res) => {
    const { username, displayName, password, role } = req.body || {};
    const name = String(username || '').trim();
    if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(name)) throw httpError(400, 'اسم المستخدم يجب أن يكون 3 إلى 32 حرفاً بدون مسافات');
    auth.validatePassword(password);
    if (d.prepare('SELECT 1 FROM users WHERE username = ?').get(name)) throw httpError(409, 'اسم المستخدم مستخدم مسبقاً');
    const r = d.prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)').run(
      name, String(displayName || name).trim(), auth.hashPassword(password), role === 'admin' ? 'admin' : 'employee',
    );
    res.status(201).json({ user: auth.publicUser(d.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid)) });
  });

  api.patch('/users/:id', auth.requireAdmin, (req, res) => {
    const u = d.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
    if (!u) throw httpError(404, 'المستخدم غير موجود');
    const b = req.body || {};
    if (u.id === req.user.id && (b.active === false || (b.role && b.role !== 'admin'))) {
      throw httpError(400, 'لا يمكنك إيقاف حسابك أو إزالة صلاحية المدير عن نفسك');
    }
    if (b.password) auth.validatePassword(b.password);
    d.prepare('UPDATE users SET display_name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?').run(
      b.displayName != null ? String(b.displayName).trim() || u.display_name : u.display_name,
      b.role === 'admin' || b.role === 'employee' ? b.role : u.role,
      b.active != null ? (b.active ? 1 : 0) : u.active,
      b.password ? auth.hashPassword(b.password) : u.password_hash,
      u.id,
    );
    res.json({ user: auth.publicUser(d.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) });
  });

  api.use((req, res) => res.status(404).json({ error: 'غير موجود' }));

  app.use('/api', api);

  const pub = path.join(__dirname, '..', 'public');
  app.get('/vendor/purify.min.js', (req, res) => res.sendFile(require.resolve('dompurify/dist/purify.min.js')));
  app.use(express.static(pub, { index: 'index.html', setHeaders: (res, p) => p.endsWith('sw.js') && res.set('Cache-Control', 'no-cache') }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(pub, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `حجم الملف أكبر من ${config.maxUploadMb} ميغابايت` : `خطأ في رفع الملف (${err.code})`;
      return res.status(400).json({ error: msg });
    }
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'حدث خطأ في الخادم' : err.message });
  });

  return app;
}

module.exports = { createApp };
