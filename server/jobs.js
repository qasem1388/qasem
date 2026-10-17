// مهام تعمل في الخلفية واحدة تلو الأخرى، حتى لا يتأخر الرفع: صورة مصغرة، قراءة ضوئية، تفريغ صوتي، اقتراحات ذكية

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const config = require('./config');
const db = require('./db');
const index = require('./search-index');
const media = require('./media');
const ocr = require('./ocr');
const transcriber = require('./transcribe');
const ai = require('./ai');
const { typeOf } = require('./filetypes');
const { folderPath } = require('./access');

const OCR_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff']);
const MAX_ATTEMPTS = 3;

let storage = null;
let busy = false;
let timer = null;

const currentVersion = (fileId) =>
  db.get().prepare('SELECT v.* FROM versions v JOIN files f ON f.id = v.file_id AND v.version_no = f.current_version WHERE f.id = ?').get(fileId);

// يعطي مساراً محلياً لمحتوى النسخة: مباشرة من القرص، أو بتنزيلها مؤقتاً من Drive
async function withLocalCopy(version, fn) {
  if (storage.localPath) return fn(storage.localPath(version.storage_key));
  const tmp = path.join(config.uploadTmpDir, `${crypto.randomUUID()}.job`);
  try {
    const { stream } = await storage.openStream(version.storage_key);
    await pipeline(stream, fs.createWriteStream(tmp));
    return await fn(tmp);
  } finally {
    fs.rm(tmp, { force: true }, () => {});
  }
}

async function hashFile(filePath) {
  const h = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(filePath), h);
  return h.digest('hex');
}

function wanted(kind, file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const t = typeOf(file.name).key;
  if (kind === 'thumb') return t === 'image' ? media.capabilities.thumbnails : t === 'video' && media.capabilities.video;
  if (kind === 'ocr') return config.ocr && OCR_EXT.has(ext);
  if (kind === 'transcribe') return (t === 'video' || t === 'audio') && transcriber.enabled() && media.capabilities.audio;
  if (kind === 'ai_tags') return ai.enabled() && config.ai.autoTag && !file.url;
  return kind === 'hash';
}

const HANDLERS = {
  async hash(file) {
    for (const v of db.get().prepare('SELECT * FROM versions WHERE file_id = ? AND hash IS NULL').all(file.id)) {
      const hash = await withLocalCopy(v, hashFile);
      db.get().prepare('UPDATE versions SET hash = ? WHERE id = ?').run(hash, v.id);
    }
  },

  async thumb(file) {
    const v = currentVersion(file.id);
    const buf = await withLocalCopy(v, (p) => media.makeThumb(p, file.name));
    if (!buf) return;
    await media.saveThumb(file.id, v.version_no, buf);
    db.get().prepare('UPDATE files SET thumb_version = ? WHERE id = ?').run(v.version_no, file.id);
  },

  async ocr(file) {
    const v = currentVersion(file.id);
    const text = await withLocalCopy(v, (p) => ocr.recognize(p));
    index.setText(file.id, 'ocr', text);
    index.rebuild(file.id);
  },

  async transcribe(file) {
    const v = currentVersion(file.id);
    const segments = await withLocalCopy(v, (p) => transcriber.transcribe(p));
    db.get()
      .prepare('INSERT INTO transcripts (file_id, version_no, segments) VALUES (?, ?, ?) ON CONFLICT(file_id, version_no) DO UPDATE SET segments = excluded.segments')
      .run(file.id, v.version_no, JSON.stringify(segments));
    index.setText(file.id, 'transcript', segments.map((s) => s.text).join('\n'));
    index.rebuild(file.id);
  },

  // يملأ الحقول الفارغة فقط، ولا يغيّر ما كتبه الموظف بنفسه
  async ai_tags(file) {
    const s = await suggestFor(file);
    const fresh = db.get().prepare('SELECT * FROM files WHERE id = ?').get(file.id);
    db.get().prepare('UPDATE files SET category = ?, tags = ?, description = ? WHERE id = ?').run(
      fresh.category || s.category,
      fresh.tags || s.tags.join('، '),
      fresh.description || s.description,
      file.id,
    );
    index.rebuild(file.id);
  },
};

async function suggestFor(file) {
  const d = db.get();
  const categories = d.prepare("SELECT DISTINCT category FROM files WHERE category != '' AND deleted_at IS NULL ORDER BY category").all().map((r) => r.category);
  const text = d.prepare('SELECT text FROM file_text WHERE file_id = ?').all(file.id).map((r) => r.text).join('\n');
  return ai.suggest({
    name: file.name,
    typeLabel: typeOf(file.name).label,
    folderPath: folderPath(file.folder_id).map((p) => p.name),
    categories,
    text,
    thumbPath: file.thumb_version ? media.thumbPath(file.id, file.thumb_version) : null,
  });
}

// يضيف المهام المناسبة لنوع الملف. الصورة المصغرة تُنشأ أولاً لأن الاقتراحات الذكية تستفيد منها
function enqueueFor(file, kinds = ['thumb', 'ocr', 'transcribe', 'ai_tags']) {
  const insert = db.get().prepare('INSERT INTO jobs (file_id, kind) VALUES (?, ?)');
  for (const kind of kinds) if (wanted(kind, file)) insert.run(file.id, kind);
  kick();
}

function enqueue(fileId, kind) {
  db.get().prepare('INSERT INTO jobs (file_id, kind) VALUES (?, ?)').run(fileId, kind);
  kick();
}

async function tick() {
  if (busy || !storage) return;
  busy = true;
  try {
    const d = db.get();
    for (;;) {
      const job = d.prepare(`SELECT * FROM jobs WHERE status = 'pending' AND attempts < ? ORDER BY CASE kind WHEN 'thumb' THEN 0 WHEN 'hash' THEN 1 ELSE 2 END, id LIMIT 1`).get(MAX_ATTEMPTS);
      if (!job) break;
      const file = d.prepare('SELECT * FROM files WHERE id = ?').get(job.file_id);
      d.prepare("UPDATE jobs SET status = 'running', attempts = attempts + 1 WHERE id = ?").run(job.id);
      try {
        if (file && !file.deleted_at) await HANDLERS[job.kind](file);
        d.prepare("UPDATE jobs SET status = 'done', error = NULL, finished_at = datetime('now') WHERE id = ?").run(job.id);
      } catch (err) {
        const final = job.attempts + 1 >= MAX_ATTEMPTS;
        d.prepare(`UPDATE jobs SET status = ?, error = ?, finished_at = datetime('now') WHERE id = ?`).run(final ? 'failed' : 'pending', String(err.message).slice(0, 500), job.id);
        console.warn(`مهمة ${job.kind} للملف ${job.file_id} فشلت: ${err.message}`);
      }
    }
  } finally {
    busy = false;
  }
}

function kick() {
  setImmediate(() => tick().catch((err) => console.error(err)));
}

// إكمال ما ينقص الملفات المرفوعة قبل هذا الإصدار: البصمة والصور المصغرة والقراءة الضوئية
function backfill() {
  const d = db.get();
  const hasJob = d.prepare('SELECT 1 FROM jobs WHERE file_id = ? AND kind = ?');
  const insert = d.prepare('INSERT INTO jobs (file_id, kind) VALUES (?, ?)');
  for (const f of d.prepare('SELECT * FROM files WHERE deleted_at IS NULL').all()) {
    const missingHash = d.prepare('SELECT 1 FROM versions WHERE file_id = ? AND hash IS NULL').get(f.id);
    if (missingHash && !hasJob.get(f.id, 'hash')) insert.run(f.id, 'hash');
    for (const kind of ['thumb', 'ocr']) {
      if (kind === 'thumb' && f.thumb_version) continue;
      if (wanted(kind, f) && !hasJob.get(f.id, kind)) insert.run(f.id, kind);
    }
  }
}

function start(store) {
  storage = store;
  db.get().prepare("UPDATE jobs SET status = 'pending' WHERE status = 'running'").run();
  backfill();
  kick();
  timer = setInterval(kick, 30_000);
  timer.unref();
}

async function stop() {
  clearInterval(timer);
  storage = null;
  await ocr.shutdown();
}

// للاختبارات: ينتظر حتى تنتهي كل المهام
async function drain() {
  for (let i = 0; i < 600; i++) {
    await tick();
    if (!db.get().prepare("SELECT 1 FROM jobs WHERE status IN ('pending', 'running') AND attempts < ?").get(MAX_ATTEMPTS)) return;
    await new Promise((r) => setTimeout(r, 50));
  }
}

module.exports = { start, stop, enqueue, enqueueFor, drain, suggestFor, hashFile, withLocalCopy };
