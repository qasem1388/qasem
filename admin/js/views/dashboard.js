// لوحة المعلومات الرئيسية
import { api } from '../api.js';
import { html, formatDate, setTitle } from '../ui.js';
import { state, can } from '../store.js';

const ACTIONS = {
  create: 'إضافة', update: 'تعديل', quick_update: 'تحديث سريع', delete: 'حذف', reorder: 'إعادة ترتيب', login: 'تسجيل دخول',
  logout: 'تسجيل خروج', login_failed: 'محاولة دخول فاشلة', upload: 'رفع ملف', settings_update: 'تحديث الإعدادات',
  export: 'تصدير', download_private: 'تحميل ملف خاص', profile_update: 'تحديث الملف الشخصي',
};
const STATUS = { new: 'جديد', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض', active: 'نشط', shortlisted: 'قائمة مختصرة', hired: 'تم التوظيف' };

export async function renderDashboard(view) {
  setTitle('لوحة المعلومات');
  const d = await api('dashboard');
  const EXTRA = { media_files: 'الملفات', settings: 'الإعدادات' };
  const resLabel = (n) => (state.meta.resources[n] || {}).label || EXTRA[n] || n;
  const quick = [
    ['r/news/new', 'fa-newspaper', 'إضافة خبر', 'media.manage'],
    ['r/pages/new', 'fa-file-circle-plus', 'إضافة صفحة', 'pages.manage'],
    ['r/homepage_slides', 'fa-images', 'إدارة الشرائح', 'homepage.view'],
    ['r/governance_files/new', 'fa-file-pdf', 'رفع ملف حوكمة', 'governance.manage'],
    ['r/job_posts/new', 'fa-briefcase', 'إضافة وظيفة', 'jobs.manage'],
    ['settings/identity', 'fa-palette', 'الهوية البصرية', 'settings.view'],
  ].filter((q) => can(q[3]));
  view.innerHTML = String(html`
    <div class="page-head"><h1><i class="fa-solid fa-gauge-high"></i> مرحبًا، ${state.meta.user.name}</h1>
      <div class="page-head__actions"><a class="btn btn--light" href="/" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i> عرض الموقع</a></div></div>
    <div class="stat-cards">${d.stats.map((s) => html`<a class="stat-card" href="/admin/${s.route}" data-link>
      <span class="stat-card__icon"><i class="fa-solid ${s.icon}"></i></span>
      <span><span class="stat-card__value">${s.value}</span> ${s.extra ? html`<span class="stat-card__extra">${s.extra} ${s.extraLabel}</span>` : ''}<br><span class="stat-card__label">${s.label}</span></span></a>`)}</div>
    ${quick.length ? html`<div class="panel" style="margin-bottom:16px"><div class="panel__head"><h2>إجراءات سريعة</h2></div><div class="panel__body"><div class="quick-links">${quick.map((q) => html`<a href="/admin/${q[0]}" data-link><i class="fa-solid ${q[1]}"></i> ${q[2]}</a>`)}</div></div></div>` : ''}
    <div class="dash-grid">
      ${d.recentVolunteers ? html`<div class="panel"><div class="panel__head"><h2>أحدث المتطوعين</h2><a class="small" href="/admin/r/volunteers" data-link>عرض الكل</a></div>
        ${d.recentVolunteers.length ? html`<table class="data"><tbody>${d.recentVolunteers.map((v) => html`<tr><td><a class="cell-title" href="/admin/r/volunteers/${v.id}" data-link>${v.full_name}</a><div class="small muted">${v.city || ''}</div></td><td><span class="badge badge--${v.status}">${STATUS[v.status] || v.status}</span></td><td class="small muted">${formatDate(v.created_at)}</td></tr>`)}</tbody></table>` : html`<div class="empty-state">لا يوجد متطوعون بعد</div>`}</div>` : ''}
      ${d.recentApplications ? html`<div class="panel"><div class="panel__head"><h2>أحدث طلبات التوظيف</h2><a class="small" href="/admin/r/job_applications" data-link>عرض الكل</a></div>
        ${d.recentApplications.length ? html`<table class="data"><tbody>${d.recentApplications.map((v) => html`<tr><td><a class="cell-title" href="/admin/r/job_applications/${v.id}" data-link>${v.full_name}</a><div class="small muted">${v.job_title || ''}</div></td><td><span class="badge badge--${v.status}">${STATUS[v.status] || v.status}</span></td><td class="small muted">${formatDate(v.created_at)}</td></tr>`)}</tbody></table>` : html`<div class="empty-state">لا توجد طلبات بعد</div>`}</div>` : ''}
      ${d.recentAudit ? html`<div class="panel" style="grid-column:1/-1"><div class="panel__head"><h2>آخر العمليات</h2><a class="small" href="/admin/r/audit_logs" data-link>سجل العمليات</a></div>
        <table class="data"><tbody>${d.recentAudit.map((a) => html`<tr><td class="small">${formatDate(a.created_at, true)}</td><td>${(a.user_name || '').split(' <')[0]}</td><td><span class="badge">${ACTIONS[a.action] || a.action}</span></td><td class="small muted">${a.entity ? resLabel(a.entity) : ''}${a.entity_id ? ` #${a.entity_id}` : ''}</td></tr>`)}</tbody></table></div>` : ''}
    </div>`);
}
