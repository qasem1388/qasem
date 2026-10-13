'use strict';
/** إنشاء الصلاحيات والأدوار وأول مدير، ثم تعبئة البيانات التجريبية (إذا كانت قاعدة البيانات فارغة) */
const knex = require('../src/db/knex');
const { syncPermissions, ensureRoles, createFirstAdmin } = require('../src/db/bootstrap');
const { seedDemo } = require('../src/db/seeds/demo');

(async () => {
  try {
    await knex.migrate.latest();
    await syncPermissions();
    await ensureRoles();
    await createFirstAdmin();
    const [{ c }] = await knex('homepage_slides').count({ c: '*' });
    if (Number(c) > 0 && !process.argv.includes('--force')) {
      console.log('[seed] توجد بيانات مسبقًا — تم تخطي البيانات التجريبية (استخدم --force للإضافة)');
    } else {
      await knex.transaction((trx) => seedDemo(trx));
      await knex('site_settings').insert({ key: '_demo_seeded', value: 'true', group_name: 'system' }).onConflict('key').ignore();
      console.log('[seed] تمت تعبئة البيانات التجريبية');
    }
  } catch (e) {
    console.error('[seed] خطأ:', e);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
