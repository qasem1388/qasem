const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');
const storageLib = require('./storage');
const { createApp } = require('./app');

async function main() {
  const storage = storageLib.create();
  await storage.init();

  // على الاستضافات السحابية قد يُمسح القرص عند إعادة التشغيل، فنسترجع قاعدة البيانات من Drive
  if (storage.downloadBackup && !fs.existsSync(config.dbPath)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
    if (await storage.downloadBackup(config.dbPath)) console.log('تم استرجاع قاعدة البيانات من Google Drive');
  }

  db.open();
  auth.ensureAdmin();

  let onChange = () => {};
  if (storage.uploadBackup) {
    let timer = null;
    const backup = async () => {
      timer = null;
      const tmp = path.join(config.dataDir, 'backup.tmp.sqlite');
      try {
        db.snapshot(tmp);
        await storage.uploadBackup(tmp);
      } catch (err) {
        console.error('فشل حفظ النسخة الاحتياطية في Drive:', err.message);
      }
    };
    onChange = () => {
      if (!timer) timer = setTimeout(backup, 5000);
    };
    // الاستضافات السحابية توقف الخادم بإشارة SIGTERM، فنحفظ آخر التغييرات قبل الخروج
    process.once('SIGTERM', async () => {
      if (timer) {
        clearTimeout(timer);
        await backup();
      }
      process.exit(0);
    });
  }

  const app = createApp({ storage, onChange });
  const server = app.listen(config.port, () => {
    console.log(`أرشيف الموظفين يعمل على http://localhost:${config.port} (التخزين: ${config.storage})`);
  });
  // رفع فيديو كبير على اتصال بطيء قد يستغرق ساعات، فنلغي مهلة الطلب الافتراضية (5 دقائق)
  server.requestTimeout = 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
