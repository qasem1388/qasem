// منشئ القوائم: سحب وإفلات متداخل لإنشاء القوائم الفرعية (Dropdown) وترتيب الروابط
import { api } from '../api.js';
import { html, raw, el, $, $$, toast, confirmDialog, modal, setTitle, loading } from '../ui.js';
import { state, relationOptions, invalidateOptions } from '../store.js';
import { buildForm, saveRecord } from './form.js';

const SYSTEM_LINKS = [
  ['/', 'الرئيسية'], ['/about', 'عن الجمعية'], ['/governance', 'الحوكمة'], ['/members', 'الأعضاء والمنسوبون'],
  ['/executive-manager', 'المدير التنفيذي'], ['/organizational-structure', 'الهيكل التنظيمي'], ['/projects', 'المشاريع والبرامج'],
  ['/media-center', 'المركز الإعلامي'], ['/media-center/news', 'الأخبار'], ['/media-center/videos', 'الفيديوهات'], ['/media-center/gallery', 'معرض الصور'],
  ['/beneficiary-needs', 'دراسة احتياج المستفيدين'], ['/beneficiary-satisfaction', 'قياس رضا المستفيدين'],
  ['/volunteer', 'التطوع'], ['/jobs', 'الوظائف'], ['/contact', 'تواصل معنا'],
];

export async function renderMenuBuilder(view) {
  const res = state.meta.resources.navigation_items;
  const canManage = res.canManage;
  setTitle('القائمة الرئيسية');
  let location = 'header';
  let pages = [];
  try { pages = await relationOptions('pages', { fresh: true }); } catch { /* لا صلاحية للصفحات */ }

  view.innerHTML = String(html`
    <div class="page-head"><h1><i class="fa-solid fa-bars"></i> إدارة القوائم</h1>
      <div class="page-head__actions">
        ${canManage ? html`<button class="btn" type="button" data-add><i class="fa-solid fa-plus"></i> إضافة رابط</button>` : ''}
        <a class="btn btn--light" href="/" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i> عرض الموقع</a>
      </div></div>
    <div class="help"><i class="fa-solid fa-circle-info"></i><span>اسحب الروابط لإعادة ترتيبها، واسحب رابطًا داخل رابط آخر لإنشاء قائمة منسدلة (مستوى واحد). يتم حفظ الترتيب تلقائيًا.</span></div>
    <div class="panel">
      <div class="tabs" role="tablist">
        <button type="button" class="is-active" data-loc="header">القائمة الرئيسية (الهيدر)</button>
        <button type="button" data-loc="footer">روابط مهمة (الفوتر)</button>
      </div>
      <div class="panel__body" data-tree></div>
    </div>`);

  const treeBox = $('[data-tree]', view);
  const sortables = [];

  const itemHtml = (it, children) => html`<li class="menu-item${it.is_active ? '' : ' is-hidden'}" data-id="${it.id}">
    <div class="menu-item__row">
      ${canManage ? html`<span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>` : ''}
      <div class="menu-item__info"><span class="menu-item__label">${it.label} ${it.open_new_tab ? html`<i class="fa-solid fa-up-right-from-square small muted" title="نافذة جديدة"></i>` : ''} ${it.is_active ? '' : html`<span class="badge">مخفي</span>`}</span>
        <span class="menu-item__url">${it.link_type === 'page' ? `صفحة: ${(pages.find((p) => p.id === it.page_id) || {}).label || '—'}` : it.url || '#'}</span></div>
      ${canManage ? html`<label class="switch" title="إظهار/إخفاء"><input type="checkbox" data-toggle="${it.id}" ${it.is_active ? raw('checked') : ''}><span class="switch__track"></span></label>
        <button class="icon-btn" type="button" data-edit="${it.id}" aria-label="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button class="icon-btn icon-btn--danger" type="button" data-del="${it.id}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>` : ''}
    </div>
    ${children !== null ? html`<ul data-level="2">${children}</ul>` : ''}
  </li>`;

  let items = [];
  async function load() {
    loading(treeBox);
    const data = await api(`r/navigation_items`, { query: { per_page: 'all', f_location: location } });
    items = data.items;
    const roots = items.filter((i) => !i.parent_id || !items.some((x) => x.id === i.parent_id));
    const kids = (id) => items.filter((i) => i.parent_id === id);
    treeBox.innerHTML = roots.length
      ? String(html`<ul class="menu-tree" data-level="1">${roots.map((r) => itemHtml(r, kids(r.id).map((c) => itemHtml(c, null))))}</ul>`)
      : '<div class="empty-state"><i class="fa-solid fa-bars"></i>لا توجد روابط في هذه القائمة</div>';
    sortables.splice(0).forEach((s) => s.destroy());
    if (canManage && window.Sortable) {
      $$('ul[data-level]', treeBox).forEach((ul) => {
        sortables.push(window.Sortable.create(ul, {
          group: { name: 'menu', put: (to, from, dragEl) => !(to.el.dataset.level === '2' && dragEl.querySelector('ul li')) },
          handle: '.drag-handle', animation: 150, fallbackOnBody: true, swapThreshold: 0.6,
          onEnd: saveTree,
        }));
      });
    }
  }

  async function saveTree() {
    const out = [];
    $$(':scope > li', $('ul[data-level="1"]', treeBox)).forEach((li, i) => {
      out.push({ id: Number(li.dataset.id), parent_id: null, sort_order: i + 1 });
      const sub = $(':scope > ul', li);
      if (sub) $$(':scope > li', sub).forEach((c, j) => out.push({ id: Number(c.dataset.id), parent_id: Number(li.dataset.id), sort_order: j + 1 }));
    });
    try { await api('menu/tree', { method: 'POST', body: { items: out } }); toast('تم حفظ ترتيب القائمة'); } catch (e) { toast(e.message, 'error'); }
    load();
  }

  function openEditor(record) {
    const defaults = { location, link_type: 'url' };
    const form = buildForm(res, record, { defaults });
    const wrap = el('<form novalidate></form>');
    wrap.appendChild(form.root);
    // روابط النظام الجاهزة
    const urlField = form.controls.get('url');
    if (urlField) {
      const sugg = el(html`<select class="input" aria-label="اختيار صفحة نظام"><option value="">— اختر صفحة من صفحات الموقع الأساسية —</option>${SYSTEM_LINKS.map(([u, l]) => html`<option value="${u}">${l} (${u})</option>`)}</select>`);
      urlField.el.insertBefore(sugg, urlField.el.querySelector('.field__help'));
      sugg.addEventListener('change', () => {
        if (!sugg.value) return;
        urlField.set(sugg.value);
        const lbl = form.controls.get('label');
        if (lbl && !lbl.get()) lbl.set(sugg.options[sugg.selectedIndex].text.replace(/ \(.*\)$/, ''));
      });
    }
    const footer = el(html`<div style="display:contents"><button class="btn btn--light" type="button" data-close>إلغاء</button><button class="btn" type="button" data-save><i class="fa-solid fa-floppy-disk"></i> حفظ</button></div>`);
    const m = modal({ title: record ? 'تعديل رابط' : 'إضافة رابط', size: 'lg', content: wrap, footer });
    const save = async () => {
      const row = await saveRecord(res, form, record && record.id);
      if (row) { toast('تم الحفظ'); invalidateOptions('navigation_items'); m.close(); location = row.location; switchTab(); }
    };
    $('[data-save]', m.root).addEventListener('click', save);
    wrap.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  }

  function switchTab() {
    $$('[data-loc]', view).forEach((b) => b.classList.toggle('is-active', b.dataset.loc === location));
    load();
  }

  view.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-loc]');
    if (tab) { location = tab.dataset.loc; return switchTab(); }
    if (e.target.closest('[data-add]')) return openEditor(null);
    const ed = e.target.closest('[data-edit]');
    if (ed) return openEditor(await api(`r/navigation_items/${ed.dataset.edit}`));
    const del = e.target.closest('[data-del]');
    if (del) {
      const it = items.find((x) => x.id === Number(del.dataset.del));
      const hasKids = items.some((x) => x.parent_id === it.id);
      if (!(await confirmDialog(`حذف الرابط "${it.label}"؟${hasKids ? ' سيتم حذف الروابط الفرعية التابعة له أيضًا.' : ''}`, { okText: 'حذف' }))) return;
      try { await api(`r/navigation_items/${it.id}`, { method: 'DELETE' }); toast('تم الحذف'); load(); } catch (err) { toast(err.message, 'error'); }
    }
  });
  view.addEventListener('change', async (e) => {
    const tg = e.target.closest('[data-toggle]');
    if (!tg) return;
    try { await api(`r/navigation_items/${tg.dataset.toggle}`, { method: 'PATCH', body: { is_active: tg.checked } }); toast(tg.checked ? 'تم الإظهار' : 'تم الإخفاء'); load(); } catch (err) { toast(err.message, 'error'); }
  });

  await load();
}
