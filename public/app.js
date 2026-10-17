'use strict';

const $ = (sel) => document.querySelector(sel);
const state = { user: null, files: [], category: '', type: '', editing: null, details: null };

// ---------- أدوات ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: { 'X-Requested-With': 'archive-app' }, credentials: 'same-origin' };
  if (opts.json !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.json);
  } else if (opts.body) init.body = opts.body;
  const res = await fetch('/api' + path, init);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login' && path !== '/me') showLogin();
  if (!res.ok) throw new Error(data.error || 'تعذر الاتصال بالخادم');
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), isError ? 5000 : 3000);
}

const run = (fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (err) {
    toast(err.message, true);
  }
};

function fmtSize(n) {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} ك.ب`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} م.ب`;
  return `${(n / 1024 ** 3).toFixed(2)} غ.ب`;
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
}

// أنواع الملفات: [اسم النوع للتصفية، صنف الأيقونة، الامتدادات]
const TYPES = [
  ['فيديو', 'video', 'mp4 mov m4v avi mkv webm wmv flv mts m2ts 3gp mpg mpeg'],
  ['صور', 'img', 'png jpg jpeg gif webp heic heif bmp tif tiff raw cr2 nef arw dng avif'],
  ['صوت', 'audio', 'mp3 wav m4a aac ogg flac wma opus'],
  ['تصاميم', 'design', 'psd psb ai eps svg fig sketch xd indd idml cdr afdesign afphoto'],
  ['مونتاج', 'montage', 'prproj aep aet drp drt fcpx fcpbundle veg kdenlive mlt pproj aepx mogrt'],
  ['مستندات', 'doc', 'doc docx odt rtf pages'],
  ['جداول', 'sheet', 'xls xlsx csv ods numbers'],
  ['عروض', 'slides', 'ppt pptx odp key'],
  ['PDF', 'pdf', 'pdf'],
  ['ملاحظات', 'note', 'txt md'],
  ['روابط', 'link', 'url'],
  ['مضغوطة', 'archive', 'zip rar 7z tar gz'],
].map(([label, cls, exts]) => ({ label, cls, exts: new Set(exts.split(' ')) }));

const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const typeOf = (f) => TYPES.find((t) => t.exts.has(extOf(f.name))) || null;

const ICON_LABEL = { video: 'فيديو', img: 'صورة', audio: 'صوت', link: 'رابط', note: 'ملاحظة', montage: 'مونتاج' };
function fileType(f) {
  const t = typeOf(f);
  const e = extOf(f.name).toUpperCase().slice(0, 5);
  return [t?.cls || '', ICON_LABEL[t?.cls] || e || 'ملف'];
}

const previewable = (f) => /^(application\/pdf|image\/(png|jpe?g|gif|webp|bmp|avif)|text\/plain|video\/|audio\/)/.test(f.mime);
const isLink = (f) => !!f.url;
const openLink = (f) => window.open(f.url, '_blank', 'noopener');

function icon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = path;
  return svg;
}
const ICONS = {
  download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};

function closeOnClick(dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) dialog.close();
  });
}

// ---------- الدخول ----------

function showLogin() {
  state.user = null;
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
}

function showApp(user) {
  state.user = user;
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#user-btn').textContent = user.displayName;
  $('#admin-tab').hidden = user.role !== 'admin';
  switchView('files');
  loadFiles();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  $('#login-error').textContent = '';
  try {
    const { user } = await api('/login', { method: 'POST', json: Object.fromEntries(fd) });
    e.target.reset();
    showApp(user);
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

$('#user-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('#user-menu').hidden = !$('#user-menu').hidden;
});
document.addEventListener('click', () => ($('#user-menu').hidden = true));

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]');
  if (b) switchView(b.dataset.view);
});

function switchView(view) {
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('active', b.dataset.view === view);
  $('#files-view').hidden = view !== 'files';
  $('#admin-view').hidden = view !== 'admin';
  if (view === 'admin') loadAdmin();
}

// ---------- الملفات والبحث ----------

let searchTimer;
let searchSeq = 0;
async function loadFiles() {
  const seq = ++searchSeq;
  const params = new URLSearchParams();
  const q = $('#search').value.trim();
  if (q) params.set('q', q);
  if (state.category) params.set('category', state.category);
  if ($('#sort').value) params.set('sort', $('#sort').value);
  try {
    const [{ files }, { categories }] = await Promise.all([api('/files?' + params), api('/categories')]);
    if (seq !== searchSeq) return;
    state.files = files;
    renderCategories(categories);
    renderTypes();
    renderFiles();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCategories(categories) {
  const box = $('#categories');
  const chip = (label, value, count) =>
    h('button', { class: 'chip' + (state.category === value ? ' active' : ''), onclick: () => { state.category = value; loadFiles(); } },
      label, count != null ? ` (${count})` : '');
  box.replaceChildren(chip('الكل', ''), ...categories.map((c) => chip(c.category, c.category, c.count)));
  $('#category-options').replaceChildren(...categories.map((c) => h('option', { value: c.category })));
}

function renderTypes() {
  const present = TYPES.filter((t) => state.files.some((f) => typeOf(f) === t));
  if (state.type && !present.some((t) => t.label === state.type)) state.type = '';
  const chip = (label) =>
    h('button', { class: 'chip' + (state.type === label ? ' active' : ''), onclick: () => { state.type = label; renderTypes(); renderFiles(); } }, label || 'كل الأنواع');
  $('#types').replaceChildren(...(present.length > 1 ? [chip(''), ...present.map((t) => chip(t.label))] : []));
}

function renderFiles() {
  const list = $('#file-list');
  const files = state.type ? state.files.filter((f) => typeOf(f)?.label === state.type) : state.files;
  if (!files.length) {
    const searching = $('#search').value.trim() || state.category;
    list.replaceChildren(h('div', { class: 'empty' }, searching ? 'لا توجد ملفات مطابقة للبحث' : 'لا توجد ملفات بعد. اضغط "رفع ملفات" أو اسحب الملفات إلى الصفحة.'));
    return;
  }
  list.replaceChildren(...files.map((f) => {
    const [cls, label] = fileType(f);
    const open = () => (isLink(f) ? openLink(f) : previewable(f) ? openPreview(f) : f.editable ? openEditor(f) : openDetails(f));
    return h('article', { class: 'file' },
      h('div', { class: 'file-icon ' + cls }, label),
      h('div', { class: 'file-main' },
        h('div', { class: 'file-name', onclick: open, role: 'button', tabindex: 0, onkeydown: (e) => e.key === 'Enter' && open() },
          isLink(f) ? f.name.replace(/\.url$/i, '') : f.name),
        isLink(f) && h('div', { class: 'file-link' }, f.url),
        h('div', { class: 'file-meta' },
          f.category && h('span', { class: 'badge' }, f.category),
          f.version > 1 && h('span', {}, `النسخة ${f.version}`),
          !isLink(f) && h('span', {}, fmtSize(f.size)),
          h('span', {}, `${f.updatedBy || ''} · ${fmtDate(f.updatedAt)}`),
          f.tags && f.tags.split('، ').map((t) => h('span', { class: 'tag' }, '#' + t)),
        ),
      ),
      h('div', { class: 'file-actions' },
        isLink(f) && h('button', { class: 'icon-btn', title: 'فتح الرابط', 'aria-label': 'فتح الرابط', onclick: () => openLink(f) }, icon(ICONS.external)),
        previewable(f) && h('button', { class: 'icon-btn', title: 'معاينة', 'aria-label': 'معاينة', onclick: () => openPreview(f) }, icon(ICONS.eye)),
        f.editable && h('button', { class: 'icon-btn', title: 'تعديل', 'aria-label': 'تعديل', onclick: () => openEditor(f) }, icon(ICONS.edit)),
        !isLink(f) && h('a', { class: 'icon-btn', title: 'تنزيل', 'aria-label': 'تنزيل', href: `/api/files/${f.id}/download` }, icon(ICONS.download)),
        h('button', { class: 'icon-btn', title: 'مشاركة', 'aria-label': 'مشاركة', onclick: () => openShare(f) }, icon(ICONS.share)),
        h('button', { class: 'icon-btn', title: 'التفاصيل والنسخ', 'aria-label': 'التفاصيل والنسخ', onclick: () => openDetails(f) }, icon(ICONS.info)),
      ),
    );
  }));
}

$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFiles, 250);
});
$('#sort').addEventListener('change', loadFiles);

// ---------- البحث بالصوت ----------

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;

$('#mic-btn').addEventListener('click', () => {
  if (!Recognition) {
    toast('البحث الصوتي غير مدعوم في هذا المتصفح. استخدم Chrome أو Edge أو Safari.', true);
    return;
  }
  if (recognizer) {
    recognizer.stop();
    return;
  }
  recognizer = new Recognition();
  recognizer.lang = 'ar-SA';
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;
  const status = $('#voice-status');
  const mic = $('#mic-btn');
  mic.classList.add('listening');
  status.hidden = false;
  status.textContent = 'تحدث الآن...';

  recognizer.onresult = (e) => {
    const text = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
    $('#search').value = text;
    status.textContent = `"${text}"`;
    if (e.results[e.results.length - 1].isFinal) loadFiles();
  };
  recognizer.onerror = (e) => {
    const msg = {
      'not-allowed': 'يجب السماح للتطبيق باستخدام الميكروفون',
      'no-speech': 'لم يتم سماع أي كلام، حاول مرة أخرى',
      network: 'البحث الصوتي يحتاج اتصالاً بالإنترنت',
    }[e.error];
    if (msg) toast(msg, true);
  };
  recognizer.onend = () => {
    mic.classList.remove('listening');
    recognizer = null;
    setTimeout(() => (status.hidden = true), 1500);
    if ($('#search').value.trim()) loadFiles();
  };
  recognizer.start();
});

// ---------- الرفع ----------

const uploadDialog = $('#upload-dialog');
const uploadForm = $('#upload-form');
const fileInput = uploadForm.elements.files;

function openUpload(files) {
  uploadForm.reset();
  if (state.category) uploadForm.elements.category.value = state.category;
  if (files) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    fileInput.files = dt.files;
  }
  listUploadNames();
  uploadDialog.showModal();
}

function listUploadNames() {
  $('#upload-names').replaceChildren(...Array.from(fileInput.files).map((f) => h('li', {}, `${f.name} (${fmtSize(f.size)})`)));
}

$('#upload-btn').addEventListener('click', () => openUpload());
fileInput.addEventListener('change', listUploadNames);

uploadForm.addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'ok') return;
  e.preventDefault();
  if (!fileInput.files.length) return toast('اختر ملفاً واحداً على الأقل', true);
  const fd = new FormData(uploadForm);
  const progress = $('#upload-progress');
  const submit = $('#upload-submit');
  progress.hidden = false;
  submit.disabled = true;
  // نستخدم XMLHttpRequest لعرض نسبة التقدم أثناء رفع الملفات الكبيرة
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/files');
  xhr.setRequestHeader('X-Requested-With', 'archive-app');
  const progressText = $('#upload-progress-text');
  progressText.hidden = false;
  progressText.textContent = 'جارٍ الرفع...';
  xhr.upload.onprogress = (ev) => {
    if (!ev.lengthComputable) return;
    progress.value = (ev.loaded / ev.total) * 100;
    progressText.textContent = ev.loaded >= ev.total
      ? 'اكتمل الرفع، جارٍ الحفظ...'
      : `${Math.floor(progress.value)}٪ · ${fmtSize(ev.loaded)} من ${fmtSize(ev.total)} · لا تغلق الصفحة`;
  };
  uploading++;
  xhr.onloadend = () => {
    uploading--;
    progress.hidden = true;
    progressText.hidden = true;
    progress.value = 0;
    submit.disabled = false;
    let data = {};
    try { data = JSON.parse(xhr.responseText); } catch {}
    if (xhr.status === 0) toast('انقطع الاتصال أثناء الرفع، حاول مرة أخرى', true);
    else if (xhr.status === 201) {
      uploadDialog.close();
      toast(`تم رفع ${data.files.length} ملف`);
      loadFiles();
    } else if (xhr.status === 413) toast('الملف أكبر من الحد الذي يسمح به الخادم أو الاستضافة', true);
    else if (xhr.status) toast(data.error || 'فشل الرفع', true);
  };
  xhr.send(fd);
});

// تنبيه قبل إغلاق الصفحة أثناء رفع ملف كبير
let uploading = 0;
window.addEventListener('beforeunload', (e) => {
  if (uploading) e.preventDefault();
});

// السحب والإفلات على الصفحة
let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer?.types?.includes('Files');
document.addEventListener('dragenter', (e) => {
  if (!hasFiles(e) || !state.user) return;
  dragDepth++;
  $('#drop-hint').hidden = false;
});
document.addEventListener('dragleave', () => {
  if (--dragDepth <= 0) { dragDepth = 0; $('#drop-hint').hidden = true; }
});
document.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
document.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  $('#drop-hint').hidden = true;
  if (state.user && !uploadDialog.open) openUpload(e.dataTransfer.files);
  else if (uploadDialog.open) { fileInput.files = e.dataTransfer.files; listUploadNames(); }
});

// ---------- الملاحظات والروابط ----------

const metaFields = () => [
  { name: 'category', label: 'التصنيف', value: state.category, list: 'category-options' },
  { name: 'tags', label: 'الوسوم', placeholder: 'افصل بينها بفاصلة' },
];

$('#note-btn').addEventListener('click', run(async () => {
  const v = await promptForm('ملاحظة جديدة', [
    { name: 'title', label: 'العنوان', required: true },
    { name: 'content', label: 'الملاحظة', type: 'textarea', required: true },
    ...metaFields(),
  ], 'حفظ الملاحظة');
  if (!v) return;
  await api('/notes', { method: 'POST', json: v });
  toast('تم حفظ الملاحظة');
  loadFiles();
}));

$('#link-btn').addEventListener('click', run(async () => {
  const v = await promptForm('إضافة رابط', [
    { name: 'url', label: 'الرابط', required: true, dir: 'ltr', placeholder: 'https://example.com', type: 'text' },
    { name: 'title', label: 'اسم الرابط (اختياري)' },
    { name: 'description', label: 'وصف (اختياري)' },
    ...metaFields(),
  ], 'إضافة');
  if (!v) return;
  await api('/links', { method: 'POST', json: v });
  toast('تمت إضافة الرابط');
  loadFiles();
}));

// ---------- المشاركة (واتساب) ----------

const shareDialog = $('#share-dialog');
closeOnClick(shareDialog);
// إرسال الملف نفسه يتطلب تحميله على الجهاز أولاً، فنحدّه بحجم معقول للجوال
const MAX_DIRECT_SHARE = 200 * 1024 * 1024;
const whatsappUrl = (text) => 'https://wa.me/?text=' + encodeURIComponent(text);
const SHARE_DAYS = [[1, 'يوم واحد'], [7, 'أسبوع'], [30, 'شهر'], [0, 'بدون انتهاء']];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('تم نسخ الرابط');
  } catch {
    prompt('انسخ الرابط:', text);
  }
}

function canShareFiles() {
  try {
    return !!navigator.canShare?.({ files: [new File([''], 'x.txt', { type: 'text/plain' })] });
  } catch {
    return false;
  }
}

function openShare(f) {
  $('#share-title').textContent = 'مشاركة: ' + (isLink(f) ? f.name.replace(/\.url$/i, '') : f.name);
  const body = $('#share-body');
  if (isLink(f)) {
    const text = `${f.name.replace(/\.url$/i, '')}\n${f.url}`;
    body.replaceChildren(h('section', { class: 'share-section' },
      h('p', { class: 'share-url' }, f.url),
      h('div', { class: 'share-row' },
        h('a', { class: 'btn whatsapp', href: whatsappUrl(text), target: '_blank', rel: 'noopener' }, 'إرسال عبر واتساب'),
        h('button', { class: 'btn', onclick: () => copyText(f.url) }, 'نسخ الرابط'),
      ),
    ));
  } else {
    body.replaceChildren(directShareSection(f), linkShareSection(f));
  }
  shareDialog.showModal();
}

// الطريقة الأولى: إرسال الملف نفسه عبر قائمة المشاركة في الجوال (واتساب وغيره)
function directShareSection(f) {
  const section = h('section', { class: 'share-section' }, h('h3', {}, 'إرسال الملف نفسه'));
  if (!canShareFiles()) {
    section.append(h('p', {}, 'هذه الطريقة متاحة من الجوال. من الكمبيوتر استخدم "إرسال رابط تنزيل" بالأسفل.'));
    return section;
  }
  if (f.size > MAX_DIRECT_SHARE) {
    section.append(h('p', {}, `الملف كبير (${fmtSize(f.size)})، فالأفضل إرسال رابط تنزيل بدلاً منه.`));
    return section;
  }
  const status = h('p', {}, 'يُرسل الملف كاملاً، فيستطيع المستلم فتحه مباشرة في واتساب.');
  const btn = h('button', { class: 'btn whatsapp' }, 'تجهيز الملف للإرسال');
  let ready = null;
  // المتصفح يسمح بفتح قائمة المشاركة فقط بعد ضغطة مباشرة، لذلك نجهّز الملف أولاً ثم يضغط المستخدم "إرسال الآن"
  btn.addEventListener('click', run(async () => {
    if (ready) {
      try {
        await navigator.share({ files: [ready], title: f.name });
      } catch (err) {
        if (err.name !== 'AbortError') throw new Error('تعذر فتح قائمة المشاركة');
      }
      return;
    }
    btn.disabled = true;
    status.textContent = 'جارٍ تجهيز الملف...';
    try {
      const res = await fetch(`/api/files/${f.id}/download`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('تعذر تحميل الملف');
      ready = new File([await res.blob()], f.name, { type: f.mime || 'application/octet-stream' });
      if (!navigator.canShare({ files: [ready] })) throw new Error('هذا النوع من الملفات لا يمكن مشاركته من المتصفح، استخدم رابط التنزيل');
      btn.textContent = 'إرسال الآن';
      status.textContent = 'الملف جاهز. اضغط "إرسال الآن" ثم اختر واتساب.';
    } catch (err) {
      ready = null;
      status.textContent = '';
      throw err;
    } finally {
      btn.disabled = false;
    }
  }));
  section.append(status, h('div', { class: 'share-row' }, btn));
  return section;
}

// الطريقة الثانية: رابط تنزيل آمن يُرسل عبر واتساب، يصلح للملفات الكبيرة ولأشخاص من خارج الشركة
function linkShareSection(f) {
  const days = h('select', { 'aria-label': 'مدة صلاحية الرابط' }, SHARE_DAYS.map(([v, l]) => h('option', { value: v, selected: v === 7 }, l)));
  const result = h('div', { class: 'share-row' });
  const list = h('div', { class: 'share-list' });

  const showLink = (share) => {
    const text = `${f.name}\n${share.url}`;
    result.replaceChildren(
      h('a', { class: 'btn whatsapp', href: whatsappUrl(text), target: '_blank', rel: 'noopener' }, 'إرسال عبر واتساب'),
      h('button', { class: 'btn', onclick: () => copyText(share.url) }, 'نسخ الرابط'),
      h('input', { class: 'share-url', value: share.url, readonly: true, onclick: (e) => e.target.select(), 'aria-label': 'رابط المشاركة' }),
    );
  };

  const loadList = run(async () => {
    const { shares } = await api(`/files/${f.id}/shares`);
    list.replaceChildren(...(shares.length ? [h('strong', {}, 'روابط فعالة لهذا الملف')] : []), ...shares.map((s) => h('div', {},
      h('span', {}, `${s.createdBy || ''} · ${s.expiresAt ? 'ينتهي ' + fmtDate(s.expiresAt) : 'بدون انتهاء'} · ${s.downloads} تنزيل`),
      h('button', { class: 'btn small', onclick: () => copyText(s.url) }, 'نسخ'),
      h('button', { class: 'btn small danger', onclick: run(async () => {
        if (!confirm('إيقاف هذا الرابط؟ لن يستطيع أحد التنزيل منه بعد الآن.')) return;
        await api(`/shares/${s.id}`, { method: 'DELETE' });
        toast('تم إيقاف الرابط');
        result.replaceChildren();
        loadList();
      }) }, 'إيقاف'),
    )));
  });

  const create = h('button', { class: 'btn primary', onclick: run(async () => {
    const { share } = await api(`/files/${f.id}/shares`, { method: 'POST', json: { days: Number(days.value) } });
    showLink(share);
    loadList();
  }) }, 'إنشاء رابط');

  loadList();
  return h('section', { class: 'share-section' },
    h('h3', {}, 'إرسال رابط تنزيل'),
    h('p', {}, 'يستطيع أي شخص يملك الرابط تنزيل الملف دون حساب، حتى تنتهي مدته أو توقفه.'),
    h('div', { class: 'share-row' }, h('label', { style: 'display:flex; gap:.4rem; align-items:center' }, 'المدة:', days), create),
    result,
    list,
  );
}

// ---------- التفاصيل والنسخ ----------

const detailsDialog = $('#details-dialog');
closeOnClick(detailsDialog);

const ACTIONS = {
  upload: 'رفع الملف', edit: 'تعديل', new_version: 'رفع نسخة جديدة', restore: 'استرجاع نسخة',
  download: 'تنزيل', rename: 'تعديل البيانات', note: 'إضافة ملاحظة', link: 'إضافة رابط',
  share: 'إنشاء رابط مشاركة', unshare: 'إيقاف رابط مشاركة', share_download: 'تنزيل عبر رابط مشاركة', delete: 'حذف', undelete: 'استرجاع من المحذوفات',
};

function renderActivity(box, rows, withFile = false) {
  if (!rows.length) return box.replaceChildren(h('p', { class: 'muted' }, 'لا يوجد نشاط'));
  box.replaceChildren(...rows.map((a) => h('div', {},
    h('time', {}, fmtDate(a.created_at)),
    h('strong', {}, a.by || '—'),
    h('span', {}, ACTIONS[a.action] || a.action),
    withFile && a.file && h('span', { class: 'tag' }, a.file),
    a.detail && h('span', { class: 'muted' }, a.detail),
  )));
}

async function openDetails(f) {
  state.details = f;
  $('#details-title').textContent = f.name;
  const form = $('#meta-form');
  for (const k of ['name', 'category', 'tags', 'description', 'url']) form.elements[k].value = f[k] || '';
  form.elements.url.closest('label').hidden = !isLink(f);
  await refreshDetails();
  if (!detailsDialog.open) detailsDialog.showModal();
}

async function refreshDetails() {
  const f = state.details;
  const [{ versions, current }, { activity }] = await Promise.all([api(`/files/${f.id}/versions`), api(`/files/${f.id}/activity`)]);
  $('#versions').replaceChildren(...versions.map((v) => h('li', { class: v.version === current ? 'current' : '' },
    h('div', { class: 'v-info' },
      h('strong', {}, `النسخة ${v.version}`),
      v.version === 1 && h('span', { class: 'badge' }, ' الأصلية '),
      v.version === current && h('span', { class: 'badge' }, ' الحالية '),
      h('div', { class: 'muted' }, `${v.note} · ${v.by || ''} · ${fmtDate(v.createdAt)} · ${fmtSize(v.size)}`),
    ),
    h('a', { class: 'btn small', href: `/api/files/${f.id}/download?v=${v.version}` }, 'تنزيل'),
    v.version !== current && h('button', { class: 'btn small', onclick: run(async () => {
      if (!confirm(`سيتم إنشاء نسخة جديدة مطابقة للنسخة ${v.version}. لن تُحذف أي نسخة. متابعة؟`)) return;
      await api(`/files/${f.id}/restore`, { method: 'POST', json: { version: v.version } });
      toast('تم الاسترجاع كنسخة جديدة');
      await reloadDetails();
    }) }, 'استرجاع'),
  )));
  renderActivity($('#file-activity'), activity);
}

async function reloadDetails() {
  const { file } = await api(`/files/${state.details.id}`);
  state.details = file;
  await refreshDetails();
  loadFiles();
}

$('#meta-form').addEventListener('submit', run(async (e) => {
  e.preventDefault();
  const json = Object.fromEntries(new FormData(e.target));
  if (!isLink(state.details)) delete json.url;
  const { file } = await api(`/files/${state.details.id}`, { method: 'PATCH', json });
  state.details = file;
  $('#details-title').textContent = file.name;
  e.target.elements.name.value = file.name;
  toast('تم حفظ البيانات');
  await refreshDetails();
  loadFiles();
}));

$('#delete-btn').addEventListener('click', run(async () => {
  if (!confirm(`حذف "${state.details.name}"؟ يستطيع المدير استرجاعه من المحذوفات.`)) return;
  await api(`/files/${state.details.id}`, { method: 'DELETE' });
  detailsDialog.close();
  toast('تم الحذف');
  loadFiles();
}));

$('#new-version-input').addEventListener('change', run(async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  const { version } = await api(`/files/${state.details.id}/versions`, { method: 'POST', body: fd });
  toast(`تم رفع النسخة ${version}`);
  await reloadDetails();
}));

// ---------- المعاينة ----------

const previewDialog = $('#preview-dialog');
closeOnClick(previewDialog);
previewDialog.addEventListener('close', () => $('#preview-area').replaceChildren());

function openPreview(f) {
  const url = `/api/files/${f.id}/download?inline=1`;
  $('#preview-title').textContent = f.name;
  $('#preview-download').href = `/api/files/${f.id}/download`;
  const area = $('#preview-area');
  if (f.mime.startsWith('image/')) area.replaceChildren(h('img', { class: 'preview-img', src: url, alt: f.name }));
  else if (f.mime.startsWith('video/')) {
    const video = h('video', { class: 'preview-media', src: url, controls: true, autoplay: true, playsinline: true, preload: 'metadata' });
    video.addEventListener('error', () => area.replaceChildren(h('p', { class: 'empty', style: 'margin:1rem' },
      'لا يستطيع المتصفح تشغيل هذا النوع من الفيديو. نزّل الملف لمشاهدته.')));
    area.replaceChildren(video);
  } else if (f.mime.startsWith('audio/')) area.replaceChildren(h('audio', { class: 'preview-audio', src: url, controls: true, autoplay: true }));
  else if (f.mime === 'text/plain') {
    const pre = h('pre', { class: 'preview-text', dir: 'auto' }, 'جارٍ التحميل...');
    area.replaceChildren(pre);
    fetch(url).then((r) => r.text()).then((t) => (pre.textContent = t));
  } else area.replaceChildren(h('iframe', { class: 'preview-frame', src: url, title: f.name }));
  previewDialog.showModal();
}

// ---------- المحرر ----------

const editorDialog = $('#editor-dialog');
const confirmDiscard = () => !isDirty() || confirm('لديك تعديلات غير محفوظة. هل تريد الخروج بدونها؟');
editorDialog.addEventListener('cancel', (e) => {
  if (!confirmDiscard()) e.preventDefault();
});
editorDialog.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]') && confirmDiscard()) editorDialog.close();
});
editorDialog.addEventListener('close', () => (state.editing = null));

function isDirty() {
  const ed = state.editing;
  if (!ed) return false;
  if (ed.kind === 'sheet') return ed.changes.size > 0;
  if (ed.kind === 'text') return $('#editor-area textarea')?.value !== ed.original;
  return $('#editor-area .doc-page')?.innerHTML !== ed.original;
}

async function openEditor(f) {
  const data = await api(`/files/${f.id}/edit`).catch((err) => toast(err.message, true));
  if (!data) return;
  state.editing = { file: f, kind: data.kind, version: data.version, changes: new Map() };
  $('#editor-title').textContent = f.name;
  $('#editor-note').value = '';
  $('#doc-toolbar').hidden = data.kind !== 'docx';
  $('#sheet-tabs').hidden = data.kind !== 'sheet';
  const area = $('#editor-area');

  if (data.kind === 'text') {
    const ta = h('textarea', { dir: 'auto', spellcheck: 'false', 'aria-label': 'محتوى الملف' });
    ta.value = data.content;
    state.editing.original = data.content;
    area.replaceChildren(ta);
  } else if (data.kind === 'docx') {
    const page = h('div', { class: 'doc-page', contenteditable: 'true', dir: 'rtl', 'aria-label': 'محتوى المستند' });
    page.innerHTML = window.DOMPurify.sanitize(data.html || '<p><br></p>', { FORBID_TAGS: ['style', 'form', 'input'] });
    state.editing.original = page.innerHTML;
    area.replaceChildren(page);
  } else {
    state.editing.sheets = data.sheets;
    renderSheetTabs(0);
  }
  editorDialog.showModal();
}

function colName(i) {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

function renderSheetTabs(active) {
  const ed = state.editing;
  $('#sheet-tabs').replaceChildren(...ed.sheets.map((s, i) => h('button', { class: i === active ? 'active' : '', onclick: () => renderSheetTabs(i) }, s.name)));
  const sheet = ed.sheets[active];
  const cols = sheet.rows[0]?.length || 0;
  const table = h('table', { class: 'grid', dir: sheet.rtl ? 'rtl' : 'ltr' },
    h('thead', {}, h('tr', {}, h('th', { class: 'row-h' }), Array.from({ length: cols }, (_, c) => h('th', {}, colName(c))))),
    h('tbody', {}, sheet.rows.map((row, r) => h('tr', {},
      h('th', { class: 'row-h' }, r + 1),
      row.map((cell, c) => {
        const key = `${sheet.name}|${r}|${c}`;
        const isFormula = cell && typeof cell === 'object';
        const shown = ed.changes.has(key) ? ed.changes.get(key) : isFormula ? cell.t : cell;
        const input = h('input', {
          value: shown, dir: 'auto', title: isFormula ? cell.f : null,
          class: (ed.changes.has(key) ? 'changed ' : '') + (isFormula ? 'formula' : ''),
          'aria-label': `${colName(c)}${r + 1}`,
        });
        // عند التركيز على خلية فيها معادلة نعرض المعادلة نفسها لتعديلها
        input.addEventListener('focus', () => { if (isFormula && !ed.changes.has(key)) input.value = cell.f; });
        input.addEventListener('blur', () => { if (isFormula && !ed.changes.has(key)) input.value = cell.t; });
        input.addEventListener('input', () => {
          const original = isFormula ? cell.f : cell;
          if (input.value === original) ed.changes.delete(key);
          else ed.changes.set(key, input.value);
          input.classList.toggle('changed', ed.changes.has(key));
        });
        return h('td', {}, input);
      }),
    ))),
  );
  const box = [table];
  if (sheet.truncated) box.unshift(h('p', { class: 'muted', style: 'padding: 0 1rem' }, 'يتم عرض أول 2000 صف فقط.'));
  $('#editor-area').replaceChildren(...box);
}

$('#doc-toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-cmd]');
  if (!b) return;
  document.execCommand(b.dataset.cmd, false, null);
  $('#editor-area .doc-page')?.focus();
});
$('#doc-toolbar select').addEventListener('change', (e) => {
  document.execCommand('formatBlock', false, e.target.value);
  e.target.value = 'p';
  $('#editor-area .doc-page')?.focus();
});

$('#editor-save').addEventListener('click', run(async () => {
  const ed = state.editing;
  const body = { baseVersion: ed.version, note: $('#editor-note').value.trim() };
  if (ed.kind === 'text') body.content = $('#editor-area textarea').value;
  else if (ed.kind === 'docx') body.html = window.DOMPurify.sanitize($('#editor-area .doc-page').innerHTML);
  else {
    if (!ed.changes.size) return toast('لم تقم بأي تغيير');
    body.changes = Array.from(ed.changes, ([key, v]) => {
      const [sheet, r, c] = key.split('|');
      return { sheet, r: Number(r), c: Number(c), v };
    });
  }
  const btn = $('#editor-save');
  btn.disabled = true;
  try {
    const { version } = await api(`/files/${ed.file.id}/edit`, { method: 'POST', json: body });
    editorDialog.close();
    toast(`تم الحفظ كنسخة ${version}. النسخة الأصلية محفوظة.`);
    loadFiles();
  } finally {
    btn.disabled = false;
  }
}));

// ---------- الإدارة ----------

async function loadAdmin() {
  try {
    const [{ users }, { files }, { activity }] = await Promise.all([api('/users'), api('/admin/trash'), api('/admin/activity')]);
    renderUsers(users);
    $('#trash-list').replaceChildren(...(files.length ? files.map((f) => h('div', { class: 'trash-item' },
      h('span', {}, f.name, h('div', { class: 'muted' }, fmtDate(f.deletedAt))),
      h('button', { class: 'btn small', onclick: run(async () => {
        await api(`/admin/trash/${f.id}/restore`, { method: 'POST' });
        toast('تم استرجاع الملف');
        loadAdmin();
      }) }, 'استرجاع'),
    )) : [h('p', { class: 'muted' }, 'لا توجد ملفات محذوفة')]));
    renderActivity($('#activity-list'), activity, true);
  } catch (err) {
    toast(err.message, true);
  }
}

function renderUsers(users) {
  $('#users-table').replaceChildren(
    h('thead', {}, h('tr', {}, h('th', {}, 'الاسم'), h('th', {}, 'اسم المستخدم'), h('th', {}, 'الصلاحية'), h('th', {}, 'الحالة'), h('th', {}))),
    h('tbody', {}, users.map((u) => h('tr', {},
      h('td', {}, u.displayName),
      h('td', { dir: 'ltr', style: 'text-align: end' }, u.username),
      h('td', {}, u.role === 'admin' ? 'مدير' : 'موظف'),
      h('td', { class: u.active ? '' : 'status-off' }, u.active ? 'فعّال' : 'موقوف'),
      h('td', {}, h('button', { class: 'btn small', onclick: () => editUser(u) }, 'تعديل')),
    ))),
  );
}

const formDialog = $('#form-dialog');

// نافذة نموذج عامة: تعيد القيم عند الضغط على "حفظ"
function promptForm(title, fields, submitLabel = 'حفظ') {
  const form = $('#generic-form');
  form.replaceChildren(
    h('h2', {}, title),
    ...fields.map((f) => f.type === 'checkbox'
      ? h('label', { style: 'display:flex; gap:.5rem; align-items:center' }, h('input', { type: 'checkbox', name: f.name, checked: f.value, style: 'width:auto' }), f.label)
      : f.type === 'select'
        ? h('label', {}, f.label, h('select', { name: f.name }, f.options.map(([v, l]) => h('option', { value: v, selected: v === f.value }, l))))
        : f.type === 'textarea'
          ? h('label', {}, f.label, h('textarea', { name: f.name, rows: 8, required: f.required, dir: 'auto' }))
          : h('label', {}, f.label, h('input', { name: f.name, type: f.type || 'text', value: f.value ?? '', required: f.required, minlength: f.minlength, placeholder: f.placeholder, autocomplete: f.autocomplete || 'off', dir: f.dir, list: f.list }))),
    h('div', { class: 'actions' }, h('button', { class: 'btn', value: 'cancel', formnovalidate: true }, 'إلغاء'), h('button', { class: 'btn primary', value: 'ok' }, submitLabel)),
  );
  formDialog.showModal();
  return new Promise((resolve) => {
    const onSubmit = (e) => {
      if (e.submitter?.value !== 'ok') return;
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      for (const f of fields) if (f.type === 'checkbox') values[f.name] = form.elements[f.name].checked;
      resolve(values);
      formDialog.close();
    };
    form.addEventListener('submit', onSubmit);
    formDialog.addEventListener('close', () => { form.removeEventListener('submit', onSubmit); resolve(null); }, { once: true });
  });
}

$('#add-user-btn').addEventListener('click', run(async () => {
  const v = await promptForm('إضافة موظف', [
    { name: 'displayName', label: 'الاسم الكامل', required: true },
    { name: 'username', label: 'اسم المستخدم (بدون مسافات)', required: true, dir: 'ltr' },
    { name: 'password', label: 'كلمة المرور (8 أحرف على الأقل)', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' },
    { name: 'role', label: 'الصلاحية', type: 'select', value: 'employee', options: [['employee', 'موظف'], ['admin', 'مدير']] },
  ], 'إضافة');
  if (!v) return;
  await api('/users', { method: 'POST', json: v });
  toast('تمت إضافة الموظف');
  loadAdmin();
}));

const editUser = run(async (u) => {
  const v = await promptForm(`تعديل: ${u.displayName}`, [
    { name: 'displayName', label: 'الاسم الكامل', value: u.displayName, required: true },
    { name: 'password', label: 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)', type: 'password', minlength: 8, autocomplete: 'new-password' },
    { name: 'role', label: 'الصلاحية', type: 'select', value: u.role, options: [['employee', 'موظف'], ['admin', 'مدير']] },
    { name: 'active', label: 'الحساب فعّال', type: 'checkbox', value: u.active },
  ]);
  if (!v) return;
  if (!v.password) delete v.password;
  await api(`/users/${u.id}`, { method: 'PATCH', json: v });
  toast('تم حفظ التعديلات');
  loadAdmin();
});

$('#change-pw-btn').addEventListener('click', run(async () => {
  const v = await promptForm('تغيير كلمة المرور', [
    { name: 'current', label: 'كلمة المرور الحالية', type: 'password', required: true, autocomplete: 'current-password' },
    { name: 'password', label: 'كلمة المرور الجديدة (8 أحرف على الأقل)', type: 'password', required: true, minlength: 8, autocomplete: 'new-password' },
  ]);
  if (!v) return;
  await api('/me/password', { method: 'POST', json: v });
  toast('تم تغيير كلمة المرور');
}));

// ---------- PWA ----------

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('#install-btn').hidden = false;
});
$('#install-btn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('#install-btn').hidden = true;
});

const updateOnline = () => ($('#offline').hidden = navigator.onLine);
window.addEventListener('online', () => { updateOnline(); if (state.user) loadFiles(); });
window.addEventListener('offline', updateOnline);
updateOnline();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

// ---------- البدء ----------

api('/me').then(({ user }) => showApp(user)).catch(showLogin);
