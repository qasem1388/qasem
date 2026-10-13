'use strict';
/**
 * تهيئة البيانات الأساسية عند كل تشغيل:
 *  - مزامنة قائمة الصلاحيات.
 *  - إنشاء الأدوار الأساسية.
 *  - إنشاء أول مدير (من متغيرات البيئة) وتعبئة بيانات تجريبية عند أول تشغيل.
 */
const crypto = require('crypto');
const knex = require('./knex');
const { allPermissions } = require('../core/permissions');
const { hashPassword } = require('../core/passwords');

const BASE_ROLES = [
  { name: 'super_admin', label: 'مدير عام', description: 'جميع الصلاحيات', is_system: true, perms: '*' },
  {
    name: 'editor', label: 'محرر محتوى', description: 'إدارة المحتوى والأخبار والصفحات', is_system: true,
    perms: ['homepage', 'about', 'projects', 'governance', 'members', 'media', 'beneficiaries', 'pages', 'menu', 'files'].flatMap((m) => [`${m}.view`, `${m}.manage`]),
  },
  {
    name: 'hr', label: 'الموارد البشرية والتطوع', description: 'إدارة المتطوعين والوظائف والطلبات', is_system: true,
    perms: ['volunteers.view', 'volunteers.manage', 'jobs.view', 'jobs.manage', 'messages.view', 'messages.manage', 'files.view'],
  },
];

async function syncPermissions() {
  const list = allPermissions();
  const existing = new Set(await knex('permissions').pluck('key'));
  const missing = list.filter((p) => !existing.has(p.key));
  if (missing.length) await knex('permissions').insert(missing);
  for (const p of list) await knex('permissions').where('key', p.key).update({ label: p.label, group_name: p.group_name });
}

async function ensureRoles() {
  for (const role of BASE_ROLES) {
    let row = await knex('roles').where('name', role.name).first();
    if (row) continue;
    const [ins] = await knex('roles').insert({ name: role.name, label: role.label, description: role.description, is_system: role.is_system }).returning('id');
    const id = typeof ins === 'object' ? ins.id : ins;
    if (role.perms !== '*') {
      const ids = await knex('permissions').whereIn('key', role.perms).pluck('id');
      if (ids.length) await knex('role_permissions').insert(ids.map((pid) => ({ role_id: id, permission_id: pid })));
    }
  }
}

async function createFirstAdmin() {
  const [{ c }] = await knex('users').count({ c: '*' });
  if (Number(c) > 0) return false;
  const role = await knex('roles').where('name', 'super_admin').first();
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }
  await knex('users').insert({ name: process.env.ADMIN_NAME || 'مدير النظام', email, password_hash: await hashPassword(password), role_id: role.id, is_active: true });
  console.log('\n================ حساب المدير الأول ================');
  console.log(`  البريد: ${email}`);
  console.log(generated ? `  كلمة المرور (مولدة تلقائيًا، احفظها الآن): ${password}` : '  كلمة المرور: القيمة المحددة في ADMIN_PASSWORD');
  console.log('  غيّر كلمة المرور من "الملف الشخصي" بعد أول دخول.');
  console.log('===================================================\n');
  return true;
}

async function ensureBaseData() {
  await syncPermissions();
  await ensureRoles();
  await createFirstAdmin();
  if (process.env.SEED_DEMO !== 'false') await seedOnce();
}

/** تعبئة البيانات التجريبية مرة واحدة فقط عند أول تشغيل (يُحفظ مؤشر في الإعدادات) */
async function seedOnce() {
  if (await knex('site_settings').where('key', '_demo_seeded').first()) return;
  const [{ c }] = await knex('homepage_slides').count({ c: '*' });
  if (Number(c) === 0) {
    const { seedDemo } = require('./seeds/demo');
    await knex.transaction((trx) => seedDemo(trx));
    console.log('[seed] تمت تعبئة بيانات تجريبية. يمكنك تعطيل ذلك بـ SEED_DEMO=false');
  }
  await knex('site_settings').insert({ key: '_demo_seeded', value: 'true', group_name: 'system' });
}

module.exports = { ensureBaseData, syncPermissions, ensureRoles, createFirstAdmin, seedOnce };
