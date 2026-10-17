const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  url TEXT,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id),
  version_no INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (file_id, version_no)
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  file_id INTEGER REFERENCES files(id),
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- روابط مشاركة عامة: من يملك الرابط يستطيع تنزيل الملف دون حساب، حتى تاريخ الانتهاء أو الإيقاف
CREATE TABLE IF NOT EXISTS shares (
  id INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  file_id INTEGER NOT NULL REFERENCES files(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  revoked_at TEXT,
  downloads INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  meta, content, tokenize = 'unicode61'
);
`;

let db;

function open() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate();
  return db;
}

// تحديث قواعد البيانات المنشأة بإصدارات سابقة من التطبيق
function migrate() {
  const cols = db.prepare('PRAGMA table_info(files)').all().map((c) => c.name);
  if (!cols.includes('url')) db.exec('ALTER TABLE files ADD COLUMN url TEXT');
}

function get() {
  if (!db) throw new Error('database not opened');
  return db;
}

function close() {
  if (db) db.close();
  db = null;
}

function getSetting(key) {
  const row = get().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  get()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value);
}

function transaction(fn) {
  const d = get();
  d.exec('BEGIN');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (err) {
    d.exec('ROLLBACK');
    throw err;
  }
}

// نسخة متسقة من قاعدة البيانات لرفعها كنسخة احتياطية
function snapshot(targetPath) {
  fs.rmSync(targetPath, { force: true });
  get().prepare('VACUUM INTO ?').run(targetPath);
}

module.exports = { open, get, close, getSetting, setSetting, transaction, snapshot };
