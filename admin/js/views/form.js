// النماذج العامة للإضافة والتعديل (تُستخدم في الصفحات وفي النوافذ المنبثقة)
import { api } from '../api.js';
import { html, el, $, toast, confirmDialog, setTitle, formatDate } from '../ui.js';
import { createField } from '../fields.js';
import { invalidateOptions } from '../store.js';
import { navigate, setLeaveGuard, refreshBadges } from '../app.js';
import { previewUrl } from './list.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * بناء نموذج لمورد معين.
 * @returns {{ root: HTMLElement, values: Function, setErrors: Function, isDirty: Function, markClean: Function, destroy: Function }}
 */
export function buildForm(res, record, { defaults = {}, fields = res.fields } = {}) {
  const root = el('<div></div>');
  const ctx = { resource: res, record };
  const controls = new Map();
  let section = el('<div class="form-section"><div class="fields"></div></div>');
  root.appendChild(section);
  for (const f of fields) {
    if (f.section) {
      section = el(html`<div class="form-section"><div class="form-section__title">${f.section}</div><div class="fields"></div></div>`);
      root.appendChild(section);
    }
    let value;
    if (record) value = record[f.name];
    else if (defaults[f.name] !== undefined) value = defaults[f.name];
    else if (f.default !== undefined) value = f.default;
    else if (f.defaultToday) value = today();
    // الحقول للعرض فقط لا تظهر عند الإضافة
    if (!record && f.readonly) continue;
    const c = createField(f, value, ctx);
    controls.set(f.name, c);
    $('.fields', section).appendChild(c.el);
  }
  $$empty(root);

  // إظهار الحقول حسب قيمة حقل آخر (showIf)
  const applyShowIf = () => {
    for (const f of fields) {
      if (!f.showIf || !controls.has(f.name)) continue;
      const ok = Object.entries(f.showIf).every(([k, v]) => controls.has(k) && controls.get(k).get() === v);
      controls.get(f.name).el.hidden = !ok;
    }
  };
  // ربط الـ Slug بحقل المصدر
  for (const f of fields) {
    if (f.type === 'slug' && f.from && controls.has(f.from) && controls.has(f.name)) {
      const src = controls.get(f.from);
      const slug = controls.get(f.name);
      if (src.input) src.input.addEventListener('input', () => slug.follow(src.input.value));
    }
  }
  let dirty = false;
  root.addEventListener('input', () => { dirty = true; applyShowIf(); });
  root.addEventListener('change', () => { dirty = true; applyShowIf(); });
  applyShowIf();

  return {
    root,
    controls,
    values() {
      const out = {};
      for (const [name, c] of controls) {
        if (c.readonly || c.el.hidden) continue;
        const f = fields.find((x) => x.name === name);
        if (f.type === 'password' && !c.get()) continue;
        out[name] = c.get();
      }
      return out;
    },
    setErrors(errors = {}) {
      let first = null;
      for (const [name, c] of controls) {
        c.setError(errors[name] || '');
        if (errors[name] && !first) first = c;
      }
      if (first) first.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    isDirty: () => dirty,
    markClean() { dirty = false; },
    destroy() { for (const c of controls.values()) c.destroy && c.destroy(); },
  };
}
function $$empty(root) {
  for (const s of root.querySelectorAll('.form-section')) if (!s.querySelector('.field')) s.remove();
}

/** حفظ سجل (إضافة أو تعديل) مع معالجة أخطاء التحقق */
export async function saveRecord(res, form, id, extra = {}) {
  const body = { ...form.values(), ...extra };
  try {
    const url = res.singleton ? `r/${res.name}/single` : id ? `r/${res.name}/${id}` : `r/${res.name}`;
    const row = await api(url, { method: id || res.singleton ? 'PUT' : 'POST', body });
    form.setErrors({});
    form.markClean();
    invalidateOptions(res.name);
    return row;
  } catch (e) {
    if (e.errors) form.setErrors(e.errors);
    toast(e.message, 'error');
    return null;
  }
}

export async function renderFormPage(view, res, id, params = new URLSearchParams()) {
  const isNew = !id;
  const record = isNew ? null : await api(`r/${res.name}/${res.singleton ? 'single' : id}`);
  const canEdit = res.canManage && res.canEdit && !res.readOnly;
  const defaults = Object.fromEntries([...params.entries()].filter(([k]) => res.fields.some((f) => f.name === k)).map(([k, v]) => [k, /^\d+$/.test(v) ? Number(v) : v]));
  const title = res.singleton ? res.label : isNew ? `إضافة ${res.singular}` : canEdit ? `تعديل ${res.singular}` : `عرض ${res.singular}`;
  setTitle(title);
  const fields = canEdit || isNew ? res.fields : res.fields.map((f) => ({ ...f, readonly: true }));
  const form = buildForm(res, record, { defaults, fields });
  const listUrl = `/admin/r/${res.name}`;
  const isPublished = record && record.status === 'published';
  const label = record ? record[res.labelField] || record.title || record.name : '';

  view.innerHTML = String(html`
    ${res.singleton ? '' : html`<div class="crumb"><a href="${listUrl}" data-link>${res.label}</a>${label ? ` / ${label}` : ''}</div>`}
    <div class="page-head">
      <h1><i class="fa-solid ${res.icon}"></i> ${title}</h1>
      <div class="page-head__actions">
        ${record && record.status ? html`<span class="badge badge--${record.status}">${(res.fields.find((f) => f.name === 'status').options.find((o) => o.value === record.status) || {}).label || ''}</span>` : ''}
        ${record && record.updated_at ? html`<span class="muted small">آخر تعديل: ${formatDate(record.updated_at, true)}</span>` : ''}
      </div>
    </div>
    ${res.help && canEdit ? html`<div class="help"><i class="fa-solid fa-circle-info"></i><span>${res.help}</span></div>` : ''}
    <form class="panel" novalidate data-form>
      <div data-fields></div>
      <div class="form-actions">
        ${canEdit || isNew ? html`<button class="btn" type="submit"><i class="fa-solid fa-floppy-disk"></i> حفظ</button>` : ''}
        ${canEdit && res.status && !isPublished ? html`<button class="btn btn--success" type="button" data-publish><i class="fa-solid fa-globe"></i> نشر</button>` : ''}
        ${canEdit && res.status && isPublished ? html`<button class="btn btn--light" type="button" data-unpublish><i class="fa-solid fa-eye-slash"></i> إلغاء النشر</button>` : ''}
        ${res.preview ? html`<button class="btn btn--light" type="button" data-preview><i class="fa-regular fa-eye"></i> معاينة</button>` : ''}
        ${res.singleton ? '' : html`<a class="btn btn--light" href="${listUrl}" data-link>${canEdit ? 'إلغاء' : 'رجوع'}</a>`}
        <span class="spacer"></span>
        ${record && !res.singleton && res.canManage && res.canDelete ? html`<button class="btn btn--ghost-danger" type="button" data-delete><i class="fa-solid fa-trash"></i> حذف</button>` : ''}
      </div>
    </form>`);
  $('[data-fields]', view).appendChild(form.root);
  setLeaveGuard(() => form.isDirty());

  const formEl = $('[data-form]', view);
  const afterSave = (row, msg = 'تم الحفظ بنجاح') => {
    toast(msg);
    if (['volunteers', 'job_applications', 'contact_messages'].includes(res.name)) refreshBadges();
    setLeaveGuard(null);
    if (res.singleton) return renderFormPage(view, res, 'single');
    navigate(`/admin/r/${res.name}/${row.id}`, { replace: isNew });
  };
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', formEl);
    btn.disabled = true;
    const row = await saveRecord(res, form, record && record.id);
    btn.disabled = false;
    if (row) afterSave(row);
  });
  const statusBtn = async (status, msg) => {
    const row = await saveRecord(res, form, record && record.id, { status });
    if (row) afterSave(row, msg);
  };
  $('[data-publish]', view)?.addEventListener('click', () => statusBtn('published', 'تم النشر بنجاح'));
  $('[data-unpublish]', view)?.addEventListener('click', () => statusBtn('unpublished', 'تم إلغاء النشر'));
  $('[data-preview]', view)?.addEventListener('click', async () => {
    // تُفتح النافذة فورًا لتفادي حظر النوافذ المنبثقة، ثم يُحفظ المحتوى وتُوجَّه إلى رابط المعاينة
    const win = window.open('about:blank', '_blank');
    let row = record;
    if (canEdit && (form.isDirty() || isNew)) {
      row = await saveRecord(res, form, record && record.id);
      if (!row) { if (win) win.close(); return; }
      toast('تم حفظ المحتوى كما هو لمعاينته');
    }
    const url = previewUrl(res, row || {});
    if (!url) { if (win) win.close(); toast('احفظ المحتوى أولًا لمعاينته', 'info'); return; }
    if (win) win.location.href = url; else window.open(url, '_blank');
    if (isNew && row) { setLeaveGuard(null); navigate(`/admin/r/${res.name}/${row.id}`, { replace: true }); }
  });
  $('[data-delete]', view)?.addEventListener('click', async () => {
    if (!(await confirmDialog(`هل أنت متأكد من حذف ${res.singular}${label ? ` "${label}"` : ''}؟ لا يمكن التراجع عن هذه العملية.`, { title: 'تأكيد الحذف', okText: 'حذف' }))) return;
    try {
      await api(`r/${res.name}/${record.id}`, { method: 'DELETE' });
      toast('تم الحذف بنجاح');
      setLeaveGuard(null);
      navigate(listUrl, { replace: true });
    } catch (err) { toast(err.message, 'error'); }
  });
}

