// أدوات واجهة مشتركة: الهروب من HTML، التنبيهات، النوافذ، التأكيد
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => (v === null || v === undefined ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]));

/** قالب HTML آمن: كل القيم المدرجة تُهرَّب تلقائيًا ما لم تكن raw() */
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < vals.length) {
      const v = vals[i];
      if (v instanceof Raw) out += v.s;
      else if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.s : esc(x))).join('');
      else out += esc(v);
    }
  });
  return raw(out);
}
export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = String(markup).trim();
  return t.content.firstElementChild;
}
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

export function toast(message, type = 'success') {
  const box = document.getElementById('toasts');
  const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
  const t = el(html`<div class="toast toast--${type}" role="${type === 'error' ? 'alert' : 'status'}"><i class="fa-solid ${icon}"></i><span>${message}</span></div>`);
  box.appendChild(t);
  setTimeout(() => t.remove(), type === 'error' ? 6000 : 3500);
}

/** نافذة منبثقة عامة. تعيد { root, body, close } */
export function modal({ title, size = '', content = '', footer = null, onClose } = {}) {
  const prevFocus = document.activeElement;
  const wrap = el(html`<div class="modal-backdrop"><div class="modal ${size ? 'modal--' + size : ''}" role="dialog" aria-modal="true" aria-label="${title}">
    <div class="modal__head"><h2>${title}</h2><button class="icon-btn" type="button" data-close aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal__body"></div></div></div>`);
  const body = $('.modal__body', wrap);
  if (typeof content === 'string' || content instanceof Raw) body.innerHTML = String(content);
  else if (content) body.appendChild(content);
  if (footer) {
    const f = el('<div class="modal__foot"></div>');
    if (typeof footer === 'string' || footer instanceof Raw) f.innerHTML = String(footer); else f.appendChild(footer);
    $('.modal', wrap).appendChild(f);
  }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape' && document.body.lastElementChild === wrap) close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));
  document.body.appendChild(wrap);
  setTimeout(() => { const f = $('input, select, textarea, button:not([data-close])', body) || $('[data-close]', wrap); if (f) f.focus(); }, 30);
  return { root: wrap, body, close };
}

/** نافذة تأكيد. تعيد Promise<boolean> */
export function confirmDialog(message, { title = 'تأكيد', okText = 'تأكيد', danger = true } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const footer = el(html`<div style="display:contents"><button class="btn btn--light" type="button" data-close>إلغاء</button><button class="btn ${danger ? 'btn--danger' : ''}" type="button" data-ok>${okText}</button></div>`);
    const m = modal({ title, size: 'sm', content: html`<p style="margin:0">${message}</p>`, footer, onClose: () => { if (!done) resolve(false); } });
    $('[data-close]', m.root.querySelector('.modal__foot')).addEventListener('click', m.close);
    const ok = $('[data-ok]', m.root);
    ok.addEventListener('click', () => { done = true; resolve(true); m.close(); });
    setTimeout(() => ok.focus(), 40);
  });
}

export function formatDate(v, withTime = false) {
  if (!v) return '';
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v);
  if (Number.isNaN(d.getTime())) return String(v);
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', opts).format(d);
}
export const formatSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(b / 1024)) + ' ك.ب');
export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function loading(container) {
  container.innerHTML = '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
}
export const optLabel = (field, v) => ((field.options || []).find((o) => o.value === v) || {}).label || v || '';

export function setTitle(t) {
  document.getElementById('topTitle').textContent = t;
  document.title = `${t} — لوحة التحكم`;
}
