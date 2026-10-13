'use strict';
/**
 * التحقق من مدخلات الموارد وتنقيتها اعتمادًا على تعريف الحقول،
 * وتحويل صفوف قاعدة البيانات إلى صيغة موحدة عند الإرسال.
 */
const knex = require('../db/knex');
const { sanitizeRich } = require('./sanitize');
const { slugify, SLUG_RE, LATIN_SLUG_RE } = require('./slug');
const { youtubeId } = require('./youtube');
const { httpError } = require('./http-error');

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const ICON_RE = /^[a-z0-9 -]{1,100}$/;
const PHONE_RE = /^[0-9+()\s-]{5,30}$/;

const TEXT_TYPES = new Set(['text', 'textarea', 'email', 'tel', 'url', 'slug', 'icon', 'color', 'image', 'file', 'youtube', 'select']);
const JSON_TYPES = new Set(['images', 'files']);

function isSafeUrl(v, { absolute = false } = {}) {
  if (absolute) return /^https?:\/\/[^\s<>"']+$/i.test(v);
  return /^(https?:\/\/|mailto:|tel:)[^\s<>"']+$/i.test(v) || /^\/(?!\/)[^\s<>"']*$/.test(v) || /^#[\w-]*$/.test(v);
}
const isMediaUrl = (v) => /^\/uploads\/[\w./-]+$/.test(v) || /^https:\/\/[^\s<>"']+$/i.test(v);

function cleanList(value, allowCaption) {
  let arr = value;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr || '[]'); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it) => (typeof it === 'string' ? { url: it } : it || {}))
    .filter((it) => typeof it.url === 'string' && isMediaUrl(it.url))
    .slice(0, 100)
    .map((it) => {
      const out = { url: it.url };
      if (it.name) out.name = String(it.name).slice(0, 255);
      if (allowCaption && it.caption) out.caption = String(it.caption).slice(0, 500);
      return out;
    });
}

/**
 * يجهز البيانات القادمة من لوحة التحكم للحفظ.
 * @returns {Promise<object>} البيانات الجاهزة للحفظ (أعمدة الجدول فقط)
 * @throws HttpError(422) مع تفاصيل الأخطاء لكل حقل
 */
async function prepareInput(resource, input, { isNew, existing = null, partial = false }) {
  const data = {};
  const errors = {};

  for (const f of resource.fields) {
    if (f.readonly || f.virtual) continue;
    const has = Object.prototype.hasOwnProperty.call(input, f.name);
    if (!has && (partial || !isNew)) continue;
    let v = has ? input[f.name] : f.default;
    if (v === undefined && f.defaultToday) v = new Date().toISOString().slice(0, 10);

    try {
      v = normalizeField(f, v);
    } catch (e) {
      errors[f.name] = e.message;
      continue;
    }

    const empty = v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (f.required && empty && f.type !== 'boolean') {
      errors[f.name] = `حقل "${f.label}" مطلوب`;
      continue;
    }
    if (JSON_TYPES.has(f.type)) v = JSON.stringify(v || []);
    data[f.name] = empty && !JSON_TYPES.has(f.type) && f.type !== 'boolean' && f.type !== 'number' ? null : v;
  }

  // تحقق من التفرد (slug أو حقول unique)
  for (const f of resource.fields) {
    if ((f.type === 'slug' || f.unique) && data[f.name] != null && !errors[f.name]) {
      const q = knex(resource.table).where(f.name, data[f.name]);
      if (existing) q.whereNot('id', existing.id);
      if (await q.first('id')) errors[f.name] = `القيمة "${data[f.name]}" مستخدمة مسبقًا في حقل "${f.label}"`;
    }
  }

  // كلمة المرور (حقل افتراضي)
  for (const f of resource.fields) {
    if (f.type !== 'password') continue;
    const pw = input[f.name];
    if (isNew && f.requiredOnCreate && !pw) errors[f.name] = `حقل "${f.label}" مطلوب`;
    else if (pw && String(pw).length < (f.minLength || 8)) errors[f.name] = `كلمة المرور يجب ألا تقل عن ${f.minLength || 8} أحرف`;
    else if (pw && String(pw).length > 128) errors[f.name] = 'كلمة المرور طويلة جدًا';
  }

  if (Object.keys(errors).length) throw httpError(422, 'يرجى تصحيح الأخطاء في النموذج', errors);
  return data;
}

function normalizeField(f, v) {
  if (v === undefined || v === null) v = f.type === 'boolean' ? false : null;
  if (TEXT_TYPES.has(f.type) && v !== null) {
    v = String(v).trim();
    if (f.type !== 'textarea') v = v.replace(/[\r\n]+/g, ' ');
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // إزالة محارف التحكم (النصوص تُهرَّب عند العرض)
    if (f.max && v.length > f.max) throw new Error(`"${f.label}" يجب ألا يتجاوز ${f.max} حرفًا`);
  }
  if (v === '' && !['boolean', 'images', 'files'].includes(f.type)) return null;

  switch (f.type) {
    case 'number': {
      if (v === null || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`"${f.label}" يجب أن يكون رقمًا`);
      if (f.min !== undefined && n < f.min) throw new Error(`"${f.label}" يجب ألا يقل عن ${f.min}`);
      if (f.max !== undefined && n > f.max) throw new Error(`"${f.label}" يجب ألا يزيد عن ${f.max}`);
      return Math.trunc(n);
    }
    case 'boolean':
      return v === true || v === 1 || v === '1' || v === 'true' || v === 'on';
    case 'email':
      if (v !== null && !EMAIL_RE.test(v)) throw new Error('صيغة البريد الإلكتروني غير صحيحة');
      return v === null ? null : v.toLowerCase();
    case 'tel':
      if (v !== null && !PHONE_RE.test(v)) throw new Error('رقم الهاتف غير صحيح');
      return v;
    case 'url':
      if (v !== null && !isSafeUrl(v, { absolute: f.absolute })) throw new Error(f.absolute ? 'يجب أن يبدأ الرابط بـ https://' : 'الرابط غير صالح (ابدأ بـ / أو https://)');
      return v;
    case 'image':
    case 'file':
      if (v !== null && !isMediaUrl(v)) throw new Error('يرجى اختيار ملف من مكتبة الملفات');
      if (v !== null && f.type === 'file' && !/\.pdf$/i.test(v) && v.startsWith('/uploads/')) throw new Error('يجب اختيار ملف PDF');
      return v;
    case 'youtube':
      if (v !== null && !youtubeId(v)) throw new Error('رابط YouTube غير صحيح');
      return v;
    case 'date':
      if (v !== null && (!DATE_RE.test(v) || Number.isNaN(Date.parse(v)))) throw new Error('صيغة التاريخ غير صحيحة');
      return v;
    case 'color':
      if (v !== null && !COLOR_RE.test(v)) throw new Error('اللون يجب أن يكون بصيغة #RRGGBB');
      return v;
    case 'icon':
      if (v !== null && !ICON_RE.test(v)) throw new Error('اسم الأيقونة غير صالح');
      return v;
    case 'select':
      if (v !== null && !f.options.some((o) => o.value === v)) throw new Error(`قيمة غير مسموحة في "${f.label}"`);
      return v;
    case 'relation': {
      if (v === null || v === '' || v === undefined) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) throw new Error(`قيمة غير صحيحة في "${f.label}"`);
      return n;
    }
    case 'slug': {
      if (v === null) return null;
      const s = slugify(v, { latinOnly: f.latinOnly });
      if (!s || !(f.latinOnly ? LATIN_SLUG_RE : SLUG_RE).test(s)) throw new Error('الرابط يجب أن يحتوي على حروف وأرقام وشرطات فقط');
      return s;
    }
    case 'richtext':
      return v === null ? null : sanitizeRich(v);
    case 'images':
      return cleanList(v, true);
    case 'files':
      return cleanList(v, false);
    default:
      if (f.pattern && v !== null && !new RegExp(f.pattern).test(v)) throw new Error(f.patternMessage || `قيمة غير صحيحة في "${f.label}"`);
      return v;
  }
}

function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return v.replace(' ', 'T') + 'Z';
  return v;
}

/** تحويل صف من قاعدة البيانات إلى صيغة موحدة (منطقية، JSON، تواريخ) */
function serializeRow(resource, row) {
  if (!row) return row;
  const out = { ...row };
  delete out.password_hash;
  for (const f of resource.fields) {
    if (!(f.name in out)) continue;
    if (f.type === 'boolean') out[f.name] = !!out[f.name];
    else if (JSON_TYPES.has(f.type)) {
      try { out[f.name] = JSON.parse(out[f.name] || '[]'); } catch { out[f.name] = []; }
    } else if (f.type === 'number' && out[f.name] !== null) out[f.name] = Number(out[f.name]);
  }
  if ('is_active' in out) out.is_active = !!out.is_active;
  for (const k of ['created_at', 'updated_at', 'last_login_at']) if (k in out) out[k] = toIso(out[k]);
  return out;
}

module.exports = { prepareInput, normalizeField, serializeRow, isSafeUrl, isMediaUrl, toIso, EMAIL_RE, PHONE_RE };
