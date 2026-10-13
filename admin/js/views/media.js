// مكتبة الملفات: صفحة الإدارة + نافذة الاختيار المستخدمة في الحقول والمحرر
import { api, upload } from '../api.js';
import { html, el, $, $$, modal, toast, confirmDialog, formatDate, formatSize, debounce, loading, setTitle } from '../ui.js';
import { state } from '../store.js';

const ACCEPT = { image: 'image/jpeg,image/png,image/webp', pdf: 'application/pdf', all: 'image/jpeg,image/png,image/webp,application/pdf' };

/**
 * مكون شبكة الملفات (يُستخدم في الصفحة وفي نافذة الاختيار)
 * @param {{kind?: 'image'|'pdf', selectable?: boolean, multiple?: boolean, onOpen?: Function, onSelectionChange?: Function}} opts
 */
function mediaBrowser(opts) {
  const limits = state.meta.limits;
  const fixedKind = opts.kind || '';
  const root = el(html`<div>
    <div class="toolbar">
      <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="بحث باسم الملف..." aria-label="بحث"></div>
      ${fixedKind ? '' : html`<select aria-label="نوع الملف"><option value="">كل الأنواع</option><option value="image">الصور</option><option value="pdf">ملفات PDF</option></select>`}
    </div>
    <label class="dropzone" tabindex="0">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <strong>اسحب الملفات هنا أو اضغط للاختيار</strong>
      <div class="small">${fixedKind === 'pdf' ? `PDF حتى ${limits.pdfMB} م.ب` : fixedKind === 'image' ? `JPG, PNG, WEBP حتى ${limits.imageMB} م.ب` : `الصور (JPG, PNG, WEBP) حتى ${limits.imageMB} م.ب — PDF حتى ${limits.pdfMB} م.ب`}</div>
      <input type="file" hidden multiple accept="${ACCEPT[fixedKind || 'all']}">
    </label>
    <div class="media-grid"></div>
    <div class="pager"><span data-count></span><button class="btn btn--light btn--sm" type="button" data-more hidden>تحميل المزيد</button></div>
  </div>`);
  const grid = $('.media-grid', root);
  const search = $('input[type=search]', root);
  const kindSel = $('select', root);
  const fileInput = $('input[type=file]', root);
  const drop = $('.dropzone', root);
  let page = 1;
  let items = [];
  const selected = new Map();

  const tile = (m) => html`<button type="button" class="media-tile${selected.has(m.id) ? ' is-selected' : ''}" data-id="${m.id}" title="${m.original_name}">
      <span class="media-tile__thumb">${m.kind === 'image' ? html`<img src="${m.url}" alt="${m.alt || ''}" loading="lazy">` : html`<i class="fa-solid fa-file-pdf"></i>`}</span>
      <span class="media-tile__name">${m.original_name}</span>
      <span class="media-tile__meta">${formatSize(m.size)}</span></button>`;

  async function load(reset = false) {
    if (reset) { page = 1; items = []; loading(grid); }
    const res = await api('media', { query: { kind: fixedKind || (kindSel && kindSel.value), q: search.value.trim(), page, per_page: 40 } });
    items = items.concat(res.items);
    grid.innerHTML = items.length ? String(html`${items.map(tile)}`) : '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i>لا توجد ملفات</div>';
    $('[data-count]', root).textContent = `${res.total} ملف`;
    $('[data-more]', root).hidden = items.length >= res.total;
  }
  $('[data-more]', root).addEventListener('click', () => { page += 1; load(); });
  search.addEventListener('input', debounce(() => load(true), 350));
  if (kindSel) kindSel.addEventListener('change', () => load(true));

  async function doUpload(files) {
    if (!files.length) return;
    const label = $('strong', drop);
    const old = label.textContent;
    try {
      const up = await upload(files, { kind: fixedKind || undefined, onProgress: (p) => { label.textContent = `جارٍ الرفع... ${p}%`; } });
      toast(`تم رفع ${up.length} ملف`);
      await load(true);
      if (opts.selectable) {
        if (!opts.multiple) selected.clear();
        up.forEach((m) => selected.set(m.id, m));
        $$('.media-tile', grid).forEach((t) => t.classList.toggle('is-selected', selected.has(Number(t.dataset.id))));
        if (opts.onSelectionChange) opts.onSelectionChange([...selected.values()]);
      }
    } catch (e) { toast(e.message, 'error'); }
    label.textContent = old;
    fileInput.value = '';
  }
  fileInput.addEventListener('change', () => doUpload([...fileInput.files]));
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => doUpload([...e.dataTransfer.files]));

  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.media-tile');
    if (!t) return;
    const m = items.find((x) => x.id === Number(t.dataset.id));
    if (opts.selectable) {
      if (!opts.multiple) { selected.clear(); $$('.media-tile', grid).forEach((x) => x.classList.remove('is-selected')); }
      if (selected.has(m.id)) selected.delete(m.id); else selected.set(m.id, m);
      t.classList.toggle('is-selected', selected.has(m.id));
      if (opts.onSelectionChange) opts.onSelectionChange([...selected.values()]);
    } else if (opts.onOpen) opts.onOpen(m, () => load(true));
  });
  grid.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.media-tile');
    if (t && opts.selectable && opts.onConfirm) opts.onConfirm();
  });

  load(true).catch((e) => toast(e.message, 'error'));
  return { root, selected: () => [...selected.values()], reload: () => load(true) };
}

/** فتح نافذة اختيار الملفات. تعيد Promise بقائمة الملفات المختارة أو null */
export function openMediaPicker({ kind, multiple = false } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const footer = el(html`<div style="display:contents"><span class="muted small" data-sel style="margin-inline-end:auto">لم يتم اختيار ملف</span><button class="btn btn--light" type="button" data-cancel>إلغاء</button><button class="btn" type="button" data-ok disabled><i class="fa-solid fa-check"></i> اختيار</button></div>`);
    const confirmSel = () => { result = browser.selected(); m.close(); };
    const browser = mediaBrowser({
      kind, selectable: true, multiple,
      onSelectionChange(sel) {
        $('[data-ok]', footer).disabled = !sel.length;
        $('[data-sel]', footer).textContent = sel.length ? `تم اختيار ${sel.length}` : 'لم يتم اختيار ملف';
      },
      onConfirm: confirmSel,
    });
    const m = modal({ title: kind === 'image' ? 'اختيار صورة' : kind === 'pdf' ? 'اختيار ملف PDF' : 'مكتبة الملفات', size: 'lg', content: browser.root, footer, onClose: () => resolve(result) });
    $('[data-cancel]', m.root).addEventListener('click', m.close);
    $('[data-ok]', m.root).addEventListener('click', confirmSel);
  });
}

/** صفحة إدارة الملفات */
export async function renderMediaManager(view) {
  setTitle('مكتبة الملفات');
  const canManage = state.meta.can.filesManage;
  view.innerHTML = String(html`<div class="page-head"><h1><i class="fa-solid fa-folder-open"></i> مكتبة الملفات</h1></div>
    <div class="help"><i class="fa-solid fa-circle-info"></i><span>الأنواع المسموحة: JPG, JPEG, PNG, WEBP, PDF. اضغط على أي ملف لعرض تفاصيله ونسخ رابطه أو حذفه.</span></div>
    <div class="panel" data-browser></div>`);
  const browser = mediaBrowser({
    onOpen(m, reload) {
      const content = el(html`<div class="media-detail">
        <div class="media-detail__preview">${m.kind === 'image' ? html`<img src="${m.url}" alt="">` : html`<i class="fa-solid fa-file-pdf" style="font-size:4rem;color:#dc2626"></i>`}</div>
        <div>
          <dl class="kv"><dt>الاسم</dt><dd>${m.original_name}</dd><dt>النوع</dt><dd>${m.mime_type}</dd><dt>الحجم</dt><dd>${formatSize(m.size)}</dd><dt>تاريخ الرفع</dt><dd>${formatDate(m.created_at, true)}</dd></dl>
          <div class="field" style="margin-top:14px"><label>الرابط</label><div class="input-group"><input class="input" value="${m.url}" readonly dir="ltr"><button class="btn btn--light" type="button" data-copy><i class="fa-regular fa-copy"></i> نسخ</button></div></div>
          ${m.kind === 'image' ? html`<div class="field" style="margin-top:10px"><label>النص البديل (Alt)</label><div class="input-group"><input class="input" value="${m.alt || ''}" data-alt maxlength="255"><button class="btn btn--light" type="button" data-save-alt>حفظ</button></div></div>` : ''}
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><a class="btn btn--light" href="${m.url}" target="_blank" rel="noopener"><i class="fa-regular fa-eye"></i> عرض</a>
          ${canManage ? html`<button class="btn btn--ghost-danger" type="button" data-del><i class="fa-solid fa-trash"></i> حذف الملف</button>` : ''}</div>
        </div></div>`);
      const md = modal({ title: 'تفاصيل الملف', size: 'lg', content });
      $('[data-copy]', content).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(location.origin + m.url); toast('تم نسخ الرابط'); } catch { toast('تعذر النسخ', 'error'); }
      });
      const saveAlt = $('[data-save-alt]', content);
      if (saveAlt) saveAlt.addEventListener('click', async () => {
        try { await api(`media/${m.id}`, { method: 'PUT', body: { alt: $('[data-alt]', content).value } }); toast('تم الحفظ'); reload(); } catch (e) { toast(e.message, 'error'); }
      });
      const del = $('[data-del]', content);
      if (del) del.addEventListener('click', async () => {
        if (!(await confirmDialog('سيتم حذف الملف نهائيًا. إذا كان مستخدمًا في أي صفحة فلن يظهر بعد الآن. هل أنت متأكد؟', { okText: 'حذف' }))) return;
        try { await api(`media/${m.id}`, { method: 'DELETE' }); toast('تم حذف الملف'); md.close(); reload(); } catch (e) { toast(e.message, 'error'); }
      });
    },
  });
  $('[data-browser]', view).appendChild(browser.root);
}
