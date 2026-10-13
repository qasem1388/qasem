'use strict';
/**
 * الصلاحيات: لكل وحدة صلاحيتان: view (عرض) و manage (إضافة/تعديل/حذف).
 * دور المدير العام super_admin يملك جميع الصلاحيات دائمًا.
 */
const MODULES = {
  homepage: 'الصفحة الرئيسية (الشرائح، الإحصائيات، الخدمات)',
  about: 'عن الجمعية',
  projects: 'المشاريع والبرامج',
  governance: 'الحوكمة',
  members: 'الأعضاء والمنسوبون والهيكل التنظيمي',
  media: 'المركز الإعلامي',
  beneficiaries: 'دراسات المستفيدين',
  volunteers: 'المتطوعون',
  jobs: 'الوظائف وطلبات التوظيف',
  messages: 'رسائل التواصل',
  pages: 'الصفحات',
  menu: 'القوائم',
  files: 'مكتبة الملفات',
  settings: 'الإعدادات والهوية البصرية',
  users: 'المستخدمون والصلاحيات',
  audit: 'سجل العمليات',
};
const VIEW_ONLY = new Set(['audit']);

function allPermissions() {
  const list = [];
  for (const [key, label] of Object.entries(MODULES)) {
    list.push({ key: `${key}.view`, label: `عرض: ${label}`, group_name: key });
    if (!VIEW_ONLY.has(key)) list.push({ key: `${key}.manage`, label: `إدارة: ${label}`, group_name: key });
  }
  return list;
}

/** هل يملك المستخدم صلاحية معينة؟ صلاحية manage تتضمن view */
function can(user, perm) {
  if (!user) return false;
  if (user.isSuper) return true;
  if (user.permissions.has(perm)) return true;
  if (perm.endsWith('.view')) return user.permissions.has(perm.replace(/\.view$/, '.manage'));
  return false;
}

module.exports = { MODULES, allPermissions, can };
