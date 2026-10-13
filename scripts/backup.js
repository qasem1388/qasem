'use strict';
/**
 * نسخ احتياطي لقاعدة البيانات والملفات المرفوعة إلى مجلد backups/<التاريخ>.
 * - SQLite: نسخة متسقة عبر VACUUM INTO.
 * - PostgreSQL: تصدير JSON لجميع الجداول (ويُنصح باستخدام pg_dump في الإنتاج).
 */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const knex = require('../src/db/knex');

async function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  await fs.promises.cp(src, dest, { recursive: true });
  return 1;
}

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(config.root, process.env.BACKUP_DIR || 'backups', stamp);
  await fs.promises.mkdir(dir, { recursive: true });
  try {
    if (knex.isPg) {
      const tables = (await knex.raw("select tablename from pg_tables where schemaname = 'public'")).rows.map((r) => r.tablename);
      const dump = {};
      for (const t of tables) if (t !== 'sessions') dump[t] = await knex(t).select('*');
      await fs.promises.writeFile(path.join(dir, 'database.json'), JSON.stringify(dump));
    } else {
      const target = path.join(dir, 'database.sqlite').replace(/'/g, "''");
      await knex.raw(`VACUUM INTO '${target}'`);
    }
    await copyDir(config.uploads.publicDir, path.join(dir, 'uploads'));
    await copyDir(config.uploads.privateDir, path.join(dir, 'private'));
    console.log(`[backup] تم إنشاء النسخة الاحتياطية في: ${dir}`);
  } catch (e) {
    console.error('[backup] خطأ:', e.message);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
