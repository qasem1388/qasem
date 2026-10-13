'use strict';
/**
 * اختبارات تكامل للنظام كاملًا على قاعدة بيانات مؤقتة.
 * تشغيل: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ngo-cms-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  SQLITE_FILE: path.join(tmp, 'test.sqlite'),
  UPLOAD_DIR: path.join(tmp, 'uploads'),
  PRIVATE_STORAGE_DIR: path.join(tmp, 'private'),
  SESSION_SECRET: 'test-secret-test-secret-test-secret',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'Admin@12345',
  SEED_DEMO: 'false',
  // لاختبار PostgreSQL: TEST_DATABASE_URL=postgres://... npm test (يتم مسح قاعدة الاختبار بالكامل)
  DATABASE_URL: process.env.TEST_DATABASE_URL || '',
});

const knex = require('../src/db/knex');
const { createApp } = require('../src/app');
const { ensureBaseData } = require('../src/db/bootstrap');
const { encodePng, samplePdf } = require('../src/db/seeds/images');

let server;
let base;

/** عميل HTTP بسيط يحتفظ بالكوكيز */
function client() {
  const jar = new Map();
  let csrf = null;
  const req = async (url, opts = {}) => {
    const headers = { ...(opts.headers || {}) };
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (csrf && opts.method && opts.method !== 'GET') headers['x-csrf-token'] = csrf;
    let body = opts.body;
    if (opts.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(opts.json); }
    const res = await fetch(base + url, { method: opts.method || 'GET', headers, body, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* HTML */ }
    return { status: res.status, data, text, headers: res.headers };
  };
  return {
    req,
    async csrf() { csrf = (await req('/api/auth/csrf')).data.token; return csrf; },
    setCsrf(t) { csrf = t; },
    async login(email = 'admin@test.local', password = 'Admin@12345') {
      await this.csrf();
      const r = await req('/api/auth/login', { method: 'POST', json: { email, password } });
      if (r.data && r.data.csrf) csrf = r.data.csrf;
      return r;
    },
    formToken: async (pagePath) => {
      const r = await req(pagePath);
      return (r.text.match(/name="_csrf" value="([^"]+)"/) || [])[1];
    },
  };
}

before(async () => {
  if (knex.isPg) await knex.migrate.rollback(undefined, true);
  await knex.migrate.latest();
  await ensureBaseData();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await knex.destroy();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('لوحة التحكم محمية بدون تسجيل دخول', async () => {
  const c = client();
  const page = await c.req('/admin/dashboard');
  assert.equal(page.status, 302);
  assert.match(page.headers.get('location'), /^\/admin\/login/);
  const apiRes = await c.req('/api/admin/meta');
  assert.equal(apiRes.status, 401);
});

test('تسجيل الدخول: رفض كلمة مرور خاطئة وطلب بدون CSRF وقبول الصحيحة', async () => {
  const c = client();
  const noCsrf = await c.req('/api/auth/login', { method: 'POST', json: { email: 'admin@test.local', password: 'Admin@12345' } });
  assert.equal(noCsrf.status, 403);
  const bad = await c.login('admin@test.local', 'wrong-password');
  assert.equal(bad.status, 401);
  const ok = await c.login();
  assert.equal(ok.status, 200);
  const me = await c.req('/api/admin/me');
  assert.equal(me.data.email, 'admin@test.local');
  const user = await knex('users').where('email', 'admin@test.local').first();
  assert.ok(user.password_hash.startsWith('$2'), 'كلمة المرور مشفرة بـ bcrypt');
});

test('إنشاء صفحة ديناميكية: مسودة غير ظاهرة، معاينة للمدير، ثم نشر وظهور في sitemap', async () => {
  const c = client();
  await c.login();
  const created = await c.req('/api/admin/r/pages', {
    method: 'POST',
    json: { name: 'البرامج التعليمية', slug: 'التعليم', title: 'برامجنا التعليمية', content: '<h2>مرحبا</h2><script>alert(1)</script><p onclick="x()">نص</p>', status: 'draft', show_in_menu: true },
  });
  assert.equal(created.status, 201);
  assert.ok(!created.data.content.includes('<script'), 'إزالة السكربتات');
  assert.ok(!created.data.content.includes('onclick'), 'إزالة خصائص الأحداث');

  const url = '/page/' + encodeURIComponent('التعليم');
  const visitor = client();
  assert.equal((await visitor.req(url)).status, 404, 'المسودة لا تظهر للزوار');
  const preview = await c.req(url + '?preview=1');
  assert.equal(preview.status, 200);
  assert.match(preview.text, /وضع المعاينة/);

  const upd = await c.req(`/api/admin/r/pages/${created.data.id}`, { method: 'PATCH', json: { status: 'published' } });
  assert.equal(upd.status, 200);
  const pub = await visitor.req(url);
  assert.equal(pub.status, 200);
  assert.match(pub.text, /برامجنا التعليمية/);
  assert.match(pub.text, /rel="canonical"/);
  const home = await visitor.req('/');
  assert.match(home.text, /البرامج التعليمية/, 'الصفحة تظهر في القائمة');
  const sitemap = await visitor.req('/sitemap.xml');
  assert.ok(sitemap.text.includes(encodeURIComponent('التعليم')));
});

test('التحقق من المدخلات: Slug مكرر وحقول مطلوبة', async () => {
  const c = client();
  await c.login();
  const r = await c.req('/api/admin/r/pages', { method: 'POST', json: { name: '', slug: 'التعليم', title: 'x', status: 'nope' } });
  assert.equal(r.status, 422);
  assert.ok(r.data.errors.name);
  assert.ok(r.data.errors.slug);
  assert.ok(r.data.errors.status);
});

test('رفع الملفات: قبول صورة وPDF حقيقيين ورفض ملف مزيف', async () => {
  const c = client();
  await c.login();
  const fd = new FormData();
  fd.append('files', new Blob([encodePng(20, 20, () => [10, 20, 30])], { type: 'image/png' }), 'صورة.png');
  fd.append('files', new Blob([samplePdf('Test')], { type: 'application/pdf' }), 'doc.pdf');
  const ok = await c.req('/api/admin/media', { method: 'POST', body: fd });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.items.length, 2);
  assert.equal(ok.data.items[0].original_name, 'صورة.png');
  const file = await c.req(ok.data.items[0].url);
  assert.equal(file.status, 200);

  const bad = new FormData();
  bad.append('files', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.png');
  assert.equal((await c.req('/api/admin/media', { method: 'POST', body: bad })).status, 400);
  const svg = new FormData();
  svg.append('files', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg');
  assert.equal((await c.req('/api/admin/media', { method: 'POST', body: svg })).status, 400);
});

test('الإعدادات: تطبيق الألوان على الموقع ورفض القيم غير الصالحة', async () => {
  const c = client();
  await c.login();
  const bad = await c.req('/api/admin/settings/identity', { method: 'PUT', json: { color_primary: 'red;}body{display:none' } });
  assert.equal(bad.status, 422);
  const ok = await c.req('/api/admin/settings/identity', { method: 'PUT', json: { color_primary: '#336699', org_name: 'جمعية الاختبار' } });
  assert.equal(ok.status, 200);
  const home = await client().req('/');
  assert.match(home.text, /--primary:#336699/);
  assert.match(home.text, /جمعية الاختبار/);
});

test('بوابة التطوع: تسجيل متطوع، تحقق من الهوية، ثم تغيير الحالة من لوحة التحكم', async () => {
  const v = client();
  const token = await v.formToken('/volunteer');
  assert.ok(token);
  const form = (data) => new URLSearchParams({ _csrf: token, ...data }).toString();
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  const invalid = await v.req('/volunteer', { method: 'POST', headers, body: form({ full_name: 'أحمد', national_id: '123', mobile: '0500000000', email: 'a@b.co', city: 'الرياض' }) });
  assert.equal(invalid.status, 422);
  assert.match(invalid.text, /رقم الهوية/);
  const ok = await v.req('/volunteer', { method: 'POST', headers, body: form({ full_name: 'أحمد محمد', national_id: '١٠٢٣٤٥٦٧٨٩', mobile: '0551234567', email: 'Ahmed@Example.com', city: 'الرياض', skills: 'التصميم' }) });
  assert.equal(ok.status, 303);
  const row = await knex('volunteers').orderBy('id', 'desc').first();
  assert.equal(row.national_id, '1023456789', 'تحويل الأرقام العربية');
  assert.equal(row.status, 'new');

  const admin = client();
  await admin.login();
  const list = await admin.req('/api/admin/r/volunteers?q=' + encodeURIComponent('أحمد') + '&f_status=new');
  assert.equal(list.data.total, 1);
  const upd = await admin.req(`/api/admin/r/volunteers/${row.id}`, { method: 'PATCH', json: { status: 'accepted', full_name: 'تلاعب' } });
  assert.equal(upd.data.status, 'accepted');
  assert.equal(upd.data.full_name, 'أحمد محمد', 'بيانات المتطوع للقراءة فقط');
  const csv = await admin.req('/api/admin/r/volunteers/export.csv');
  assert.match(csv.text, /أحمد محمد/);
});

test('التقديم على وظيفة مع سيرة ذاتية PDF محفوظة بشكل خاص', async () => {
  const admin = client();
  await admin.login();
  const job = await admin.req('/api/admin/r/job_posts', { method: 'POST', json: { title: 'محاسب', slug: 'accountant', status: 'published', description: '<p>وصف</p>' } });
  assert.equal(job.status, 201);

  const v = client();
  const token = await v.formToken('/jobs/accountant');
  const fd = new FormData();
  for (const [k, val] of Object.entries({ _csrf: token, full_name: 'سارة', mobile: '0551112222', email: 's@x.co', qualification: 'بكالوريوس' })) fd.append(k, val);
  fd.append('cv', new Blob([samplePdf('CV')], { type: 'application/pdf' }), 'cv.pdf');
  const r = await v.req('/jobs/accountant/apply', { method: 'POST', body: fd });
  assert.equal(r.status, 303);
  const app = await knex('job_applications').orderBy('id', 'desc').first();
  assert.ok(app.cv_file.startsWith('cv/'));
  assert.ok(!fs.existsSync(path.join(process.env.UPLOAD_DIR, app.cv_file)), 'السيرة ليست في المجلد العام');
  assert.equal((await v.req(`/api/admin/private/job_applications/${app.id}/cv_file`)).status, 401, 'الزائر لا يصل للسيرة');
  const dl = await admin.req(`/api/admin/private/job_applications/${app.id}/cv_file`);
  assert.equal(dl.status, 200);
  assert.ok(dl.text.startsWith('%PDF'));
});

test('الصلاحيات: المحرر لا يصل لإدارة المستخدمين أو المتطوعين', async () => {
  const admin = client();
  await admin.login();
  const roles = await admin.req('/api/admin/r/roles?q=editor');
  const editorRole = roles.data.items.find((r) => r.name === 'editor');
  const u = await admin.req('/api/admin/r/users', { method: 'POST', json: { name: 'محرر', email: 'editor@test.local', password: 'Editor@1234', role_id: editorRole.id, is_active: true } });
  assert.equal(u.status, 201);
  assert.equal(u.data.password_hash, undefined, 'لا تُرسل كلمة المرور المشفرة');

  const ed = client();
  assert.equal((await ed.login('editor@test.local', 'Editor@1234')).status, 200);
  assert.equal((await ed.req('/api/admin/r/users')).status, 403);
  assert.equal((await ed.req('/api/admin/r/volunteers')).status, 403);
  assert.equal((await ed.req('/api/admin/settings/identity', { method: 'PUT', json: { org_name: 'x' } })).status, 403);
  assert.equal((await ed.req('/api/admin/r/news')).status, 200);

  // تعطيل المستخدم ينهي جلسته فورًا
  await admin.req(`/api/admin/r/users/${u.data.id}`, { method: 'PATCH', json: { is_active: false } });
  assert.equal((await ed.req('/api/admin/r/news')).status, 401);
});

test('القائمة: إنشاء قائمة منسدلة وإعادة ترتيبها', async () => {
  const c = client();
  await c.login();
  const parent = await c.req('/api/admin/r/navigation_items', { method: 'POST', json: { label: 'عن الجمعية', url: '/about', link_type: 'url', location: 'header' } });
  const child = await c.req('/api/admin/r/navigation_items', { method: 'POST', json: { label: 'الحوكمة', url: '/governance', link_type: 'url', location: 'header' } });
  const tree = await c.req('/api/admin/menu/tree', { method: 'POST', json: { items: [{ id: parent.data.id, parent_id: null, sort_order: 1 }, { id: child.data.id, parent_id: parent.data.id, sort_order: 1 }] } });
  assert.equal(tree.status, 200);
  const home = await client().req('/about');
  assert.match(home.text, /class="submenu"/);
  const badLink = await c.req('/api/admin/r/navigation_items', { method: 'POST', json: { label: 'x', url: 'javascript:alert(1)', link_type: 'url' } });
  assert.equal(badLink.status, 422);
});

test('سجل العمليات يسجل العمليات المهمة', async () => {
  const actions = await knex('audit_logs').distinct('action').pluck('action');
  for (const a of ['login', 'login_failed', 'create', 'upload', 'settings_update']) assert.ok(actions.includes(a), a);
});

test('جميع صفحات الموقع العام تعمل', async () => {
  const c = client();
  for (const p of ['/', '/about', '/governance', '/members', '/executive-manager', '/organizational-structure', '/projects', '/media-center',
    '/media-center/news', '/media-center/videos', '/media-center/gallery', '/beneficiary-needs', '/beneficiary-satisfaction', '/volunteer', '/jobs', '/contact', '/robots.txt']) {
    const r = await c.req(p);
    assert.equal(r.status, 200, p);
  }
  assert.equal((await c.req('/page/missing')).status, 404);
});
