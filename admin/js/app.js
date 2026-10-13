// نقطة البداية: تحميل بيانات التهيئة، القائمة الجانبية، والتوجيه بين الصفحات
import { api, setCsrf } from './api.js';
import { state } from './store.js';
import { $, $$, el, html, toast, esc, loading, setTitle } from './ui.js';
import { renderDashboard } from './views/dashboard.js';
import { renderList } from './views/list.js';
import { renderFormPage } from './views/form.js';
import { renderSettings } from './views/settings.js';
import { renderMenuBuilder } from './views/menu.js';
import { renderMediaManager } from './views/media.js';
import { renderProfile } from './views/profile.js';

const view = $('#view');
let leaveGuard = null; // دالة تُرجع true إذا كان هناك تعديلات غير محفوظة

export function setLeaveGuard(fn) { leaveGuard = fn; }

export function navigate(url, { replace = false } = {}) {
  if (leaveGuard && leaveGuard() && !confirm('لديك تعديلات غير محفوظة. هل تريد المغادرة دون حفظ؟')) return;
  leaveGuard = null;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  route();
}

window.addEventListener('beforeunload', (e) => { if (leaveGuard && leaveGuard()) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('popstate', () => { leaveGuard = null; route(); });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
  document.body.classList.remove('sidebar-open');
});

// ===== القائمة الجانبية =====
function renderSidebar() {
  const nav = $('#sideNav');
  const items = state.meta.menu;
  nav.innerHTML = String(html`${items.map((it, i) => it.children
    ? html`<div class="nav-group" data-group="${i}"><button class="nav-group__head" type="button" aria-expanded="false"><i class="fa-solid ${it.icon}"></i><span>${it.label}</span><i class="fa-solid fa-chevron-down chev"></i></button>
        <div class="nav-group__items">${it.children.map((c) => html`<a class="nav-link" href="/admin/${c.route}" data-link data-route="${c.route}"><i class="fa-solid ${c.icon}"></i><span>${c.label}</span>${c.badge ? html`<span class="nav-badge hidden" data-badge="${c.badge}"></span>` : ''}</a>`)}</div></div>`
    : html`<a class="nav-link" href="/admin/${it.route}" data-link data-route="${it.route}"><i class="fa-solid ${it.icon}"></i><span>${it.label}</span></a>`)}`);
  $$('.nav-group__head', nav).forEach((b) => b.addEventListener('click', () => {
    const g = b.parentElement;
    g.classList.toggle('is-open');
    b.setAttribute('aria-expanded', String(g.classList.contains('is-open')));
  }));
}

function highlightNav(path) {
  const route = path.replace(/^\/admin\/?/, '');
  let best = null;
  $$('.nav-link[data-route]').forEach((a) => {
    a.classList.remove('is-active');
    const r = a.dataset.route;
    if (route === r || route.startsWith(r + '/')) if (!best || r.length > best.dataset.route.length) best = a;
  });
  // المسارات الفرعية (مثل ملفات سنة حوكمة) تُنسب للمورد المناسب
  if (!best) {
    const m = route.match(/^r\/(\w+)/);
    if (m) best = $(`.nav-link[data-route="r/${m[1]}"]`);
  }
  if (best) {
    best.classList.add('is-active');
    const g = best.closest('.nav-group');
    if (g && !g.classList.contains('is-open')) { g.classList.add('is-open'); $('.nav-group__head', g).setAttribute('aria-expanded', 'true'); }
  }
}

export async function refreshBadges() {
  try {
    const b = await api('badges');
    for (const [k, v] of Object.entries(b)) {
      const elx = $(`[data-badge="${k}"]`);
      if (elx) { elx.textContent = v; elx.classList.toggle('hidden', !v); }
    }
  } catch { /* تجاهل */ }
}

// ===== التوجيه =====
async function route() {
  const path = location.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(location.search);
  highlightNav(path);
  if (window.tinymce) window.tinymce.remove();
  // حاوية جديدة لكل صفحة حتى لا تتراكم مستمعات الأحداث
  const container = document.createElement('div');
  view.replaceChildren(container);
  loading(container);
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  const seg = path.replace(/^\/admin\/?/, '').split('/').map(decodeURIComponent);
  try {
    if (!seg[0] || seg[0] === 'dashboard') return await renderDashboard(container);
    if (seg[0] === 'r' && seg[1]) {
      const res = state.meta.resources[seg[1]];
      if (!res) return notAllowed();
      if (res.singleton) return await renderFormPage(container, res, 'single');
      if (res.customView === 'menu' && !seg[2]) return navigate('/admin/menu', { replace: true });
      if (!seg[2]) return await renderList(container, res, params);
      return await renderFormPage(container, res, seg[2] === 'new' ? null : seg[2], params);
    }
    if (seg[0] === 'settings' && seg[1]) {
      const g = state.meta.settingsGroups[seg[1]];
      if (!g) return notAllowed();
      return await renderSettings(container, seg[1], g);
    }
    if (seg[0] === 'menu') return state.meta.resources.navigation_items ? await renderMenuBuilder(container) : notAllowed();
    if (seg[0] === 'media') return state.meta.can.files ? await renderMediaManager(container) : notAllowed();
    if (seg[0] === 'profile') return await renderProfile(container);
    notFound();
  } catch (e) {
    console.error(e);
    container.innerHTML = String(html`<div class="panel panel__body empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${e.message || 'حدث خطأ'}</div>`);
  }
}
function notAllowed() {
  setTitle('غير مصرح');
  view.firstElementChild.innerHTML = '<div class="panel empty-state"><i class="fa-solid fa-lock"></i>ليس لديك صلاحية للوصول إلى هذه الصفحة</div>';
}
function notFound() {
  setTitle('غير موجود');
  view.firstElementChild.innerHTML = '<div class="panel empty-state"><i class="fa-regular fa-compass"></i>الصفحة غير موجودة</div>';
}

// ===== التهيئة =====
async function init() {
  state.meta = await api('meta');
  const me = await api('me');
  setCsrf(me.csrf);
  const { user, site } = state.meta;
  $('#userName').textContent = user.name;
  $('#userAvatar').textContent = (user.name || '?').trim().charAt(0);
  $('#userRole').textContent = `${user.role || ''} — ${user.email}`;
  if (site.name) $('#sideName').textContent = site.name;
  if (site.logo) { const img = $('#sideLogo'); img.src = site.logo; img.hidden = false; }
  if (/^#[0-9a-f]{6}$/i.test(site.primary || '')) document.documentElement.style.setProperty('--a-primary', site.primary);
  renderSidebar();

  $('#menuToggle').addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  $$('[data-close-sidebar]').forEach((b) => b.addEventListener('click', () => document.body.classList.remove('sidebar-open')));
  const userBtn = $('#userBtn');
  const dd = $('#userDropdown');
  userBtn.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('is-open'); userBtn.setAttribute('aria-expanded', String(dd.classList.contains('is-open'))); });
  document.addEventListener('click', () => dd.classList.remove('is-open'));
  $('#logoutBtn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* تجاهل */ }
    location.href = '/admin/login';
  });

  await route();
  refreshBadges();
  setInterval(refreshBadges, 120000);
}

init().catch((e) => {
  if (e.status !== 401) {
    view.innerHTML = String(html`<div class="panel empty-state"><i class="fa-solid fa-plug-circle-xmark"></i>${e.message || 'تعذر تحميل لوحة التحكم'}</div>`);
    toast(e.message, 'error');
  }
});

export { esc, el };
