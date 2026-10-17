'use strict';

const $ = (sel) => document.querySelector(sel);
const state = {
  user: null,
  files: [],
  folders: [],
  folderId: null, // المجلد المفتوح حالياً (null = الرئيسية)
  filters: { type: '', uploader: '', category: '', expiry: '' },
  layout: 'list',
  selected: new Set(),
  types: [],
  features: {},
  editing: null,
  details: null,
};

try {
  state.layout = localStorage.getItem('layout') === 'grid' ? 'grid' : 'list';
} catch {}

// ---------- أدوات ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('--')) el.style.setProperty(k, v);
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
  toastTimer = setTimeout(() => (t.hidden = true), isError ? 6000 : 3500);
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
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
}

const fmtDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString('ar', { dateStyle: 'medium', numberingSystem: 'latn' });

function fmtTime(sec) {
  const s = Math.floor(sec);
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(hh ? 2 : 1, '0');
  return `${hh ? hh + ':' : ''}${mm}:${String(s % 60).padStart(2, '0')}`;
}

// نوع الملف ولونه يأتيان من الخادم حتى تبقى الألوان موحدة في كل مكان
const typeInfo = (key) => state.types.find((t) => t.key === key) || { key: 'other', label: 'ملف', color: '#6b7a75' };
const extOf = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const ICON_LABEL = { video: 'فيديو', image: 'صورة', audio: 'صوت', link: 'رابط', note: 'ملاحظة', montage: 'مونتاج' };
const iconLabel = (f) => ICON_LABEL[f.type] || extOf(f.name).toUpperCase().slice(0, 5) || 'ملف';

const previewable = (f) => /^(application\/pdf|image\/(png|jpe?g|gif|webp|bmp|avif)|text\/plain|video\/|audio\/)/.test(f.mime);
const isLink = (f) => !!f.url;
const openLink = (f) => window.open(f.url, '_blank', 'noopener');
const displayName = (f) => (isLink(f) ? f.name.replace(/\.url$/i, '') : f.name);

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
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};

// مثل replaceChildren لكنه يتجاهل القيم الفارغة (null/false) بدل كتابتها كنص
function fill(el, ...children) {
  el.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
}

function closeOnClick(dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) dialog.close();
  });
}

// تلميح يظهر عند المرور على أعمدة الإحصائيات
function attachTooltip(el, text) {
  const tip = $('#tooltip');
  el.addEventListener('pointerenter', () => {
    tip.textContent = text;
    tip.hidden = false;
  });
  el.addEventListener('pointermove', (e) => {
    tip.style.left = `${Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${e.clientY - 34}px`;
  });
  el.addEventListener('pointerleave', () => (tip.hidden = true));
}

// ---------- الدخول ----------

function showLogin() {
  state.user = null;
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
}

async function showApp(user) {
  state.user = user;
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#user-btn').textContent = user.displayName;
  $('#admin-tab').hidden = user.role !== 'admin';
  try {
    const meta = await api('/meta');
    state.types = meta.types;
    state.features = meta.features;
  } catch {}
  $('#ai-hint').hidden = !state.features.ai;
  switchView('files');
  await loadFiles();
  openDeepLink();
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

// ---------- الملفات والمجلدات والبحث والتصفية ----------

const searchText = () => $('#search').value.trim();
const hasFilters = () => Object.values(state.filters).some(Boolean);
// بدون بحث أو تصفية نتصفح المجلد الحالي؛ ومع البحث نبحث في كل المجلدات
const isBrowsing = () => !searchText() && !hasFilters();

let searchTimer;
let searchSeq = 0;
async function loadFiles() {
  const seq = ++searchSeq;
  const params = new URLSearchParams();
  const q = searchText();
  if (q) params.set('q', q);
  for (const [k, v] of Object.entries(state.filters)) if (v) params.set(k, v);
  if ($('#sort').value) params.set('sort', $('#sort').value);
  if (isBrowsing()) params.set('folder', state.folderId ?? 'root');
  try {
    const [{ files }, { folders }, { categories }, { uploaders }, { files: expiring }] = await Promise.all([
      api('/files?' + params),
      api('/folders'),
      api('/categories'),
      api('/uploaders'),
      api('/expiring'),
    ]);
    if (seq !== searchSeq) return;
    state.files = files;
    state.folders = folders;
    if (state.folderId != null && !folders.some((f) => f.id === state.folderId)) state.folderId = null;
    const ids = new Set(files.map((f) => f.id));
    for (const id of state.selected) if (!ids.has(id)) state.selected.delete(id);
    renderFilters(categories, uploaders);
    renderTypes();
    renderExpiry(expiring);
    renderBreadcrumb();
    renderFolders();
    renderFiles();
  } catch (err) {
    toast(err.message, true);
  }
}

function fillSelect(select, first, options) {
  const current = select.value;
  select.replaceChildren(h('option', { value: '' }, first), ...options.map(([v, l]) => h('option', { value: v }, l)));
  select.value = options.some(([v]) => String(v) === current) ? current : '';
}

function renderFilters(categories, uploaders) {
  fillSelect($('#f-uploader'), 'كل الموظفين', uploaders.map((u) => [u.id, `${u.name} (${u.count})`]));
  fillSelect($('#f-category'), 'كل التصنيفات', categories.map((c) => [c.category, `${c.category} (${c.count})`]));
  $('#category-options').replaceChildren(...categories.map((c) => h('option', { value: c.category })));
  for (const [id, key] of [['#f-uploader', 'uploader'], ['#f-category', 'category'], ['#f-expiry', 'expiry']]) {
    $(id).value = state.filters[key];
    $(id).classList.toggle('active', !!state.filters[key]);
  }
  $('#clear-filters').hidden = !hasFilters();
  for (const b of document.querySelectorAll('.view-toggle button')) b.classList.toggle('active', b.dataset.layout === state.layout);
}

function renderTypes() {
  const chip = (t) => h('button', {
    class: 'chip' + (state.filters.type === t.key ? ' active' : ''),
    '--type-color': t.color,
    'aria-pressed': String(state.filters.type === t.key),
    onclick: () => setFilter('type', state.filters.type === t.key ? '' : t.key),
  }, h('span', { class: 'dot' }), t.label);
  $('#types').replaceChildren(...state.types.filter((t) => t.key !== 'other').map(chip));
}

function setFilter(key, value) {
  state.filters[key] = value;
  loadFiles();
}

for (const [id, key] of [['#f-uploader', 'uploader'], ['#f-category', 'category'], ['#f-expiry', 'expiry']]) {
  $(id).addEventListener('change', (e) => setFilter(key, e.target.value));
}
$('#clear-filters').addEventListener('click', () => {
  state.filters = { type: '', uploader: '', category: '', expiry: '' };
  loadFiles();
});
$('#sort').addEventListener('change', loadFiles);
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFiles, 250);
});
document.querySelector('.view-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-layout]');
  if (!b) return;
  state.layout = b.dataset.layout;
  try {
    localStorage.setItem('layout', state.layout);
  } catch {}
  renderFilters([], []);
  loadFiles();
});

function renderExpiry(files) {
  const expired = files.filter((f) => f.expiry === 'expired').length;
  const soon = files.length - expired;
  $('#alerts-btn').hidden = !files.length;
  $('#alerts-count').textContent = files.length;
  const banner = $('#expiry-banner');
  banner.hidden = !files.length || state.filters.expiry !== '';
  if (!files.length) return;
  fill(banner,
    h('span', {}, '⚠️'),
    h('span', {}, [expired && `${expired} مستند منتهي الصلاحية`, soon && `${soon} تنتهي صلاحيتها قريباً`].filter(Boolean).join(' · ')),
    expired ? h('button', { class: 'btn small', onclick: () => setFilter('expiry', 'expired') }, 'عرض المنتهية') : null,
    soon ? h('button', { class: 'btn small', onclick: () => setFilter('expiry', 'soon') }, 'عرض القريبة') : null,
  );
}
$('#alerts-btn').addEventListener('click', () => {
  switchView('files');
  state.filters.expiry = 'soon';
  loadFiles().then(() => !state.files.length && setFilter('expiry', 'expired'));
});

// ---------- المجلدات ----------

const folderById = (id) => state.folders.find((f) => f.id === id);
const childFolders = (id) => state.folders.filter((f) => f.parentId === id);

function folderPathOf(id) {
  const path = [];
  for (let f = folderById(id), i = 0; f && i < 50; f = folderById(f.parentId), i++) path.unshift(f);
  return path;
}

function openFolder(id) {
  state.folderId = id;
  state.selected.clear();
  $('#search').value = '';
  state.filters = { type: '', uploader: '', category: '', expiry: '' };
  loadFiles();
}

function renderBreadcrumb() {
  const nav = $('#breadcrumb');
  if (!isBrowsing()) {
    nav.replaceChildren(h('span', { class: 'muted' }, `${state.files.length} نتيجة في كل المجلدات`));
    return;
  }
  const path = folderPathOf(state.folderId);
  const items = [h('button', { onclick: () => openFolder(null), 'aria-current': state.folderId == null ? 'page' : null }, 'الرئيسية')];
  for (const f of path) {
    items.push(h('span', { class: 'sep' }, '›'));
    items.push(h('button', { onclick: () => openFolder(f.id), 'aria-current': f.id === state.folderId ? 'page' : null },
      f.restricted ? icon(ICONS.lock) : null, f.name));
  }
  const current = folderById(state.folderId);
  const tools = h('span', { class: 'folder-tools' },
    current && canManageFolder(current) && h('button', { class: 'btn small', onclick: () => folderSettings(current) }, icon(ICONS.settings), 'إعدادات المجلد'),
  );
  nav.replaceChildren(...items, tools);
}

function renderFolders() {
  const box = $('#folder-list');
  if (!isBrowsing()) return box.replaceChildren();
  box.replaceChildren(...childFolders(state.folderId).map((f) => {
    const subs = childFolders(f.id).length;
    return h('button', { class: 'folder-card', onclick: () => openFolder(f.id) },
      icon(ICONS.folder),
      h('span', {},
        h('div', { class: 'fname' }, f.name, f.restricted ? ' 🔒' : ''),
        h('div', { class: 'fmeta' }, [`${f.fileCount} ملف`, subs && `${subs} مجلد`].filter(Boolean).join(' · ')),
      ),
    );
  }));
}

const canManageFolder = (f) => state.user.role === 'admin' || f.createdBy === state.user.id;

// قائمة المجلدات بشكل شجري لاختيار مجلد
function folderOptions() {
  const out = [['', 'الرئيسية']];
  const walk = (parentId, depth) => {
    for (const f of childFolders(parentId)) {
      out.push([String(f.id), `${'— '.repeat(depth + 1)}${f.name}${f.restricted ? ' 🔒' : ''}`]);
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function fillFolderSelect(select, value) {
  select.replaceChildren(...folderOptions().map(([v, l]) => h('option', { value: v }, l)));
  select.value = value == null ? '' : String(value);
}

let userNames = null;
async function memberFields(folder) {
  if (state.user.role !== 'admin') return [];
  userNames = userNames || (await api('/users/names')).users;
  return [
    { name: 'restricted', label: 'مجلد خاص: لا يراه إلا المدير والأشخاص المحددون', type: 'checkbox', value: !!folder?.restricted },
    { name: 'members', label: 'من يرى هذا المجلد الخاص', type: 'checklist', value: folder?.members || [], options: userNames.filter((u) => u.id !== state.user.id).map((u) => [u.id, u.name]) },
  ];
}

$('#folder-btn').addEventListener('click', run(async () => {
  const parent = folderById(state.folderId);
  const v = await promptForm(parent ? `مجلد جديد داخل "${parent.name}"` : 'مجلد جديد', [
    { name: 'name', label: 'اسم المجلد', required: true, placeholder: 'مثال: حملة رمضان 2026' },
    ...(await memberFields(null)),
  ], 'إنشاء');
  if (!v) return;
  const { folder } = await api('/folders', { method: 'POST', json: { name: v.name, parentId: state.folderId, restricted: v.restricted } });
  if (v.restricted) await api(`/folders/${folder.id}`, { method: 'PATCH', json: { members: v.members } });
  toast('تم إنشاء المجلد');
  openFolder(folder.id);
}));

const folderSettings = run(async (f) => {
  const fields = [
    { name: 'name', label: 'اسم المجلد', value: f.name, required: true },
    { name: 'parentId', label: 'داخل المجلد', type: 'select', value: f.parentId == null ? '' : String(f.parentId), options: folderOptions().filter(([id]) => id !== String(f.id)) },
    ...(await memberFields(f)),
  ];
  const v = await promptForm(`إعدادات المجلد: ${f.name}`, fields, 'حفظ', [
    { label: 'حذف المجلد', class: 'danger', value: 'delete' },
  ]);
  if (!v) return;
  if (v.__action === 'delete') {
    if (!confirm(`حذف المجلد "${f.name}"؟ يجب أن يكون فارغاً.`)) return;
    await api(`/folders/${f.id}`, { method: 'DELETE' });
    toast('تم حذف المجلد');
    return openFolder(f.parentId);
  }
  const json = { name: v.name, parentId: v.parentId || null };
  if (state.user.role === 'admin') Object.assign(json, { restricted: v.restricted, members: v.members });
  await api(`/folders/${f.id}`, { method: 'PATCH', json });
  toast('تم حفظ المجلد');
  loadFiles();
});

// ---------- عرض الملفات ----------

function expiryBadge(f) {
  if (!f.expiry || f.expiry === 'ok') return null;
  if (f.expiry === 'expired') return h('span', { class: 'badge expired' }, `منتهي منذ ${-f.daysLeft} يوم`);
  return h('span', { class: 'badge soon' }, f.daysLeft === 0 ? 'ينتهي اليوم' : `ينتهي خلال ${f.daysLeft} يوم`);
}

function openItem(f) {
  if (isLink(f)) openLink(f);
  else if (previewable(f)) openPreview(f);
  else if (f.editable) openEditor(f);
  else openDetails(f);
}

function fileCard(f) {
  const t = typeInfo(f.type);
  const selected = state.selected.has(f.id);
  const showPath = !isBrowsing() && f.folderPath.length;
  const iconBox = h('div', { class: 'file-icon', onclick: () => openItem(f), title: t.label },
    f.thumb ? h('img', { src: f.thumb, alt: '', loading: 'lazy' }) : iconLabel(f));
  return h('article', { class: 'file' + (selected ? ' selected' : ''), '--type-color': t.color },
    h('input', {
      type: 'checkbox', class: 'file-check', checked: selected, 'aria-label': `تحديد ${f.name}`,
      onchange: (e) => {
        e.target.checked ? state.selected.add(f.id) : state.selected.delete(f.id);
        e.target.closest('.file').classList.toggle('selected', e.target.checked);
        renderSelection();
      },
    }),
    iconBox,
    h('div', { class: 'file-main' },
      h('div', { class: 'file-name', onclick: () => openItem(f), role: 'button', tabindex: 0, onkeydown: (e) => e.key === 'Enter' && openItem(f) }, displayName(f)),
      isLink(f) && h('div', { class: 'file-link' }, f.url),
      h('div', { class: 'file-meta' },
        h('span', { class: 'type-tag' }, t.label),
        f.category && h('span', { class: 'badge' }, f.category),
        expiryBadge(f),
        h('span', { class: 'archive-no optional' }, f.archiveNo),
        !isLink(f) && h('span', {}, fmtSize(f.size)),
        f.version > 1 && h('span', { class: 'optional' }, `النسخة ${f.version}`),
        h('span', { class: 'optional' }, `${f.createdBy || ''} · ${fmtDate(f.updatedAt)}`),
        showPath && h('span', { class: 'path' }, '📁 ' + f.folderPath.map((p) => p.name).join(' › ')),
        f.tags && f.tags.split('، ').map((tag) => h('span', { class: 'tag optional' }, '#' + tag)),
      ),
      f.transcriptHits?.length && h('div', { class: 'hits' }, f.transcriptHits.map((s) =>
        h('button', { class: 'hit', onclick: () => openPreview(f, s.start) }, h('time', {}, fmtTime(s.start)), `🎙 «${s.text}»`))),
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
}

function renderFiles() {
  const list = $('#file-list');
  list.className = 'file-list' + (state.layout === 'grid' ? ' layout-grid' : '');
  renderSelection();
  if (!state.files.length) {
    const empty = isBrowsing()
      ? (childFolders(state.folderId).length ? null : 'هذا المجلد فارغ. اضغط "رفع ملفات" أو اسحب الملفات إلى الصفحة.')
      : 'لا توجد ملفات مطابقة للبحث أو التصفية';
    list.replaceChildren(...(empty ? [h('div', { class: 'empty' }, empty)] : []));
    return;
  }
  list.replaceChildren(...state.files.map(fileCard));
}

// ---------- التحديد: تنزيل مضغوط ونقل ----------

function renderSelection() {
  const n = state.selected.size;
  $('#selection-bar').hidden = !n;
  $('#selection-count').textContent = `تم تحديد ${n}`;
}

$('#sel-all').addEventListener('click', () => {
  for (const f of state.files) state.selected.add(f.id);
  renderFiles();
});
$('#sel-clear').addEventListener('click', () => {
  state.selected.clear();
  renderFiles();
});
$('#sel-zip').addEventListener('click', () => {
  const ids = [...state.selected].join(',');
  const folder = isBrowsing() && state.folderId != null ? `&folder=${state.folderId}` : '';
  location.href = `/api/zip?ids=${ids}${folder}`;
});
$('#sel-move').addEventListener('click', run(async () => {
  const v = await promptForm(`نقل ${state.selected.size} ملف`, [
    { name: 'folderId', label: 'إلى المجلد', type: 'select', value: '', options: folderOptions() },
  ], 'نقل');
  if (!v) return;
  await api('/files/move', { method: 'POST', json: { ids: [...state.selected], folderId: v.folderId || null } });
  toast('تم النقل');
  state.selected.clear();
  loadFiles();
}));

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
  fillFolderSelect(uploadForm.elements.folderId, state.folderId);
  if (state.filters.category) uploadForm.elements.category.value = state.filters.category;
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

// قبل الرفع: هل توجد ملفات بنفس الاسم والحجم؟ (الفحص الدقيق بالبصمة يتم على الخادم أثناء الرفع)
async function askAboutDuplicates() {
  const files = Array.from(fileInput.files).map((f) => ({ name: f.name, size: f.size }));
  const { matches } = await api('/files/check', { method: 'POST', json: { files } });
  if (!matches.length) return 'skip';
  const lines = matches.map((m) => `• ${m.name} ← موجود باسم "${m.existing.name}" (${m.existing.archiveNo})${m.existing.folderPath.length ? ' في ' + m.existing.folderPath.join(' › ') : ''}`);
  const keep = confirm(`هذه الملفات موجودة مسبقاً في الأرشيف:\n\n${lines.join('\n')}\n\nاضغط "موافق" لرفعها مرة أخرى، أو "إلغاء" لتخطي المكرر ورفع الباقي فقط.`);
  return keep ? 'keep' : 'skip';
}

uploadForm.addEventListener('submit', run(async (e) => {
  if (e.submitter?.value !== 'ok') return;
  e.preventDefault();
  if (!fileInput.files.length) return toast('اختر ملفاً واحداً على الأقل', true);
  const duplicates = await askAboutDuplicates();
  const fd = new FormData(uploadForm);
  fd.set('duplicates', duplicates);
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
      ? 'اكتمل الرفع، جارٍ الحفظ وتجهيز الصور المصغرة...'
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
    else if (xhr.status === 200 || xhr.status === 201) {
      uploadDialog.close();
      const skipped = data.skipped || [];
      const msg = [data.files.length && `تم رفع ${data.files.length} ملف`, skipped.length && `تم تخطي ${skipped.length} ملف مكرر: ${skipped.map((s) => `${s.name} (موجود: ${s.existing.archiveNo})`).join('، ')}`];
      toast(msg.filter(Boolean).join(' · '), !data.files.length);
      loadFiles();
    } else if (xhr.status === 413) toast('الملف أكبر من الحد الذي يسمح به الخادم أو الاستضافة', true);
    else if (xhr.status) toast(data.error || 'فشل الرفع', true);
  };
  xhr.send(fd);
}));

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
  { name: 'folderId', label: 'المجلد', type: 'select', value: state.folderId == null ? '' : String(state.folderId), options: folderOptions() },
  { name: 'category', label: 'التصنيف', value: state.filters.category, list: 'category-options' },
  { name: 'tags', label: 'الوسوم', placeholder: 'افصل بينها بفاصلة' },
];

$('#note-btn').addEventListener('click', run(async () => {
  const v = await promptForm('ملاحظة جديدة', [
    { name: 'title', label: 'العنوان', required: true },
    { name: 'content', label: 'الملاحظة', type: 'textarea', required: true },
    ...metaFields(),
    { name: 'expiresOn', label: 'تاريخ تذكير/انتهاء (اختياري)', type: 'date' },
  ], 'حفظ الملاحظة');
  if (!v) return;
  await api('/notes', { method: 'POST', json: { ...v, folderId: v.folderId || null } });
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
  await api('/links', { method: 'POST', json: { ...v, folderId: v.folderId || null } });
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
  download: 'تنزيل', rename: 'تعديل البيانات', move: 'نقل إلى مجلد', note: 'إضافة ملاحظة', link: 'إضافة رابط',
  share: 'إنشاء رابط مشاركة', unshare: 'إيقاف رابط مشاركة', share_download: 'تنزيل عبر رابط مشاركة', delete: 'حذف', undelete: 'استرجاع من المحذوفات',
};

const JOB_LABELS = {
  thumb: 'تجهيز الصورة المصغرة', ocr: 'قراءة النص من الصورة', transcribe: 'تفريغ كلام الفيديو/الصوت',
  ai_tags: 'الاقتراحات الذكية', hash: 'فحص التكرار',
};

function renderActivity(box, rows, withFile = false) {
  if (!rows.length) return box.replaceChildren(h('p', { class: 'muted' }, 'لا يوجد نشاط'));
  box.replaceChildren(...rows.map((a) => h('div', {},
    h('time', {}, fmtDate(a.created_at)),
    h('strong', {}, a.by || (a.action === 'share_download' ? 'شخص عبر رابط' : '—')),
    h('span', {}, ACTIONS[a.action] || a.action),
    withFile && a.file && h('span', { class: 'tag' }, a.file),
    a.detail && a.detail !== a.file && h('span', { class: 'muted' }, a.detail),
  )));
}

async function openDetails(f) {
  const { file } = await api(`/files/${f.id}`).catch((err) => (toast(err.message, true), {}));
  if (!file) return;
  state.details = file;
  $('#details-title').textContent = displayName(file);
  $('#details-archive').textContent = `${file.archiveNo} · ${typeInfo(file.type).label}${file.folderPath.length ? ' · 📁 ' + file.folderPath.map((p) => p.name).join(' › ') : ''}`;
  const form = $('#meta-form');
  for (const k of ['name', 'category', 'tags', 'description', 'url', 'expiresOn', 'remindDays']) form.elements[k].value = file[k] ?? '';
  fillFolderSelect(form.elements.folderId, file.folderId);
  form.elements.url.closest('label').hidden = !isLink(file);
  $('#ai-btn').hidden = !state.features.ai;
  const jobs = file.pendingJobs || [];
  $('#details-jobs').hidden = !jobs.length;
  $('#details-jobs').textContent = jobs.length ? `⏳ جارٍ في الخلفية: ${jobs.map((j) => JOB_LABELS[j] || j).join('، ')}` : '';
  await refreshDetails();
  if (!detailsDialog.open) detailsDialog.showModal();
}

async function refreshDetails() {
  const f = state.details;
  const [{ versions, current }, { activity }, transcript] = await Promise.all([
    api(`/files/${f.id}/versions`),
    api(`/files/${f.id}/activity`),
    f.hasTranscript ? api(`/files/${f.id}/transcript`) : { segments: [] },
  ]);
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
  $('#transcript-section').hidden = !transcript.segments.length;
  $('#transcript').replaceChildren(...transcript.segments.map((s) =>
    h('button', { onclick: () => openPreview(f, s.start) }, h('time', {}, fmtTime(s.start)), s.text)));
}

async function reloadDetails() {
  await openDetails(state.details);
  loadFiles();
}

$('#meta-form').addEventListener('submit', run(async (e) => {
  e.preventDefault();
  const json = Object.fromEntries(new FormData(e.target));
  if (!isLink(state.details)) delete json.url;
  json.folderId = json.folderId || null;
  const { file } = await api(`/files/${state.details.id}`, { method: 'PATCH', json });
  toast('تم حفظ البيانات');
  await openDetails(file);
  loadFiles();
}));

$('#delete-btn').addEventListener('click', run(async () => {
  if (!confirm(`حذف "${state.details.name}"؟ يستطيع المدير استرجاعه من المحذوفات.`)) return;
  await api(`/files/${state.details.id}`, { method: 'DELETE' });
  detailsDialog.close();
  toast('تم الحذف');
  loadFiles();
}));

$('#label-btn').addEventListener('click', () => window.open(`/label/${state.details.id}`, '_blank', 'noopener'));

// الاقتراحات تملأ الحقول فقط، ولا تُحفظ حتى يراجعها الموظف ويضغط "حفظ"
$('#ai-btn').addEventListener('click', run(async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = '✨ جارٍ التفكير...';
  try {
    const { suggestion } = await api(`/files/${state.details.id}/suggest`, { method: 'POST', json: {} });
    const form = $('#meta-form');
    form.elements.category.value = suggestion.category;
    form.elements.tags.value = suggestion.tags.join('، ');
    form.elements.description.value = suggestion.description;
    toast('راجع الاقتراحات ثم اضغط "حفظ البيانات"');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ اقتراح بالذكاء الاصطناعي';
  }
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

// start: ثانية البداية عند فتح الفيديو من نتيجة بحث في كلامه
function openPreview(f, start) {
  const url = `/api/files/${f.id}/download?inline=1`;
  const media = start ? `${url}#t=${start}` : url;
  $('#preview-title').textContent = f.name;
  $('#preview-download').href = `/api/files/${f.id}/download`;
  const area = $('#preview-area');
  if (f.mime.startsWith('image/')) area.replaceChildren(h('img', { class: 'preview-img', src: url, alt: f.name }));
  else if (f.mime.startsWith('video/')) {
    const video = h('video', { class: 'preview-media', src: media, controls: true, autoplay: true, playsinline: true, preload: 'metadata' });
    video.addEventListener('error', () => area.replaceChildren(h('p', { class: 'empty', style: 'margin:1rem' },
      'لا يستطيع المتصفح تشغيل هذا النوع من الفيديو. نزّل الملف لمشاهدته.')));
    area.replaceChildren(video);
  } else if (f.mime.startsWith('audio/')) area.replaceChildren(h('audio', { class: 'preview-audio', src: media, controls: true, autoplay: true }));
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
    const [{ users }, { files }, { activity }, stats, { backup }, { groups }] = await Promise.all([
      api('/users'), api('/admin/trash'), api('/admin/activity'), api('/admin/stats'), api('/admin/backup'), api('/admin/duplicates'),
    ]);
    renderUsers(users);
    renderStats(stats);
    renderBackup(backup);
    renderDuplicates(groups);
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

function barList(rows, { value, label, color, tip, format = (v) => v }) {
  const max = Math.max(1, ...rows.map(value));
  return h('div', { class: 'bars' }, rows.map((r) => {
    const row = h('div', { class: 'bar-row' },
      h('span', { class: 'name', title: label(r) }, label(r)),
      h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: `${(value(r) / max) * 100}%` }, '--bar': color(r) })),
      h('span', { class: 'val' }, format(value(r))),
    );
    attachTooltip(row, tip(r));
    return row;
  }));
}

function renderStats({ totals, byType, byUploader, perDay, jobs }) {
  const tile = (label, value, sub, warn) => h('div', { class: 'stat' + (warn ? ' warn' : '') },
    h('div', { class: 'label' }, label), h('div', { class: 'value' }, value), sub && h('div', { class: 'sub' }, sub));

  // آخر 30 يوماً، والأيام بدون رفع تظهر صفراً
  const counts = new Map(perDay.map((d) => [d.day, d.count]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d, count: counts.get(d) || 0 };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const columns = h('div', { class: 'columns', role: 'img', 'aria-label': 'عدد الملفات المرفوعة يومياً خلال آخر 30 يوماً' }, days.map((d) => {
    const col = h('div', { class: 'col' }, h('span', { style: { height: `${(d.count / maxDay) * 100}%` } }));
    attachTooltip(col, `${fmtDay(d.day)}: ${d.count} ملف`);
    return col;
  }));
  const failed = jobs.filter((j) => j.status === 'failed').reduce((s, j) => s + j.count, 0);
  const pending = jobs.filter((j) => j.status === 'pending' || j.status === 'running').reduce((s, j) => s + j.count, 0);

  fill($('#stats'),
    h('div', { class: 'stat-tiles' },
      tile('الملفات', totals.files.toLocaleString('ar', { numberingSystem: 'latn' }), `${totals.folders} مجلد · ${totals.users} موظف`),
      tile('المساحة المستخدمة', fmtSize(totals.size), `مع كل النسخ القديمة: ${fmtSize(totals.storage)}`),
      tile('روابط مشاركة فعالة', totals.shares),
      tile('صلاحية المستندات', `${totals.expired} منتهي`, `${totals.expiringSoon} تنتهي قريباً`, totals.expired + totals.expiringSoon > 0),
    ),
    h('div', { class: 'charts' },
      h('div', { class: 'chart' }, h('h3', {}, 'الملفات حسب النوع'),
        barList(byType.sort((a, b) => b.count - a.count), {
          value: (r) => r.count, label: (r) => r.label, color: (r) => r.color, tip: (r) => `${r.label}: ${r.count} ملف · ${fmtSize(r.size)}`,
        })),
      h('div', { class: 'chart' }, h('h3', {}, 'الملفات حسب الموظف'),
        barList(byUploader.filter((u) => u.count), {
          value: (r) => r.count, label: (r) => r.name, color: () => 'var(--primary)',
          tip: (r) => `${r.name}: ${r.count} ملف · ${fmtSize(r.size)} · آخر رفع ${fmtDate(r.lastAt)}`,
        })),
      h('div', { class: 'chart' }, h('h3', {}, 'الرفع اليومي (آخر 30 يوماً)'), columns,
        h('div', { class: 'axis' }, h('span', { dir: 'rtl' }, fmtDay(days[0].day)), h('span', { dir: 'rtl' }, 'اليوم'))),
    ),
    failed || pending ? h('p', { class: 'muted' }, [pending && `⏳ ${pending} مهمة تعمل في الخلفية`, failed && `⚠️ ${failed} مهمة فشلت (قراءة ضوئية أو تفريغ أو اقتراحات)`].filter(Boolean).join(' · ')) : null,
  );
}

function renderBackup(b) {
  fill($('#backup-status'),
    h('p', {}, b.lastAt ? `${b.lastOk ? '✅' : '❌'} آخر نسخة: ${fmtDate(b.lastAt)}` : 'لم تُنفذ أي نسخة احتياطية بعد'),
    b.lastMessage && h('p', { class: 'muted' }, b.lastMessage),
    h('p', { class: 'muted' }, `يتم النسخ تلقائياً كل يوم بعد الساعة ${b.hour}:00 إلى: `, h('span', { class: 'mono' }, b.dir)),
  );
}

$('#backup-btn').addEventListener('click', run(async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const { backup } = await api('/admin/backup', { method: 'POST', json: {} });
    renderBackup(backup);
    toast(backup.lastOk ? 'تم النسخ الاحتياطي' : backup.lastMessage, !backup.lastOk);
  } finally {
    btn.disabled = false;
  }
}));

function renderDuplicates(groups) {
  $('#duplicates-list').replaceChildren(...(groups.length
    ? groups.map((g) => h('div', { class: 'dup-group' }, g.map((f) => h('div', {},
      h('span', {}, `${f.name} · ${f.archiveNo}${f.folderPath.length ? ' · 📁 ' + f.folderPath.map((p) => p.name).join(' › ') : ''}`),
      h('button', { class: 'btn small', onclick: () => openDetails(f) }, 'فتح'),
    ))))
    : [h('p', { class: 'muted' }, 'لا توجد ملفات مكررة 👍')]));
}

function renderUsers(users) {
  $('#users-table').replaceChildren(
    h('thead', {}, h('tr', {}, h('th', {}, 'الاسم'), h('th', {}, 'اسم المستخدم'), h('th', {}, 'الصلاحية'), h('th', {}, 'الحالة'), h('th', {}))),
    h('tbody', {}, users.map((u) => h('tr', {},
      h('td', {}, u.displayName),
      h('td', { dir: 'ltr', style: 'text-align: end' }, u.username),
      h('td', {}, u.role === 'admin' ? 'مدير' : 'موظف'),
      h('td', { class: u.active ? '' : 'status-off' }, u.active ? 'فعّال' : 'موقوف'),
      h('td', {},
        h('button', { class: 'btn small', onclick: () => editUser(u) }, 'تعديل'),
        h('button', { class: 'btn small ghost', onclick: () => { switchView('files'); setFilter('uploader', String(u.id)); } }, 'ملفاته'),
      ),
    ))),
  );
}

const formDialog = $('#form-dialog');

function formField(f) {
  if (f.type === 'checkbox') {
    return h('label', { style: 'display:flex; gap:.5rem; align-items:center' }, h('input', { type: 'checkbox', name: f.name, checked: f.value, style: 'width:auto' }), f.label);
  }
  if (f.type === 'checklist') {
    const chosen = new Set((f.value || []).map(String));
    return h('div', {}, h('div', { class: 'muted', style: 'margin-bottom:.3rem' }, f.label),
      h('div', { class: 'checklist', 'data-name': f.name }, f.options.map(([v, l]) =>
        h('label', {}, h('input', { type: 'checkbox', value: v, checked: chosen.has(String(v)) }), l))));
  }
  if (f.type === 'select') {
    return h('label', {}, f.label, h('select', { name: f.name }, f.options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(f.value ?? '') }, l))));
  }
  if (f.type === 'textarea') return h('label', {}, f.label, h('textarea', { name: f.name, rows: 8, required: f.required, dir: 'auto' }));
  return h('label', {}, f.label, h('input', {
    name: f.name, type: f.type || 'text', value: f.value ?? '', required: f.required, minlength: f.minlength,
    placeholder: f.placeholder, autocomplete: f.autocomplete || 'off', dir: f.dir, list: f.list,
  }));
}

// نافذة نموذج عامة: تعيد القيم عند الضغط على "حفظ"، و extra أزرار إضافية تعيد { __action }
function promptForm(title, fields, submitLabel = 'حفظ', extra = []) {
  const form = $('#generic-form');
  form.replaceChildren(
    h('h2', {}, title),
    ...fields.map(formField),
    h('div', { class: 'actions' },
      ...extra.map((b) => h('button', { class: `btn ${b.class || ''}`, value: `action:${b.value}`, formnovalidate: true }, b.label)),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', value: 'cancel', formnovalidate: true }, 'إلغاء'),
      h('button', { class: 'btn primary', value: 'ok' }, submitLabel),
    ),
  );
  formDialog.showModal();
  return new Promise((resolve) => {
    const onSubmit = (e) => {
      const v = e.submitter?.value || '';
      if (v.startsWith('action:')) {
        e.preventDefault();
        resolve({ __action: v.slice(7) });
        return formDialog.close();
      }
      if (v !== 'ok') return;
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      for (const f of fields) {
        if (f.type === 'checkbox') values[f.name] = form.elements[f.name].checked;
        if (f.type === 'checklist') {
          values[f.name] = [...form.querySelectorAll(`[data-name="${f.name}"] input:checked`)].map((i) => Number(i.value));
        }
      }
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
  userNames = null;
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
  userNames = null;
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

// رابط /f/123 (من رمز QR مثلاً) يفتح تفاصيل الملف بعد الدخول
function openDeepLink() {
  const m = /^\/f\/(\d+)/.exec(location.pathname);
  if (!m) return;
  history.replaceState(null, '', '/');
  openDetails({ id: Number(m[1]) });
}

api('/me').then(({ user }) => showApp(user)).catch(showLogin);
