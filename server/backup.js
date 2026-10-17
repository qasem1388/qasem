// نسخ احتياطي يومي تلقائي: نسخة مؤرخة من قاعدة البيانات، ونسخة من كل الملفات الجديدة إلى مجلد النسخ الاحتياطي.
// عند التخزين في Google Drive تكون الملفات هناك أصلاً، فتُرفع نسخة قاعدة البيانات المؤرخة إلى Drive أيضاً.

const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');

let storage = null;
let running = null;
let timer = null;

const today = () => new Date().toISOString().slice(0, 10);

function status() {
  return {
    lastAt: db.getSetting('backup_last_at'),
    lastOk: db.getSetting('backup_last_ok') === '1',
    lastMessage: db.getSetting('backup_last_message'),
    running: !!running,
    dir: config.backup.dir,
    hour: config.backup.hour,
  };
}

async function copyNewFiles(target) {
  if (!storage.localPath) return 0;
  await fs.promises.mkdir(target, { recursive: true });
  const existing = new Set(await fs.promises.readdir(target));
  let copied = 0;
  for (const { storage_key: key } of db.get().prepare('SELECT storage_key FROM versions').all()) {
    if (existing.has(key)) continue;
    try {
      await fs.promises.copyFile(storage.localPath(key), path.join(target, key));
      copied++;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return copied;
}

async function pruneOld(dir) {
  const files = (await fs.promises.readdir(dir)).filter((f) => /^archive-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - config.backup.keep))) {
    await fs.promises.rm(path.join(dir, f), { force: true });
  }
}

async function runBackup() {
  const dbDir = path.join(config.backup.dir, 'database');
  await fs.promises.mkdir(dbDir, { recursive: true });
  const snapshot = path.join(dbDir, `archive-${today()}.sqlite`);
  db.snapshot(snapshot);
  await pruneOld(dbDir);
  const copied = await copyNewFiles(path.join(config.backup.dir, 'files'));
  if (storage.put && !storage.localPath) {
    await storage.put(await fs.promises.readFile(snapshot), `backup-archive-${today()}.sqlite`, 'application/x-sqlite3');
  }
  return storage.localPath ? `تم نسخ قاعدة البيانات و${copied} ملف جديد` : 'تم نسخ قاعدة البيانات إلى القرص وإلى Google Drive';
}

function backupNow() {
  if (running) return running;
  running = runBackup()
    .then((message) => {
      db.setSetting('backup_last_ok', '1');
      db.setSetting('backup_last_message', message);
    })
    .catch((err) => {
      db.setSetting('backup_last_ok', '0');
      db.setSetting('backup_last_message', `فشل النسخ الاحتياطي: ${err.message}`);
      console.error('فشل النسخ الاحتياطي:', err);
    })
    .finally(() => {
      db.setSetting('backup_last_at', new Date().toISOString());
      running = null;
    });
  return running;
}

// يفحص كل ربع ساعة: إذا جاءت ساعة النسخ ولم يُنسخ اليوم، يبدأ النسخ
function check() {
  if (config.backup.hour < 0) return;
  const last = db.getSetting('backup_last_at');
  const now = new Date();
  if (now.getHours() >= config.backup.hour && (!last || new Date(last).toDateString() !== now.toDateString())) backupNow();
}

function start(store) {
  storage = store;
  timer = setInterval(check, 15 * 60_000);
  timer.unref();
  setTimeout(check, 60_000).unref();
}

function stop() {
  clearInterval(timer);
}

module.exports = { start, stop, backupNow, status };
