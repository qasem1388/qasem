'use strict';
/**
 * إنشاء مدير عام جديد أو إعادة تعيين كلمة مرور مدير موجود.
 * الاستخدام: ADMIN_EMAIL=x@y.com ADMIN_PASSWORD='...' npm run admin:create
 */
const knex = require('../src/db/knex');
const { hashPassword } = require('../src/core/passwords');
const { syncPermissions, ensureRoles } = require('../src/db/bootstrap');

(async () => {
  try {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || password.length < 8) throw new Error('حدد ADMIN_EMAIL و ADMIN_PASSWORD (8 أحرف على الأقل)');
    await knex.migrate.latest();
    await syncPermissions();
    await ensureRoles();
    const role = await knex('roles').where('name', 'super_admin').first();
    const hash = await hashPassword(password);
    const existing = await knex('users').where('email', email).first();
    if (existing) {
      await knex('users').where('id', existing.id).update({ password_hash: hash, role_id: role.id, is_active: true, failed_logins: 0, locked_until: null });
      console.log(`[admin] تم تحديث كلمة مرور ${email} ومنحه دور المدير العام`);
    } else {
      await knex('users').insert({ name: process.env.ADMIN_NAME || 'مدير النظام', email, password_hash: hash, role_id: role.id, is_active: true });
      console.log(`[admin] تم إنشاء المدير ${email}`);
    }
  } catch (e) {
    console.error('[admin] خطأ:', e.message);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
