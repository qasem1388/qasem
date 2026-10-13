// عرض القوائم العام لكل الموارد: بحث، فلترة، ترتيب، سحب وإفلات، تفعيل/تعطيل، حذف مع تأكيد
import { api } from '../api.js';
import { html, raw, el, $, $$, toast, confirmDialog, formatDate, debounce, loading, optLabel, setTitle } from '../ui.js';
import { relationOptions, state } from '../store.js';
import { openMediaPicker } from './media.js';
import { refreshBadges } from '../app.js';

function fieldOf(res, name) {
  if (name === 'created_at' || name === 'updated_at') return { name, label: name === 'created_at' ? 'تاريخ الإضافة' : 'آخر تعديل', type: 'datetime' };
  if (name === 'is_active') return { name, label: 'ظاهر', type: 'boolean' };
  return res.fields.find((f) => f.name === name) || { name, label: name, type: 'text' };
}

/** رابط المعاينة في الموقع العام */
export function previewUrl(res, row) {
  if (!res.preview) return null;
  if (res.preview.includes('{slug}')) {
    if (!row || !row.slug) return null;
    return res.preview.replace('{slug}', encodeURIComponent(row.slug)) + (res.status && row.status !== 'published' ? '?preview=1' : '');
  }
  return res.preview;
}

export async function renderList(view, res, params) {
  setTitle(res.label);
  const canManage = res.canManage;
  const query = Object.fromEntries(params.entries());
  const relFields = res.fields.filter((f) => f.type === 'relation' && (res.listColumns.includes(f.name) || res.filters.includes(f.name)));
  const relMaps = {};
  await Promise.all(relFields.map(async (f) => {
    try { relMaps[f.name] = await relationOptions(f.relation.resource, { fresh: true }); } catch { relMaps[f.name] = []; }
  }));
  const relLabel = (f, id) => ((relMaps[f.name] || []).find((o) => o.id === id) || {}).label || (id ?? '');

  // سياق الأب (مثل: ملفات سنة معينة، صور ألبوم معين)
  let parent = null;
  for (const [pname, pres] of Object.entries(state.meta.resources)) {
    for (const ch of pres.children || []) {
      if (ch.resource === res.name && query[`f_${ch.fk}`]) {
        const f = res.fields.find((x) => x.name === ch.fk);
        parent = { res: pres, id: Number(query[`f_${ch.fk}`]), fk: ch.fk, label: f ? relLabel(f, Number(query[`f_${ch.fk}`])) : '' };
        break;
      }
    }
    if (parent) break;
  }

  const newHref = `/admin/r/${res.name}/new${parent ? `?${parent.fk}=${parent.id}` : ''}`;
  view.innerHTML = String(html`
    ${parent ? html`<div class="crumb"><a href="/admin/r/${parent.res.name}" data-link>${parent.res.label}</a> / ${parent.label}</div>` : ''}
    <div class="page-head">
      <h1><i class="fa-solid ${res.icon}"></i> ${res.label}${parent ? html` <span class="muted small">— ${parent.label}</span>` : ''}</h1>
      <div class="page-head__actions">
        ${res.exportable ? html`<a class="btn btn--light" data-export href="#"><i class="fa-solid fa-file-csv"></i> تصدير Excel</a>` : ''}
        ${canManage && res.bulkImages && parent ? html`<button class="btn btn--light" type="button" data-bulk><i class="fa-solid fa-images"></i> إضافة صور متعددة</button>` : ''}
        ${canManage && res.canCreate ? html`<a class="btn" href="${newHref}" data-link><i class="fa-solid fa-plus"></i> إضافة ${res.singular}</a>` : ''}
      </div>
    </div>
    ${res.help ? html`<div class="help"><i class="fa-solid fa-circle-info"></i><span>${res.help}</span></div>` : ''}
    <div class="panel">
      <div class="toolbar" data-toolbar>
        <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" name="q" placeholder="بحث..." aria-label="بحث" value="${query.q || ''}"></div>
      </div>
      <div class="table-wrap" data-table></div>
      <div class="pager" data-pager></div>
    </div>`);

  // ===== الفلاتر =====
  const toolbar = $('[data-toolbar]', view);
  for (const name of res.filters) {
    const f = fieldOf(res, name);
    if (parent && name === parent.fk) continue;
    let ctrl;
    if (f.type === 'select') ctrl = el(html`<select name="f_${name}" aria-label="${f.label}"><option value="">${f.label}: الكل</option>${f.options.map((o) => html`<option value="${o.value}">${o.label}</option>`)}</select>`);
    else if (f.type === 'relation') ctrl = el(html`<select name="f_${name}" aria-label="${f.label}"><option value="">${f.label}: الكل</option>${f.name === 'parent_id' ? html`<option value="__null">— المستوى الأعلى —</option>` : ''}${(relMaps[name] || []).map((o) => html`<option value="${o.id}">${o.label}</option>`)}</select>`);
    else if (f.type === 'boolean') ctrl = el(html`<select name="f_${name}" aria-label="${f.label}"><option value="">${f.label}: الكل</option><option value="true">نعم</option><option value="false">لا</option></select>`);
    else ctrl = el(html`<input class="filter-input" name="f_${name}" placeholder="${f.label}" aria-label="${f.label}">`);
    ctrl.value = query[`f_${name}`] || '';
    toolbar.appendChild(ctrl);
  }
  if (res.toggle) {
    const ctrl = el('<select name="f_active" aria-label="الحالة"><option value="">الظهور: الكل</option><option value="true">ظاهر</option><option value="false">مخفي</option></select>');
    ctrl.value = query.f_active || '';
    toolbar.appendChild(ctrl);
  }

  const syncUrl = () => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== '' && v !== undefined && v !== null) qs.set(k, v);
    history.replaceState(null, '', `${location.pathname}${qs.toString() ? '?' + qs : ''}`);
  };
  const onFilter = (e) => {
    const t = e.target;
    if (!t.name) return;
    query[t.name] = t.value;
    query.page = '';
    syncUrl();
    load();
  };
  toolbar.addEventListener('change', onFilter);
  toolbar.addEventListener('input', debounce((e) => { if (e.target.matches('input')) onFilter(e); }, 350));

  const exportBtn = $('[data-export]', view);
  if (exportBtn) exportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const qs = new URLSearchParams(Object.entries(query).filter(([k, v]) => v && (k.startsWith('f_') || k === 'q')));
    location.href = `/api/admin/r/${res.name}/export.csv?${qs}`;
  });

  const bulk = $('[data-bulk]', view);
  if (bulk) bulk.addEventListener('click', async () => {
    const picked = await openMediaPicker({ kind: 'image', multiple: true });
    if (!picked || !picked.length) return;
    try {
      for (const p of picked) await api(`r/${res.name}`, { method: 'POST', body: { [res.bulkImages.parentField]: parent.id, [res.bulkImages.field]: p.url, caption: '' } });
      toast(`تمت إضافة ${picked.length} صورة`);
      load();
    } catch (e) { toast(e.message, 'error'); }
  });

  // ===== الجدول =====
  const tableBox = $('[data-table]', view);
  const pager = $('[data-pager]', view);
  const columns = res.listColumns.map((n) => fieldOf(res, n));
  let sortable = null;

  function cell(f, row) {
    const v = row[f.name];
    if (f.name === res.labelField || (f.name === res.listColumns[0] && !['image', 'icon'].includes(f.type)) || (res.listColumns[0] === 'image' && f.name === res.listColumns[1])) {
      if (f.type === 'text' || f.type === 'number') return html`<a class="cell-title" href="/admin/r/${res.name}/${row.id}" data-link>${v ?? '—'}</a>`;
    }
    switch (f.type) {
      case 'image': return v ? html`<img class="thumb ${['photo'].includes(f.name) ? 'thumb--round' : ''}" src="${v}" alt="" loading="lazy">` : (f.name === 'thumbnail' && row.youtube_id ? html`<img class="thumb" src="https://i.ytimg.com/vi/${row.youtube_id}/default.jpg" alt="" loading="lazy">` : html`<span class="thumb" style="display:grid;place-items:center;color:#94a3b8"><i class="fa-regular fa-image"></i></span>`);
      case 'icon': return v ? html`<span class="icon-preview" style="width:34px;height:34px"><i class="${v}"></i></span>` : '';
      case 'boolean':
        if ((f.name === res.toggle) && canManage) return html`<label class="switch" title="تفعيل/تعطيل"><input type="checkbox" data-toggle="${row.id}" ${v ? raw('checked') : ''}><span class="switch__track"></span></label>`;
        return v ? html`<i class="fa-solid fa-circle-check" style="color:#16a34a"></i>` : html`<i class="fa-regular fa-circle" style="color:#cbd5e1"></i>`;
      case 'select':
        if (f.quickEdit && canManage) return html`<select class="inline-select" data-quick="${row.id}" data-field="${f.name}" aria-label="${f.label}">${f.options.map((o) => html`<option value="${o.value}" ${o.value === v ? raw('selected') : ''}>${o.label}</option>`)}</select>`;
        return f.name === 'status' ? html`<span class="badge badge--${v}">${optLabel(f, v)}</span>` : html`<span class="badge">${optLabel(f, v)}</span>`;
      case 'relation': return v ? relLabel(f, v) : html`<span class="muted">—</span>`;
      case 'date': return formatDate(v);
      case 'datetime': return html`<span class="small">${formatDate(v, true)}</span>`;
      case 'file': return v ? html`<a href="${v}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" style="color:#dc2626"></i> عرض</a>` : '—';
      case 'privatefile': return v ? html`<a href="/api/admin/private/${res.name}/${row.id}/${f.name}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf" style="color:#dc2626"></i> السيرة</a>` : '—';
      case 'url': return v ? html`<span class="small" dir="ltr">${v}</span>` : '—';
      case 'textarea': return html`<span class="small muted">${String(v || '').slice(0, 80)}${String(v || '').length > 80 ? '…' : ''}</span>`;
      default: return v === null || v === undefined || v === '' ? html`<span class="muted">—</span>` : v;
    }
  }

  function actions(row) {
    const prev = previewUrl(res, row);
    return html`<div class="row-actions">
      ${(res.children || []).map((ch) => html`<a class="btn btn--sm btn--light" href="/admin/r/${ch.resource}?f_${ch.fk}=${row.id}" data-link><i class="fa-solid ${ch.icon || 'fa-list'}"></i> ${ch.label}</a>`)}
      ${prev ? html`<a class="icon-btn" href="${prev}" target="_blank" rel="noopener" title="معاينة" aria-label="معاينة"><i class="fa-regular fa-eye"></i></a>` : ''}
      <a class="icon-btn" href="/admin/r/${res.name}/${row.id}" data-link title="${canManage && res.canEdit ? 'تعديل' : 'عرض'}" aria-label="${canManage && res.canEdit ? 'تعديل' : 'عرض'}"><i class="fa-solid ${canManage && res.canEdit && !res.readOnly ? 'fa-pen' : 'fa-eye'}"></i></a>
      ${canManage && res.canDelete ? html`<button class="icon-btn icon-btn--danger" type="button" data-delete="${row.id}" title="حذف" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>` : ''}
    </div>`;
  }

  async function load() {
    const dragMode = res.sortable && canManage && !query.q && !query.sort;
    loading(tableBox);
    let data;
    try {
      data = await api(`r/${res.name}`, { query: { ...query, per_page: dragMode ? 'all' : 20 } });
    } catch (e) { tableBox.innerHTML = String(html`<div class="empty-state">${e.message}</div>`); return; }
    if (!data.items.length) {
      tableBox.innerHTML = String(html`<div class="empty-state"><i class="fa-regular fa-folder-open"></i>لا توجد بيانات${canManage && res.canCreate ? html`<div style="margin-top:12px"><a class="btn btn--sm" href="${newHref}" data-link><i class="fa-solid fa-plus"></i> إضافة ${res.singular}</a></div>` : ''}</div>`);
      pager.innerHTML = '';
      return;
    }
    tableBox.innerHTML = String(html`<table class="data"><thead><tr>
        ${dragMode ? html`<th style="width:34px"><span class="sr-only">ترتيب</span></th>` : ''}
        ${columns.map((c) => html`<th class="sortable" data-sort="${c.name}">${c.label}${query.sort === c.name ? html` <i class="fa-solid fa-arrow-${query.dir === 'desc' ? 'down' : 'up'}-short"></i>` : ''}</th>`)}
        <th><span class="sr-only">إجراءات</span></th></tr></thead>
      <tbody>${data.items.map((row) => html`<tr data-id="${row.id}">
        ${dragMode ? html`<td><span class="drag-handle" title="اسحب لتغيير الترتيب"><i class="fa-solid fa-grip-vertical"></i></span></td>` : ''}
        ${columns.map((c) => html`<td data-label="${c.label}">${cell(c, row)}</td>`)}
        <td class="td-actions">${actions(row)}</td></tr>`)}</tbody></table>`);

    const pages = Math.ceil(data.total / data.perPage);
    pager.innerHTML = String(html`<span>${data.total} عنصر${dragMode ? ' — اسحب الصفوف لتغيير ترتيب الظهور' : ''}</span>
      ${!dragMode && pages > 1 ? html`<div class="pager__btns"><button class="btn btn--sm btn--light" type="button" data-page="${data.page - 1}" ${data.page <= 1 ? raw('disabled') : ''}>السابق</button><span style="padding:4px 8px">${data.page} / ${pages}</span><button class="btn btn--sm btn--light" type="button" data-page="${data.page + 1}" ${data.page >= pages ? raw('disabled') : ''}>التالي</button></div>` : ''}`);

    if (sortable) { sortable.destroy(); sortable = null; }
    if (dragMode && window.Sortable) {
      sortable = window.Sortable.create($('tbody', tableBox), {
        handle: '.drag-handle', animation: 150,
        onEnd: async () => {
          const ids = $$('tbody tr', tableBox).map((tr) => Number(tr.dataset.id));
          try { await api(`r/${res.name}/reorder`, { method: 'POST', body: { ids } }); toast('تم حفظ الترتيب'); } catch (e) { toast(e.message, 'error'); load(); }
        },
      });
    }
  }

  view.addEventListener('click', async (e) => {
    const th = e.target.closest('th[data-sort]');
    if (th) {
      const name = th.dataset.sort;
      if (query.sort === name && query.dir !== 'desc') query.dir = 'desc';
      else if (query.sort === name) { query.sort = ''; query.dir = ''; } else { query.sort = name; query.dir = 'asc'; }
      syncUrl();
      return load();
    }
    const pg = e.target.closest('[data-page]');
    if (pg) { query.page = pg.dataset.page; syncUrl(); return load(); }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const row = del.closest('tr');
      const label = row ? $('.cell-title', row)?.textContent || '' : '';
      const extra = (res.children || []).length ? ' سيتم حذف جميع العناصر التابعة له أيضًا.' : '';
      if (!(await confirmDialog(`هل أنت متأكد من حذف ${res.singular}${label ? ` "${label}"` : ''}؟ لا يمكن التراجع عن هذه العملية.${extra}`, { title: 'تأكيد الحذف', okText: 'حذف' }))) return;
      try { await api(`r/${res.name}/${del.dataset.delete}`, { method: 'DELETE' }); toast('تم الحذف بنجاح'); load(); } catch (err) { toast(err.message, 'error'); }
    }
  });
  view.addEventListener('change', async (e) => {
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      try { await api(`r/${res.name}/${tg.dataset.toggle}`, { method: 'PATCH', body: { [res.toggle]: tg.checked } }); toast(tg.checked ? 'تم الإظهار' : 'تم الإخفاء'); } catch (err) { tg.checked = !tg.checked; toast(err.message, 'error'); }
      return;
    }
    const q = e.target.closest('[data-quick]');
    if (q) {
      try { await api(`r/${res.name}/${q.dataset.quick}`, { method: 'PATCH', body: { [q.dataset.field]: q.value } }); toast('تم تحديث الحالة'); refreshBadges(); } catch (err) { toast(err.message, 'error'); load(); }
    }
  });

  await load();
}

