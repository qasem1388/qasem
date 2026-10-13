'use strict';
/** تشغيل ترحيلات قاعدة البيانات. --reset يحذف جميع الجداول ويعيد إنشاءها (للتطوير فقط) */
const knex = require('../src/db/knex');

(async () => {
  try {
    if (process.argv.includes('--reset')) {
      if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
        throw new Error('إعادة التعيين ممنوعة في بيئة الإنتاج (استخدم --force إن كنت متأكدًا)');
      }
      await knex.migrate.rollback(undefined, true);
      console.log('[migrate] تم حذف الجداول');
    }
    const [batch, list] = await knex.migrate.latest();
    console.log(list.length ? `[migrate] الدفعة ${batch}: ${list.join(', ')}` : '[migrate] قاعدة البيانات محدثة');
  } catch (e) {
    console.error('[migrate] خطأ:', e.message);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
