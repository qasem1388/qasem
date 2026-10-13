'use strict';
const knex = require('../db/knex');
const { can } = require('../core/permissions');

/** تحميل المستخدم الحالي وصلاحياته من الجلسة (في كل طلب لضمان تطبيق التعطيل وتغيير الصلاحيات فورًا) */
async function loadUser(req, res, next) {
  req.user = null;
  const id = req.session && req.session.userId;
  if (!id) return next();
  try {
    const u = await knex('users as u')
      .leftJoin('roles as r', 'r.id', 'u.role_id')
      .where('u.id', id)
      .first('u.id', 'u.name', 'u.email', 'u.is_active', 'u.role_id', 'r.name as role_name', 'r.label as role_label');
    if (!u || !u.is_active) {
      req.session.userId = null;
      return next();
    }
    const perms = u.role_id
      ? await knex('role_permissions as rp').join('permissions as p', 'p.id', 'rp.permission_id').where('rp.role_id', u.role_id).pluck('p.key')
      : [];
    req.user = {
      id: u.id, name: u.name, email: u.email, role_id: u.role_id,
      roleName: u.role_name, roleLabel: u.role_label,
      isSuper: u.role_name === 'super_admin',
      permissions: new Set(perms),
    };
    res.locals.adminUser = req.user;
    next();
  } catch (e) {
    next(e);
  }
}

function requireAuthApi(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  next();
}

function requireAuthPage(req, res, next) {
  if (!req.user) return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

function requirePerm(perm) {
  return (req, res, next) => {
    if (!can(req.user, perm)) return res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذه العملية' });
    next();
  };
}

module.exports = { loadUser, requireAuthApi, requireAuthPage, requirePerm };
