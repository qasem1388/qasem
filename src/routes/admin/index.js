'use strict';
/** واجهات API الخاصة بلوحة التحكم (جميعها تتطلب تسجيل الدخول + CSRF للعمليات المعدِّلة) */
const express = require('express');
const rateLimit = require('express-rate-limit');
const knex = require('../../db/knex');
const { resources, publicMeta } = require('../../core/resources');
const settingsSchema = require('../../core/settings-schema');
const { getSettings, saveSettings } = require('../../core/settings');
const { normalizeField, serializeRow } = require('../../core/validate');
const { allPermissions, MODULES, can } = require('../../core/permissions');
const { hashPassword, verifyPassword } = require('../../core/passwords');
const { httpError } = require('../../core/http-error');
const { audit } = require('../../core/audit');
const storage = require('../../core/storage');
const adminMenu = require('../../core/admin-menu');
const { requireAuthApi, requirePerm } = require('../../middleware/auth');
const { csrfToken, verifyCsrf } = require('../../middleware/csrf');
const { uploader } = require('../../middleware/upload');
const resourceRoutes = require('./resources');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ================= المصادقة =================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  skipSuccessfulRequests: true, // تُحتسب المحاولات الفاشلة فقط
  message: { error: 'محاولات دخول كثيرة. يرجى المحاولة بعد 15 دقيقة.' },
});

router.get('/auth/csrf', (req, res) => res.json({ token: csrfToken(req) }));
router.get('/auth/brand', wrap(async (req, res) => {
  const s = await getSettings();
  res.json({ name: s.org_name, logo: s.logo, primary: s.color_primary });
}));

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

router.post('/auth/login', loginLimiter, verifyCsrf, wrap(async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase().slice(0, 255);
  const password = String((req.body && req.body.password) || '').slice(0, 128);
  if (!email || !password) throw httpError(400, 'يرجى إدخال البريد الإلكتروني وكلمة المرور');

  const user = await knex('users').where({ email }).first();
  const fail = async (msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة') => {
    await audit(req, 'login_failed', 'users', user ? user.id : null, { email });
    throw httpError(401, msg);
  };
  if (!user) return fail();
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return fail(`تم إيقاف الحساب مؤقتًا بسبب محاولات دخول خاطئة متكررة. حاول بعد ${LOCK_MINUTES} دقيقة.`);
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    const failed = (user.failed_logins || 0) + 1;
    const upd = { failed_logins: failed };
    if (failed >= MAX_FAILED) {
      upd.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      upd.failed_logins = 0;
    }
    await knex('users').where('id', user.id).update(upd);
    return fail();
  }
  if (!user.is_active) return fail('هذا الحساب معطّل. يرجى التواصل مع مدير النظام.');

  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
  req.session.userId = user.id;
  csrfToken(req);
  await knex('users').where('id', user.id).update({ failed_logins: 0, locked_until: null, last_login_at: knex.fn.now() });
  req.user = { id: user.id, name: user.name, email: user.email };
  await audit(req, 'login', 'users', user.id);
  res.json({ ok: true, csrf: req.session.csrfToken });
}));

router.post('/auth/logout', verifyCsrf, wrap(async (req, res) => {
  if (req.user) await audit(req, 'logout', 'users', req.user.id);
  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('ngo.sid');
  res.json({ ok: true });
}));

// ================= كل ما يلي يتطلب تسجيل الدخول =================
router.use('/admin', requireAuthApi, verifyCsrf);

router.get('/admin/me', (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.roleLabel, isSuper: req.user.isSuper, csrf: csrfToken(req) });
});

router.put('/admin/profile', wrap(async (req, res) => {
  const { name, current_password: current, new_password: next } = req.body || {};
  const user = await knex('users').where('id', req.user.id).first();
  const upd = {};
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n || n.length > 128) throw httpError(422, 'الاسم غير صالح', { name: 'الاسم مطلوب' });
    upd.name = n;
  }
  if (next) {
    if (!(await verifyPassword(String(current || ''), user.password_hash))) throw httpError(422, 'كلمة المرور الحالية غير صحيحة', { current_password: 'غير صحيحة' });
    if (String(next).length < 8 || String(next).length > 128) throw httpError(422, 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف', { new_password: '8 أحرف على الأقل' });
    upd.password_hash = await hashPassword(next);
  }
  if (Object.keys(upd).length) {
    await knex('users').where('id', user.id).update({ ...upd, updated_at: knex.fn.now() });
    await audit(req, 'profile_update', 'users', user.id, { password_changed: !!upd.password_hash });
  }
  res.json({ ok: true });
}));

// ===== بيانات تهيئة لوحة التحكم =====
router.get('/admin/meta', wrap(async (req, res) => {
  const u = req.user;
  const visible = {};
  for (const r of Object.values(resources)) {
    if (can(u, `${r.permission}.view`)) visible[r.name] = { ...publicMeta(r), canManage: can(u, `${r.permission}.manage`) };
  }
  const settingsGroups = {};
  for (const [k, g] of Object.entries(settingsSchema.groups)) {
    if (can(u, `${g.permission}.view`)) settingsGroups[k] = { label: g.label, icon: g.icon, fields: g.fields, canManage: can(u, `${g.permission}.manage`) };
  }
  const routeAllowed = (route, perm) => {
    if (perm) return can(u, perm);
    if (route === 'dashboard') return true;
    if (route === 'menu') return can(u, 'menu.view');
    if (route.startsWith('r/')) return !!visible[route.slice(2)];
    if (route.startsWith('settings/')) return !!settingsGroups[route.slice(9)];
    return false;
  };
  const menu = adminMenu
    .map((item) => (item.children ? { ...item, children: item.children.filter((c) => routeAllowed(c.route, c.perm)) } : item))
    .filter((item) => (item.children ? item.children.length : routeAllowed(item.route, item.perm)));
  const settings = await getSettings();
  res.json({
    user: { id: u.id, name: u.name, email: u.email, role: u.roleLabel, isSuper: u.isSuper },
    permissions: u.isSuper ? ['*'] : [...u.permissions],
    can: { files: can(u, 'files.view'), filesManage: can(u, 'files.manage'), menuManage: can(u, 'menu.manage') },
    resources: visible, settingsGroups, menu,
    allPermissions: allPermissions(), modules: MODULES,
    site: { name: settings.org_name, logo: settings.logo, primary: settings.color_primary },
    limits: { imageMB: require('../../config').uploads.maxImageMB, pdfMB: require('../../config').uploads.maxPdfMB },
  });
}));

// ===== لوحة المعلومات =====
router.get('/admin/dashboard', wrap(async (req, res) => {
  const count = async (table, where) => {
    const q = knex(table);
    if (where) q.where(where);
    const [{ c }] = await q.count({ c: '*' });
    return Number(c);
  };
  const stats = [
    { key: 'news', label: 'الأخبار', icon: 'fa-newspaper', route: 'r/news', value: await count('news'), perm: 'media.view' },
    { key: 'projects', label: 'المشاريع', icon: 'fa-diagram-project', route: 'r/projects', value: await count('projects'), perm: 'projects.view' },
    { key: 'volunteers', label: 'المتطوعون', icon: 'fa-handshake-angle', route: 'r/volunteers', value: await count('volunteers'), extra: await count('volunteers', { status: 'new' }), extraLabel: 'جديد', perm: 'volunteers.view' },
    { key: 'jobs', label: 'الوظائف', icon: 'fa-briefcase', route: 'r/job_posts', value: await count('job_posts'), perm: 'jobs.view' },
    { key: 'applications', label: 'طلبات التوظيف', icon: 'fa-file-lines', route: 'r/job_applications', value: await count('job_applications'), extra: await count('job_applications', { status: 'new' }), extraLabel: 'جديد', perm: 'jobs.view' },
    { key: 'members', label: 'أعضاء الجمعية', icon: 'fa-users', route: 'r/members', value: (await count('members')) + (await count('employees')), perm: 'members.view' },
    { key: 'governance', label: 'ملفات الحوكمة', icon: 'fa-file-pdf', route: 'r/governance_files', value: await count('governance_files'), perm: 'governance.view' },
    { key: 'pages', label: 'صفحات الموقع', icon: 'fa-file', route: 'r/pages', value: await count('pages'), perm: 'pages.view' },
    { key: 'messages', label: 'رسائل التواصل', icon: 'fa-envelope', route: 'r/contact_messages', value: await count('contact_messages'), extra: await count('contact_messages', { status: 'new' }), extraLabel: 'جديدة', perm: 'messages.view' },
    { key: 'files', label: 'الملفات المرفوعة', icon: 'fa-folder-open', route: 'media', value: await count('media_files'), perm: 'files.view' },
  ].filter((s) => can(req.user, s.perm));

  const out = { stats };
  if (can(req.user, 'volunteers.view')) out.recentVolunteers = await knex('volunteers').select('id', 'full_name', 'city', 'status', 'created_at').orderBy('id', 'desc').limit(5);
  if (can(req.user, 'jobs.view')) out.recentApplications = await knex('job_applications').select('id', 'full_name', 'job_title', 'status', 'created_at').orderBy('id', 'desc').limit(5);
  if (can(req.user, 'audit.view')) out.recentAudit = (await knex('audit_logs').select('id', 'user_name', 'action', 'entity', 'entity_id', 'created_at').orderBy('id', 'desc').limit(8)).map((r) => serializeRow(resources.audit_logs, r));
  res.json(out);
}));

router.get('/admin/badges', wrap(async (req, res) => {
  const c = async (t) => Number((await knex(t).where('status', 'new').count({ c: '*' }))[0].c);
  res.json({
    volunteers_new: can(req.user, 'volunteers.view') ? await c('volunteers') : 0,
    applications_new: can(req.user, 'jobs.view') ? await c('job_applications') : 0,
    messages_new: can(req.user, 'messages.view') ? await c('contact_messages') : 0,
  });
}));

// ================= الإعدادات =================
function settingsGroup(req, mode) {
  const g = settingsSchema.groups[req.params.group];
  if (!g) throw httpError(404, 'مجموعة الإعدادات غير موجودة');
  if (!can(req.user, `${g.permission}.${mode}`)) throw httpError(403, 'ليس لديك صلاحية');
  return g;
}

router.get('/admin/settings/:group', wrap(async (req, res) => {
  const g = settingsGroup(req, 'view');
  const all = await getSettings();
  res.json(Object.fromEntries(g.fields.map((f) => [f.name, all[f.name]])));
}));

router.put('/admin/settings/:group', wrap(async (req, res) => {
  const g = settingsGroup(req, 'manage');
  const body = req.body || {};
  const data = {};
  const errors = {};
  for (const f of g.fields) {
    if (!(f.name in body)) continue;
    try {
      const v = normalizeField(f, body[f.name]);
      if (f.required && (v === null || v === '')) errors[f.name] = `حقل "${f.label}" مطلوب`;
      else data[f.name] = v;
    } catch (e) {
      errors[f.name] = e.message;
    }
  }
  if (Object.keys(errors).length) throw httpError(422, 'يرجى تصحيح الأخطاء في النموذج', errors);
  await saveSettings(req.params.group, data);
  await audit(req, 'settings_update', 'settings', req.params.group, { fields: Object.keys(data) });
  res.json({ ok: true });
}));

// ================= القائمة (شجرة السحب والإفلات) =================
router.post('/admin/menu/tree', requirePerm('menu.manage'), wrap(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (items.length > 500) throw httpError(400, 'عدد العناصر كبير جدًا');
  const ids = new Set(items.map((i) => Number(i.id)));
  const byId = new Map(items.map((i) => [Number(i.id), i]));
  for (const it of items) {
    const p = it.parent_id == null ? null : Number(it.parent_id);
    if (p !== null && !ids.has(p)) throw httpError(400, 'بنية القائمة غير صحيحة');
    if (p !== null && byId.get(p).parent_id != null) throw httpError(400, 'القوائم الفرعية تدعم مستوى واحدًا فقط');
  }
  await knex.transaction(async (trx) => {
    for (const it of items) {
      await trx('navigation_items').where('id', Number(it.id)).update({
        parent_id: it.parent_id == null ? null : Number(it.parent_id),
        sort_order: Number(it.sort_order) || 0,
        updated_at: knex.fn.now(),
      });
    }
  });
  await audit(req, 'reorder', 'navigation_items', null, { count: items.length });
  res.json({ ok: true });
}));

// ================= مكتبة الملفات =================
const canUpload = (u) => can(u, 'files.manage') || u.isSuper || [...u.permissions].some((p) => p.endsWith('.manage'));

router.get('/admin/media', wrap(async (req, res) => {
  const perPage = Math.min(Math.max(parseInt(req.query.per_page, 10) || 40, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const q = knex('media_files');
  if (['image', 'pdf'].includes(req.query.kind)) q.where('kind', req.query.kind);
  const term = String(req.query.q || '').trim().slice(0, 100);
  if (term) q.where((w) => w.where('original_name', knex.likeOp, `%${term}%`).orWhere('alt', knex.likeOp, `%${term}%`));
  const [{ c }] = await q.clone().count({ c: '*' });
  const rows = await q.select('*').orderBy('id', 'desc').limit(perPage).offset((page - 1) * perPage);
  res.json({ items: rows.map((r) => serializeRow({ fields: [] }, r)), total: Number(c), page, perPage });
}));

router.post('/admin/media', (req, res, next) => {
  if (!canUpload(req.user)) return res.status(403).json({ error: 'ليس لديك صلاحية رفع الملفات' });
  uploader().array('files', 20)(req, res, (err) => {
    if (err) return next(httpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف يتجاوز الحد المسموح' : 'تعذر رفع الملف'));
    next();
  });
}, wrap(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw httpError(400, 'لم يتم اختيار أي ملف');
  const allow = req.query.kind === 'image' ? ['image'] : req.query.kind === 'pdf' ? ['pdf'] : ['image', 'pdf'];
  const infos = files.map((f) => ({ f, info: storage.inspect(f, { allow }) })); // التحقق من كل الملفات قبل حفظ أي منها
  const saved = [];
  for (const { f, info } of infos) {
    const { fileName, url } = await storage.savePublic(f, info);
    const original = Buffer.from(f.originalname, 'latin1').toString('utf8').slice(0, 255);
    const [ins] = await knex('media_files').insert({
      original_name: original, file_name: fileName, url, mime_type: info.mime, kind: info.kind, size: f.size, uploaded_by: req.user.id,
    }).returning('id');
    const id = typeof ins === 'object' ? ins.id : ins;
    saved.push(await knex('media_files').where('id', id).first());
    await audit(req, 'upload', 'media_files', id, { name: original, size: f.size });
  }
  res.status(201).json({ items: saved });
}));

router.put('/admin/media/:id', wrap(async (req, res) => {
  if (!canUpload(req.user)) throw httpError(403, 'ليس لديك صلاحية');
  const alt = String((req.body && req.body.alt) || '').slice(0, 255);
  const n = await knex('media_files').where('id', Number(req.params.id)).update({ alt, updated_at: knex.fn.now() });
  if (!n) throw httpError(404, 'الملف غير موجود');
  res.json({ ok: true });
}));

router.delete('/admin/media/:id', requirePerm('files.manage'), wrap(async (req, res) => {
  const row = await knex('media_files').where('id', Number(req.params.id)).first();
  if (!row) throw httpError(404, 'الملف غير موجود');
  await knex('media_files').where('id', row.id).del();
  await storage.deletePublic(row.url);
  await audit(req, 'delete', 'media_files', row.id, { name: row.original_name });
  res.json({ ok: true });
}));

// ================= الملفات الخاصة (السير الذاتية) =================
router.get('/admin/private/:resource/:id/:field', wrap(async (req, res) => {
  const r = resources[req.params.resource];
  const f = r && r.fieldMap[req.params.field];
  if (!r || !f || f.type !== 'privatefile') throw httpError(404, 'الملف غير موجود');
  if (!can(req.user, `${r.permission}.view`)) throw httpError(403, 'ليس لديك صلاحية');
  const row = await knex(r.table).where('id', Number(req.params.id)).first(f.name);
  const full = row && storage.privatePath(row[f.name]);
  if (!full) throw httpError(404, 'الملف غير موجود');
  await audit(req, 'download_private', r.name, req.params.id, { field: f.name });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="cv-${Number(req.params.id)}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(full);
}));

// ================= الموارد العامة =================
router.use('/admin/r', resourceRoutes);

module.exports = router;
