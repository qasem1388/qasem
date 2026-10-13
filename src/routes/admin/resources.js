'use strict';
/**
 * واجهة API عامة لإدارة جميع موارد CMS (إنشاء، قراءة، تعديل، حذف، ترتيب، تفعيل، تصدير).
 * تعتمد بالكامل على تعريفات src/core/resources.js.
 */
const express = require('express');
const knex = require('../../db/knex');
const { resources, selectableColumns } = require('../../core/resources');
const { prepareInput, serializeRow } = require('../../core/validate');
const { httpError } = require('../../core/http-error');
const { can } = require('../../core/permissions');
const { audit } = require('../../core/audit');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function getResource(req, mode = 'view') {
  const r = resources[req.params.resource];
  if (!r) throw httpError(404, 'القسم غير موجود');
  if (!can(req.user, `${r.permission}.${mode}`)) throw httpError(403, 'ليس لديك صلاحية للقيام بهذه العملية');
  return r;
}

const rowLabel = (r, row) => (row ? String(row[r.labelField] ?? row.title ?? row.name ?? row.id).slice(0, 200) : '');

async function findRow(r, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw httpError(404, 'العنصر غير موجود');
  const row = await knex(r.table).where('id', n).first();
  if (!row) throw httpError(404, 'العنصر غير موجود');
  return row;
}

async function withVirtuals(r, row) {
  const out = serializeRow(r, row);
  if (r.fieldMap.permissions && r.fieldMap.permissions.type === 'permissions') {
    out.permissions = await knex('role_permissions as rp').join('permissions as p', 'p.id', 'rp.permission_id')
      .where('rp.role_id', row.id).pluck('p.key');
  }
  return out;
}

async function syncPermissions(roleId, keys) {
  if (!Array.isArray(keys)) return;
  const ids = keys.length ? await knex('permissions').whereIn('key', keys.map(String)).pluck('id') : [];
  await knex.transaction(async (trx) => {
    await trx('role_permissions').where('role_id', roleId).del();
    if (ids.length) await trx('role_permissions').insert(ids.map((pid) => ({ role_id: roleId, permission_id: pid })));
  });
}

function applyFilters(q, r, query) {
  for (const name of r.filters) {
    const raw = query[`f_${name}`];
    if (raw === undefined || raw === '') continue;
    const f = r.fieldMap[name];
    if (raw === '__null') q.whereNull(name);
    else if (f && f.type === 'boolean') q.where(name, raw === 'true' || raw === '1');
    else if (f && f.type === 'relation') q.where(name, Number(raw) || 0);
    else q.where(name, String(raw));
  }
  if (r.toggle && query.f_active !== undefined && query.f_active !== '') q.where(r.toggle, query.f_active === 'true');
  const term = String(query.q || '').trim().slice(0, 100);
  if (term && r.searchFields.length) {
    const like = `%${term.replace(/[%_\\]/g, (m) => '\\' + m)}%`;
    q.where((w) => {
      for (const s of r.searchFields) w.orWhere(s, knex.likeOp, like);
      if (/^\d+$/.test(term)) w.orWhere('id', Number(term));
    });
  }
}

// ===== القائمة =====
router.get('/:resource', wrap(async (req, res) => {
  const r = getResource(req);
  const cols = selectableColumns(r);
  const all = req.query.per_page === 'all';
  const perPage = all ? 1000 : Math.min(Math.max(parseInt(req.query.per_page, 10) || 20, 1), 100);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  const base = knex(r.table);
  applyFilters(base, r, req.query);
  const [{ count }] = await base.clone().count({ count: '*' });

  const q = base.clone().select(cols);
  const sort = String(req.query.sort || '');
  if (sort && cols.includes(sort)) q.orderBy(sort, req.query.dir === 'desc' ? 'desc' : 'asc');
  for (const [c, d] of r.defaultOrder) q.orderBy(c, d);
  const rows = await q.limit(perPage).offset((page - 1) * perPage);

  res.json({ items: rows.map((row) => serializeRow(r, row)), total: Number(count), page, perPage });
}));

// ===== خيارات حقول العلاقات =====
router.get('/:resource/options', wrap(async (req, res) => {
  const r = resources[req.params.resource];
  if (!r) throw httpError(404, 'القسم غير موجود');
  // يُسمح بقراءة الخيارات لمن يملك صلاحية المورد نفسه أو أي مورد يرتبط به
  const allowed = can(req.user, `${r.permission}.view`) || Object.values(resources).some((o) =>
    can(req.user, `${o.permission}.view`) && o.fields.some((f) => f.relation && f.relation.resource === r.name));
  if (!allowed) throw httpError(403, 'ليس لديك صلاحية');
  const cols = ['id', r.labelField];
  if (r.treeField) cols.push(r.treeField);
  if (r.name === 'navigation_items') cols.push('location');
  const q = knex(r.table).select(cols);
  for (const [c, d] of r.defaultOrder) q.orderBy(c, d);
  const rows = await q.limit(2000);
  res.json(rows.map((row) => ({ id: row.id, label: String(row[r.labelField] ?? row.id), parent_id: row[r.treeField], location: row.location })));
}));

// ===== تصدير CSV =====
router.get('/:resource/export.csv', wrap(async (req, res) => {
  const r = getResource(req);
  if (!r.exportable) throw httpError(404, 'التصدير غير متاح لهذا القسم');
  const fields = r.fields.filter((f) => !f.virtual && f.type !== 'privatefile');
  const q = knex(r.table).select(['id', ...fields.map((f) => f.name)]);
  applyFilters(q, r, req.query);
  for (const [c, d] of r.defaultOrder) q.orderBy(c, d);
  const rows = await q.limit(20000);
  const optLabel = (f, v) => (f.options ? (f.options.find((o) => o.value === v) || {}).label || v : v);
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // منع حقن الصيغ في Excel
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [['#', ...fields.map((f) => f.label)].map(cell).join(',')];
  for (const row of rows) lines.push([row.id, ...fields.map((f) => optLabel(f, row[f.name]))].map(cell).join(','));
  await audit(req, 'export', r.name, null, { count: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${r.name}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
}));

// ===== السجل الوحيد (مثل المدير التنفيذي) =====
async function singletonRow(r) {
  let row = await knex(r.table).orderBy('id').first();
  if (!row) {
    await knex(r.table).insert({});
    row = await knex(r.table).orderBy('id').first();
  }
  return row;
}

// ===== عنصر واحد =====
router.get('/:resource/:id', wrap(async (req, res) => {
  const r = getResource(req);
  const row = r.singleton && req.params.id === 'single' ? await singletonRow(r) : await findRow(r, req.params.id);
  res.json(await withVirtuals(r, row));
}));

function ctxFor(req, extra) {
  return { user: req.user, input: req.body || {}, httpError, knex, ...extra };
}

// ===== إنشاء =====
router.post('/:resource', wrap(async (req, res) => {
  const r = getResource(req, 'manage');
  if (!r.canCreate) throw httpError(405, 'الإضافة غير متاحة لهذا القسم');
  const body = req.body || {};
  const data = await prepareInput(r, body, { isNew: true });
  if (r.sortable && data.sort_order === undefined) {
    const max = await knex(r.table).max({ m: 'sort_order' }).first();
    data.sort_order = (Number(max && max.m) || 0) + 1;
  }
  if (r.trackCreator) data.created_by = req.user.id;
  if (r.hooks && r.hooks.beforeSave) await r.hooks.beforeSave(data, ctxFor(req, { isNew: true, existing: null }));
  const [ins] = await knex(r.table).insert(data).returning('id');
  const id = typeof ins === 'object' ? ins.id : ins;
  if (r.fieldMap.permissions && r.fieldMap.permissions.type === 'permissions') await syncPermissions(id, body.permissions);
  const row = await findRow(r, id);
  await audit(req, 'create', r.name, id, { label: rowLabel(r, row) });
  res.status(201).json(await withVirtuals(r, row));
}));

// ===== تعديل (كامل أو جزئي) =====
async function update(req, res, partial) {
  const r = getResource(req, 'manage');
  if (!r.canEdit) throw httpError(405, 'التعديل غير متاح لهذا القسم');
  const existing = r.singleton && req.params.id === 'single' ? await singletonRow(r) : await findRow(r, req.params.id);
  const body = req.body || {};
  const data = await prepareInput(r, body, { isNew: false, existing, partial });
  if (r.hooks && r.hooks.beforeSave) await r.hooks.beforeSave(data, ctxFor(req, { isNew: false, existing }));
  if (r.treeField && data[r.treeField] != null) await assertNoCycle(r, existing.id, data[r.treeField]);
  if (Object.keys(data).length) {
    if (r.table !== 'audit_logs') data.updated_at = knex.fn.now();
    await knex(r.table).where('id', existing.id).update(data);
  }
  // دور المدير العام يملك جميع الصلاحيات ضمنيًا، فلا تُحفظ له قائمة صلاحيات
  if (r.fieldMap.permissions && r.fieldMap.permissions.type === 'permissions' && body.permissions !== undefined && existing.name !== 'super_admin') {
    await syncPermissions(existing.id, body.permissions);
  }
  // إنهاء جلسات المستخدم عند تعطيله أو تغيير كلمة مروره
  if (r.name === 'users' && (data.is_active === false || data.password_hash) && existing.id !== req.user.id) {
    await req.sessionStore.destroyUserSessions(existing.id);
  }
  const row = await findRow(r, existing.id);
  const changed = Object.keys(data).filter((k) => !['updated_at', 'password_hash'].includes(k));
  if (data.password_hash) changed.push('password');
  await audit(req, partial ? 'quick_update' : 'update', r.name, existing.id, { label: rowLabel(r, row), fields: changed });
  res.json(await withVirtuals(r, row));
}

async function assertNoCycle(r, id, parentId) {
  let cur = parentId;
  for (let i = 0; cur && i < 100; i++) {
    if (Number(cur) === Number(id)) throw httpError(422, 'لا يمكن أن يتبع العنصر لنفسه أو لأحد العناصر التابعة له', { [r.treeField]: 'علاقة غير صحيحة' });
    const p = await knex(r.table).where('id', cur).first(r.treeField);
    cur = p && p[r.treeField];
  }
}

router.put('/:resource/:id', wrap((req, res) => update(req, res, false)));
router.patch('/:resource/:id', wrap((req, res) => update(req, res, true)));

// ===== حذف =====
router.delete('/:resource/:id', wrap(async (req, res) => {
  const r = getResource(req, 'manage');
  if (!r.canDelete) throw httpError(405, 'الحذف غير متاح لهذا القسم');
  const row = await findRow(r, req.params.id);
  if (r.hooks && r.hooks.beforeDelete) await r.hooks.beforeDelete(row, ctxFor(req, {}));
  if (r.name === 'roles' && (await knex('users').where('role_id', row.id).first('id'))) {
    throw httpError(400, 'لا يمكن حذف الدور لوجود مستخدمين مرتبطين به');
  }
  await knex(r.table).where('id', row.id).del();
  await audit(req, 'delete', r.name, row.id, { label: rowLabel(r, row) });
  res.json({ ok: true });
}));

// ===== إعادة الترتيب (سحب وإفلات) =====
router.post('/:resource/reorder', wrap(async (req, res) => {
  const r = getResource(req, 'manage');
  if (!r.sortable) throw httpError(400, 'هذا القسم لا يدعم الترتيب');
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length || ids.length > 2000) throw httpError(400, 'قائمة الترتيب غير صحيحة');
  await knex.transaction(async (trx) => {
    for (let i = 0; i < ids.length; i++) await trx(r.table).where('id', ids[i]).update({ sort_order: i + 1 });
  });
  await audit(req, 'reorder', r.name, null, { count: ids.length });
  res.json({ ok: true });
}));

module.exports = router;
