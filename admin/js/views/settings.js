// صفحات الإعدادات (الهوية البصرية، معلومات الجمعية، الصفحة الرئيسية، SEO ...)
import { api } from '../api.js';
import { html, el, $, toast, setTitle } from '../ui.js';
import { buildForm } from './form.js';
import { setLeaveGuard } from '../app.js';

export async function renderSettings(view, key, group) {
  setTitle(group.label);
  const values = await api(`settings/${key}`);
  const pseudoRes = { name: `settings_${key}`, fields: group.fields };
  const fields = group.canManage ? group.fields : group.fields.map((f) => ({ ...f, readonly: true }));
  const form = buildForm(pseudoRes, values, { fields });
  view.innerHTML = String(html`
    <div class="page-head"><h1><i class="fa-solid ${group.icon}"></i> ${group.label}</h1>
      <div class="page-head__actions"><a class="btn btn--light" href="/" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i> عرض الموقع</a></div></div>
    ${key === 'identity' ? html`<div class="help"><i class="fa-solid fa-circle-info"></i><span>تُطبق الألوان والخط والشعار تلقائيًا على جميع صفحات الموقع فور الحفظ.</span></div>` : ''}
    <form class="panel" novalidate data-form>
      <div data-fields></div>
      ${key === 'identity' ? html`<div class="form-section"><div class="form-section__title">معاينة الألوان</div><div class="theme-preview" data-preview>
        <div class="theme-preview__head" data-p-head>اسم الجمعية</div>
        <div class="theme-preview__body" data-p-body><span data-p-text>نص تجريبي للمحتوى</span><span class="theme-preview__btn" data-p-btn>زر رئيسي</span><span class="theme-preview__btn" data-p-sec>زر ثانوي</span></div></div></div>` : ''}
      ${group.canManage ? html`<div class="form-actions"><button class="btn" type="submit"><i class="fa-solid fa-floppy-disk"></i> حفظ الإعدادات</button></div>` : ''}
    </form>`);
  $('[data-fields]', view).appendChild(form.root);
  setLeaveGuard(() => form.isDirty());

  if (key === 'identity') {
    const p = (sel) => $(sel, view);
    const update = () => {
      const v = form.values();
      p('[data-p-head]').style.background = v.color_primary;
      p('[data-p-head]').textContent = v.org_name || 'اسم الجمعية';
      p('[data-p-body]').style.background = v.color_background;
      p('[data-p-text]').style.color = v.color_text;
      p('[data-p-btn]').style.background = v.color_button;
      p('[data-p-sec]').style.background = v.color_secondary;
      p('[data-preview]').style.fontFamily = `'${v.font_family}', sans-serif`;
    };
    form.root.addEventListener('input', update);
    form.root.addEventListener('change', update);
    update();
  }

  $('[data-form]', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`settings/${key}`, { method: 'PUT', body: form.values() });
      form.setErrors({});
      form.markClean();
      toast('تم حفظ الإعدادات');
      if (key === 'identity') {
        const v = form.values();
        if (v.color_primary) document.documentElement.style.setProperty('--a-primary', v.color_primary);
        if (v.org_name) $('#sideName').textContent = v.org_name;
        const logo = $('#sideLogo');
        if (v.logo) { logo.src = v.logo; logo.hidden = false; } else logo.hidden = true;
      }
    } catch (err) {
      if (err.errors) form.setErrors(err.errors);
      toast(err.message, 'error');
    }
  });
}
