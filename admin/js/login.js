// صفحة تسجيل الدخول
const form = document.getElementById('loginForm');
const errBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');
const pw = document.getElementById('password');
const toggle = document.getElementById('pwToggle');

toggle.addEventListener('click', () => {
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  toggle.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
});

const showError = (msg) => {
  errBox.querySelector('span').textContent = msg;
  errBox.classList.remove('hidden');
};

let csrf = null;
async function getCsrf() {
  const r = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  csrf = (await r.json()).token;
}
getCsrf().catch(() => showError('تعذر الاتصال بالخادم'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.add('hidden');
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
  if (!/^\S+@\S+\.\S+$/.test(email)) return showError('صيغة البريد الإلكتروني غير صحيحة');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جارٍ الدخول...';
  try {
    if (!csrf) await getCsrf();
    const r = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 403) await getCsrf();
      throw new Error(data.error || 'تعذر تسجيل الدخول');
    }
    const next = new URLSearchParams(location.search).get('next');
    location.href = next && next.startsWith('/admin/') && !next.startsWith('//') ? next : '/admin/dashboard';
  } catch (err) {
    showError(err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول';
  }
});

// عرض شعار واسم الجمعية
fetch('/api/auth/brand').then((r) => r.json()).then((b) => {
  if (b.logo) { const img = document.getElementById('brandLogo'); img.src = b.logo; img.alt = b.name || ''; img.hidden = false; }
  if (b.name) document.getElementById('brandName').textContent = b.name;
  if (/^#[0-9a-f]{6}$/i.test(b.primary || '')) document.documentElement.style.setProperty('--a-primary', b.primary);
}).catch(() => {});
