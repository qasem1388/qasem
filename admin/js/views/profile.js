// الملف الشخصي: تعديل الاسم وتغيير كلمة المرور
import { api } from '../api.js';
import { html, $, toast, setTitle } from '../ui.js';
import { state } from '../store.js';

export async function renderProfile(view) {
  setTitle('الملف الشخصي');
  const me = state.meta.user;
  view.innerHTML = String(html`<div class="page-head"><h1><i class="fa-solid fa-user-gear"></i> الملف الشخصي</h1></div>
    <form class="panel" novalidate data-form style="max-width:640px">
      <div class="form-section"><div class="fields">
        <div class="field"><label for="p_name">الاسم</label><input class="input" id="p_name" name="name" value="${me.name}" maxlength="128" required><span class="field__error" hidden></span></div>
        <div class="field"><label>البريد الإلكتروني</label><div class="readonly" dir="ltr">${me.email}</div></div>
        <div class="field"><label>الدور</label><div class="readonly">${me.role || ''}</div></div>
      </div></div>
      <div class="form-section"><div class="form-section__title">تغيير كلمة المرور</div><div class="fields">
        <div class="field"><label for="p_cur">كلمة المرور الحالية</label><input class="input" type="password" id="p_cur" name="current_password" autocomplete="current-password" dir="ltr"><span class="field__error" hidden></span></div>
        <div class="field field--half"><label for="p_new">كلمة المرور الجديدة</label><input class="input" type="password" id="p_new" name="new_password" autocomplete="new-password" minlength="8" dir="ltr"><span class="field__error" hidden></span></div>
        <div class="field field--half"><label for="p_conf">تأكيد كلمة المرور</label><input class="input" type="password" id="p_conf" name="confirm" autocomplete="new-password" dir="ltr"><span class="field__error" hidden></span></div>
      </div></div>
      <div class="form-actions"><button class="btn" type="submit"><i class="fa-solid fa-floppy-disk"></i> حفظ</button></div>
    </form>`);
  const form = $('[data-form]', view);
  const setErr = (name, msg) => {
    const err = form.querySelector(`[name="${name}"]`)?.closest('.field')?.querySelector('.field__error');
    if (err) { err.hidden = !msg; err.textContent = msg || ''; }
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ['name', 'current_password', 'new_password', 'confirm'].forEach((n) => setErr(n, ''));
    const body = { name: form.name.value.trim() };
    if (form.new_password.value) {
      if (form.new_password.value.length < 8) return setErr('new_password', 'كلمة المرور يجب ألا تقل عن 8 أحرف');
      if (form.new_password.value !== form.confirm.value) return setErr('confirm', 'كلمتا المرور غير متطابقتين');
      body.current_password = form.current_password.value;
      body.new_password = form.new_password.value;
    }
    try {
      await api('profile', { method: 'PUT', body });
      toast('تم حفظ التغييرات');
      state.meta.user.name = body.name;
      $('#userName').textContent = body.name;
      form.current_password.value = form.new_password.value = form.confirm.value = '';
    } catch (err) {
      if (err.errors) Object.entries(err.errors).forEach(([k, v]) => setErr(k, v));
      toast(err.message, 'error');
    }
  });
}
