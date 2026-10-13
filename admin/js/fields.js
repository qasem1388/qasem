// مكونات الحقول القابلة لإعادة الاستخدام. كل حقل يعيد { el, get, set, setError, destroy }
import { html, el, $, $$, esc, raw, formatDate, modal, toast } from './ui.js';
import { relationOptions, state } from './store.js';
import { openMediaPicker } from './views/media.js';
import { upload } from './api.js';
import { ICONS } from './icons.js';

let uid = 0;
const nextId = () => `fld_${++uid}`;

/** يحول نصًا عربيًا/إنجليزيًا إلى Slug (مطابق لما في الخادم) */
export function slugify(input, latinOnly = false) {
  let s = String(input || '').normalize('NFKC').replace(/[ً-ٰٟـ]/g, '').toLowerCase().trim();
  s = s.replace(/[\s_]+/g, '-');
  s = latinOnly ? s.replace(/[^a-z0-9-]/g, '') : s.replace(/[^\p{L}\p{N}-]/gu, '');
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200);
}

function wrapper(f, id, inner, { noLabelFor = false } = {}) {
  const width = f.width === 'half' ? 'field--half' : f.width === 'third' ? 'field--third' : '';
  const req = f.required || f.requiredOnCreate;
  return el(html`<div class="field ${width}" data-field="${f.name}">
    ${f.type === 'boolean' ? '' : html`<label ${noLabelFor ? '' : raw(`for="${id}"`)} class="${noLabelFor ? 'field__label' : ''}">${f.label}${req ? html` <span class="req">*</span>` : ''}</label>`}
    ${inner}
    ${f.help ? html`<span class="field__help">${f.help}</span>` : ''}
    <span class="field__error" hidden></span>
  </div>`);
}

function baseApi(root, get, set, extra = {}) {
  const err = $('.field__error', root);
  return {
    el: root, get, set,
    setError(msg) {
      root.classList.toggle('has-error', !!msg);
      err.hidden = !msg;
      err.textContent = msg || '';
    },
    destroy() {},
    ...extra,
  };
}

// ===== نص وما شابهه =====
function inputField(f, value, type) {
  const id = nextId();
  const ltr = ['email', 'url', 'tel', 'youtube'].includes(f.type);
  const attrs = raw([
    f.max && type !== 'number' ? `maxlength="${Number(f.max)}"` : '',
    type === 'number' && f.min !== undefined ? `min="${Number(f.min)}"` : '',
    type === 'number' && f.max !== undefined ? `max="${Number(f.max)}"` : '',
    ltr ? 'dir="ltr"' : '',
    f.type === 'password' ? 'autocomplete="new-password"' : '',
  ].join(' '));
  const root = wrapper(f, id, html`<input class="input" id="${id}" name="${f.name}" type="${type}" ${attrs}>`);
  const input = $('input', root);
  const set = (v) => { input.value = v === null || v === undefined ? '' : v; };
  set(value);
  return baseApi(root, () => (type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value), set, { input });
}

function textareaField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<textarea class="input" id="${id}" name="${f.name}" rows="4" ${f.max ? raw(`maxlength="${Number(f.max)}"`) : ''}></textarea>`);
  const ta = $('textarea', root);
  const set = (v) => { ta.value = v ?? ''; };
  set(value);
  return baseApi(root, () => ta.value, set, { input: ta });
}

function readonlyField(f, value, ctx) {
  const id = nextId();
  let display;
  if (f.type === 'datetime') display = formatDate(value, true);
  else if (f.type === 'date') display = formatDate(value);
  else if (f.type === 'select') display = (f.options.find((o) => o.value === value) || {}).label || value;
  else if (f.type === 'privatefile') {
    display = value && ctx.record ? html`<a class="btn btn--sm btn--light" href="/api/admin/private/${ctx.resource.name}/${ctx.record.id}/${f.name}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> عرض الملف</a>
      <a class="btn btn--sm btn--light" href="/api/admin/private/${ctx.resource.name}/${ctx.record.id}/${f.name}?download=1"><i class="fa-solid fa-download"></i> تحميل</a>` : '—';
  } else if (f.type === 'boolean') display = value ? 'نعم' : 'لا';
  else if (f.type === 'email' && value) display = html`<a href="mailto:${value}">${value}</a>`;
  else if (f.type === 'tel' && value) display = html`<a href="tel:${value}" dir="ltr">${value}</a>`;
  else display = value;
  const root = wrapper(f, id, html`<div class="readonly" id="${id}">${display === null || display === undefined || display === '' ? '—' : display}</div>`, { noLabelFor: true });
  if (f.type === 'relation' && value) {
    relationOptions(f.relation.resource).then((opts) => {
      const o = opts.find((x) => x.id === value);
      if (o) $('.readonly', root).textContent = o.label;
    }).catch(() => {});
  }
  return { ...baseApi(root, () => value, () => {}), readonly: true };
}

function booleanField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<label class="switch" for="${id}"><input type="checkbox" id="${id}" name="${f.name}"><span class="switch__track"></span><span>${f.label}</span></label>`);
  const cb = $('input', root);
  const set = (v) => { cb.checked = !!v; };
  set(value);
  return baseApi(root, () => cb.checked, set, { input: cb });
}

function selectField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<select class="input" id="${id}" name="${f.name}">
    ${f.required ? '' : html`<option value="">— اختر —</option>`}
    ${f.options.map((o) => html`<option value="${o.value}">${o.label}</option>`)}</select>`);
  const sel = $('select', root);
  const set = (v) => { sel.value = v ?? (f.required && f.options[0] ? f.options[0].value : ''); };
  set(value);
  return baseApi(root, () => sel.value || null, set, { input: sel });
}

function relationField(f, value, ctx) {
  const id = nextId();
  const root = wrapper(f, id, html`<select class="input" id="${id}" name="${f.name}"><option value="">— ${f.required ? 'اختر' : 'بدون'} —</option></select>`);
  const sel = $('select', root);
  let current = value;
  const ready = relationOptions(f.relation.resource, { fresh: true }).then((opts) => {
    let list = opts;
    const selfId = ctx.record && ctx.resource.name === f.relation.resource ? ctx.record.id : null;
    // ترتيب شجري مع مسافات بادئة للموارد الهرمية
    if (opts.some((o) => o.parent_id !== undefined && o.parent_id !== null)) {
      const kids = new Map();
      for (const o of opts) { const p = o.parent_id || 0; if (!kids.has(p)) kids.set(p, []); kids.get(p).push(o); }
      const out = [];
      const walk = (pid, depth, blocked) => (kids.get(pid) || []).forEach((o) => {
        const isBlocked = blocked || o.id === selfId;
        out.push({ ...o, depth, disabled: isBlocked });
        walk(o.id, depth + 1, isBlocked);
      });
      walk(0, 0, false);
      const seen = new Set(out.map((o) => o.id));
      list = out.concat(opts.filter((o) => !seen.has(o.id)).map((o) => ({ ...o, depth: 0 })));
    }
    if (ctx.resource.name === 'navigation_items' && f.name === 'parent_id') list = list.filter((o) => !o.parent_id);
    for (const o of list) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = `${'— '.repeat(o.depth || 0)}${o.label}${o.location === 'footer' ? ' (الفوتر)' : ''}`;
      if (o.disabled || o.id === selfId) opt.disabled = true;
      sel.appendChild(opt);
    }
    sel.value = current ?? '';
  }).catch(() => {});
  const set = (v) => { current = v; sel.value = v ?? ''; };
  return baseApi(root, () => (sel.value ? Number(sel.value) : null), set, { input: sel, ready });
}

function colorField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<div class="color-field"><input type="color" aria-label="${f.label}"><input class="input" id="${id}" name="${f.name}" maxlength="7" dir="ltr" placeholder="#000000"></div>`);
  const [picker, text] = $$('input', root);
  const set = (v) => { text.value = v || ''; if (/^#[0-9a-f]{6}$/i.test(v || '')) picker.value = v; };
  picker.addEventListener('input', () => { text.value = picker.value; text.dispatchEvent(new Event('input', { bubbles: true })); });
  text.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value; });
  set(value);
  return baseApi(root, () => text.value.trim() || null, set, { input: text });
}

function iconField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<div class="input-group"><span class="icon-preview"><i></i></span><input class="input" id="${id}" name="${f.name}" dir="ltr" placeholder="fa-solid fa-star"><button class="btn btn--light" type="button"><i class="fa-solid fa-icons"></i> اختيار</button></div>`);
  const input = $('input', root);
  const prev = $('.icon-preview i', root);
  const sync = () => { prev.className = /^[a-z0-9 -]+$/.test(input.value) ? input.value : ''; };
  const set = (v) => { input.value = v || ''; sync(); };
  input.addEventListener('input', sync);
  $('button', root).addEventListener('click', () => {
    const grid = el(html`<div><input class="input" placeholder="بحث بالاسم الإنجليزي..." dir="ltr" style="margin-bottom:12px"><div class="icon-grid">${ICONS.map((ic) => html`<button type="button" title="${ic}" data-icon="${ic}"><i class="${ic}"></i></button>`)}</div></div>`);
    const m = modal({ title: 'اختيار أيقونة', size: 'lg', content: grid });
    $('input', grid).addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      $$('[data-icon]', grid).forEach((b) => { b.hidden = q && !b.dataset.icon.includes(q); });
    });
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-icon]');
      if (!b) return;
      set(b.dataset.icon);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      m.close();
    });
  });
  set(value);
  return baseApi(root, () => input.value.trim() || null, set, { input });
}

// ===== الصور والملفات =====
function mediaField(f, value) {
  const id = nextId();
  const kind = f.type === 'image' ? 'image' : 'pdf';
  const root = wrapper(f, id, html`<div class="media-field" id="${id}">
      <div class="media-field__preview"></div>
      <div class="media-field__info"></div>
      <div class="media-field__btns">
        <button class="btn btn--sm" type="button" data-pick><i class="fa-solid fa-folder-open"></i> ${kind === 'image' ? 'اختيار صورة' : 'اختيار ملف'}</button>
        <button class="btn btn--sm btn--light" type="button" data-upload><i class="fa-solid fa-upload"></i> رفع ملف</button>
        <button class="btn btn--sm btn--ghost-danger" type="button" data-clear><i class="fa-solid fa-xmark"></i> إزالة</button>
        <input type="file" hidden accept="${kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}">
      </div></div>`, { noLabelFor: true });
  let current = null;
  const preview = $('.media-field__preview', root);
  const info = $('.media-field__info', root);
  const changed = () => root.dispatchEvent(new Event('input', { bubbles: true }));
  const set = (v) => {
    current = v || null;
    if (!current) { preview.innerHTML = `<i class="fa-regular ${kind === 'image' ? 'fa-image' : 'fa-file-pdf'}"></i>`; info.innerHTML = '<span class="muted">لم يتم الاختيار</span>'; }
    else if (kind === 'image') { preview.innerHTML = String(html`<img src="${current}" alt="">`); info.innerHTML = String(html`<a href="${current}" target="_blank" rel="noopener" dir="ltr">${current.split('/').pop()}</a>`); }
    else { preview.innerHTML = '<i class="fa-solid fa-file-pdf" style="color:#dc2626"></i>'; info.innerHTML = String(html`<a href="${current}" target="_blank" rel="noopener" dir="ltr">${current.split('/').pop()}</a>`); }
    $('[data-clear]', root).hidden = !current;
  };
  $('[data-pick]', root).addEventListener('click', async () => {
    const items = await openMediaPicker({ kind });
    if (items && items[0]) { set(items[0].url); changed(); }
  });
  const fileInput = $('input[type=file]', root);
  $('[data-upload]', root).addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files.length) return;
    const btn = $('[data-upload]', root);
    btn.disabled = true;
    try {
      const items = await upload([fileInput.files[0]], { kind, onProgress: (p) => { btn.textContent = `${p}%`; } });
      set(items[0].url);
      changed();
      toast('تم رفع الملف');
    } catch (e) { toast(e.message, 'error'); }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> رفع ملف';
    fileInput.value = '';
  });
  $('[data-clear]', root).addEventListener('click', () => { set(null); changed(); });
  set(value);
  return baseApi(root, () => current, set);
}

function galleryField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<div class="gallery-field" id="${id}"></div>`, { noLabelFor: true });
  const box = $('.gallery-field', root);
  let items = [];
  const changed = () => root.dispatchEvent(new Event('input', { bubbles: true }));
  const draw = () => {
    box.innerHTML = String(html`${items.map((it, i) => html`<div class="gallery-item" data-i="${i}"><img src="${it.url}" alt=""><input placeholder="وصف الصورة" value="${it.caption || ''}" data-cap="${i}"><button class="icon-btn icon-btn--danger" type="button" data-del="${i}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button></div>`)}
      <button class="gallery-add" type="button" data-add><span><i class="fa-solid fa-plus"></i><br>إضافة صور</span></button>`);
  };
  box.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { items.splice(Number(del.dataset.del), 1); draw(); changed(); return; }
    if (e.target.closest('[data-add]')) {
      const picked = await openMediaPicker({ kind: 'image', multiple: true });
      if (picked && picked.length) { items.push(...picked.map((p) => ({ url: p.url, caption: '' }))); draw(); changed(); }
    }
  });
  box.addEventListener('input', (e) => { if (e.target.dataset.cap !== undefined) items[Number(e.target.dataset.cap)].caption = e.target.value; });
  if (window.Sortable) {
    window.Sortable.create(box, { draggable: '.gallery-item', animation: 150, onEnd: () => {
      items = $$('.gallery-item', box).map((n) => items[Number(n.dataset.i)]);
      draw(); changed();
    } });
  }
  const set = (v) => { items = Array.isArray(v) ? v.map((x) => ({ ...x })) : []; draw(); };
  set(value);
  return baseApi(root, () => items, set);
}

function filesField(f, value) {
  const id = nextId();
  const root = wrapper(f, id, html`<div><div class="files-field" id="${id}"></div><button class="btn btn--sm btn--light" type="button" data-add style="margin-top:8px"><i class="fa-solid fa-plus"></i> إضافة ملفات PDF</button></div>`, { noLabelFor: true });
  const box = $('.files-field', root);
  let items = [];
  const changed = () => root.dispatchEvent(new Event('input', { bubbles: true }));
  const draw = () => {
    box.innerHTML = String(html`${items.map((it, i) => html`<div class="file-row" data-i="${i}"><i class="fa-solid fa-file-pdf"></i><input class="input" value="${it.name || ''}" placeholder="اسم الملف الظاهر" data-name="${i}"><a class="icon-btn" href="${it.url}" target="_blank" rel="noopener" aria-label="عرض"><i class="fa-regular fa-eye"></i></a><button class="icon-btn icon-btn--danger" type="button" data-del="${i}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button></div>`)}`);
  };
  box.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { items.splice(Number(del.dataset.del), 1); draw(); changed(); }
  });
  box.addEventListener('input', (e) => { if (e.target.dataset.name !== undefined) items[Number(e.target.dataset.name)].name = e.target.value; });
  $('[data-add]', root).addEventListener('click', async () => {
    const picked = await openMediaPicker({ kind: 'pdf', multiple: true });
    if (picked && picked.length) {
      items.push(...picked.map((p) => ({ url: p.url, name: (p.original_name || '').replace(/\.pdf$/i, '') })));
      draw(); changed();
    }
  });
  if (window.Sortable) {
    window.Sortable.create(box, { handle: '.fa-file-pdf', animation: 150, onEnd: () => {
      items = $$('.file-row', box).map((n) => items[Number(n.dataset.i)]);
      draw(); changed();
    } });
  }
  const set = (v) => { items = Array.isArray(v) ? v.map((x) => ({ ...x })) : []; draw(); };
  set(value);
  return baseApi(root, () => items, set);
}

function slugField(f, value, ctx) {
  const id = nextId();
  const prefix = ctx.resource.preview ? ctx.resource.preview.replace('{slug}', '') : '';
  const root = wrapper(f, id, html`<div class="input-group">${prefix ? html`<span class="input-prefix">${prefix}</span>` : ''}<input class="input" id="${id}" name="${f.name}" maxlength="200" ${f.latinOnly ? raw('dir="ltr"') : ''}></div>`);
  const input = $('input', root);
  let manual = !!value;
  input.addEventListener('input', () => { manual = input.value.trim() !== ''; });
  input.addEventListener('blur', () => { input.value = slugify(input.value, f.latinOnly); });
  const set = (v) => { input.value = v || ''; };
  set(value);
  return baseApi(root, () => slugify(input.value, f.latinOnly), set, {
    input,
    follow(sourceValue) { if (!manual) input.value = slugify(sourceValue, f.latinOnly); },
  });
}

function youtubeField(f, value) {
  const api = inputField(f, value, 'url');
  const prev = el('<img class="yt-preview" alt="" hidden>');
  api.input.after(prev);
  const sync = () => {
    const m = String(api.input.value).match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
    prev.hidden = !m;
    if (m) prev.src = `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  };
  api.input.addEventListener('input', sync);
  api.input.placeholder = 'https://www.youtube.com/watch?v=...';
  sync();
  return api;
}

function permissionsField(f, value) {
  const id = nextId();
  const { modules } = state.meta;
  const root = wrapper(f, id, html`<div class="perm-grid" id="${id}">
    <div class="perm-row perm-row--head"><span>الوحدة</span><label><input type="checkbox" data-all="view"> عرض</label><label><input type="checkbox" data-all="manage"> إدارة</label></div>
    ${Object.entries(modules).map(([k, label]) => html`<div class="perm-row"><span>${label}</span>
      <label><input type="checkbox" value="${k}.view"> عرض</label>
      ${k === 'audit' ? html`<span></span>` : html`<label><input type="checkbox" value="${k}.manage"> إدارة</label>`}</div>`)}
  </div>`, { noLabelFor: true });
  const boxes = () => $$('input[value]', root);
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.all) boxes().filter((b) => b.value.endsWith('.' + t.dataset.all)).forEach((b) => { b.checked = t.checked; });
    if (t.value && t.value.endsWith('.manage') && t.checked) { const v = root.querySelector(`input[value="${t.value.replace('.manage', '.view')}"]`); if (v) v.checked = true; }
  });
  const set = (v) => { const s = new Set(v || []); boxes().forEach((b) => { b.checked = s.has(b.value); }); };
  set(value);
  return baseApi(root, () => boxes().filter((b) => b.checked).map((b) => b.value), set);
}

// ===== محرر النصوص =====
let editorSeq = 0;
function richtextField(f, value) {
  const id = `rte_${++editorSeq}`;
  const root = wrapper(f, id, html`<textarea id="${id}" name="${f.name}" class="input"></textarea>`);
  const ta = $('textarea', root);
  ta.value = value || '';
  let editor = null;
  let pending = value || '';
  const init = () => {
    if (!window.tinymce) return setTimeout(init, 100);
    window.tinymce.init({
      target: ta,
      license_key: 'gpl',
      language: 'ar',
      language_url: '/vendor/tinymce-langs/ar.js',
      directionality: 'rtl',
      height: 460,
      menubar: 'edit insert format table view',
      branding: false,
      promotion: false,
      convert_urls: false,
      relative_urls: false,
      plugins: 'lists advlist link image media table code fullscreen autolink charmap searchreplace visualblocks wordcount directionality preview',
      toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignright aligncenter alignleft alignjustify | bullist numlist outdent indent | link image media insertpdf table | hr blockquote | rtl ltr | removeformat code fullscreen',
      toolbar_mode: 'sliding',
      block_formats: 'فقرة=p; عنوان 2=h2; عنوان 3=h3; عنوان 4=h4; اقتباس=blockquote',
      content_style: "body{font-family:Tajawal,Tahoma,sans-serif;font-size:16px;line-height:1.8} img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:6px} blockquote{border-inline-start:4px solid #c99a2e;margin:1em 0;padding:8px 16px;background:#fdf8ec}",
      content_css: false,
      image_caption: true,
      image_advtab: true,
      media_live_embeds: true,
      link_default_target: '_blank',
      file_picker_types: 'file image',
      file_picker_callback: async (cb, _val, meta) => {
        const items = await openMediaPicker({ kind: meta.filetype === 'image' ? 'image' : undefined });
        if (items && items[0]) cb(items[0].url, { title: items[0].original_name, alt: items[0].alt || '', text: items[0].original_name });
      },
      images_upload_handler: async (blobInfo) => {
        const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
        const items = await upload([file], { kind: 'image' });
        return items[0].url;
      },
      setup(ed) {
        ed.ui.registry.addButton('insertpdf', {
          icon: 'document-properties', tooltip: 'إدراج ملف PDF',
          onAction: async () => {
            const items = await openMediaPicker({ kind: 'pdf', multiple: true });
            (items || []).forEach((it) => ed.insertContent(`<p><a class="file-link" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.original_name)}</a></p>`));
          },
        });
        ed.on('init', () => { editor = ed; ed.setContent(pending); });
        ed.on('change input undo redo', () => root.dispatchEvent(new Event('input', { bubbles: true })));
      },
    });
  };
  // التهيئة بعد إضافة الحقل إلى الصفحة
  requestAnimationFrame(init);
  const set = (v) => { pending = v || ''; if (editor) editor.setContent(pending); else ta.value = pending; };
  return baseApi(root, () => (editor ? editor.getContent() : ta.value), set, {
    destroy() { if (editor) { editor.remove(); editor = null; } },
  });
}

/** إنشاء الحقل المناسب حسب نوعه */
export function createField(f, value, ctx) {
  if (f.readonly) return readonlyField(f, value, ctx);
  switch (f.type) {
    case 'textarea': return textareaField(f, value);
    case 'richtext': return richtextField(f, value);
    case 'number': return inputField(f, value, 'number');
    case 'email': return inputField(f, value, 'email');
    case 'tel': return inputField(f, value, 'tel');
    case 'url': return inputField(f, value, 'text');
    case 'date': return inputField(f, value, 'date');
    case 'password': return inputField(f, '', 'password');
    case 'boolean': return booleanField(f, value);
    case 'select': return selectField(f, value);
    case 'relation': return relationField(f, value, ctx);
    case 'color': return colorField(f, value);
    case 'icon': return iconField(f, value);
    case 'image': case 'file': return mediaField(f, value);
    case 'images': return galleryField(f, value);
    case 'files': return filesField(f, value);
    case 'slug': return slugField(f, value, ctx);
    case 'youtube': return youtubeField(f, value);
    case 'permissions': return permissionsField(f, value);
    case 'datetime': case 'privatefile': return readonlyField(f, value, ctx);
    default: return inputField(f, value, 'text');
  }
}
