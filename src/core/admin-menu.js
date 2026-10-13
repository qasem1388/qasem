'use strict';
/**
 * القائمة الجانبية للوحة التحكم.
 * route: r/<resource> للموارد العامة، settings/<group> للإعدادات، أو صفحة خاصة.
 */
module.exports = [
  { label: 'لوحة المعلومات', icon: 'fa-gauge-high', route: 'dashboard' },
  {
    label: 'الصفحة الرئيسية', icon: 'fa-house', children: [
      { label: 'إدارة الصفحة الرئيسية', icon: 'fa-sliders', route: 'settings/home' },
      { label: 'إدارة الشرائح', icon: 'fa-images', route: 'r/homepage_slides' },
      { label: 'الرسالة والرؤية والقيم', icon: 'fa-bullseye', route: 'r/mission_vision_values' },
      { label: 'الإحصائيات', icon: 'fa-chart-column', route: 'r/statistics' },
      { label: 'المشاريع والخدمات', icon: 'fa-hand-holding-heart', route: 'r/services' },
    ],
  },
  {
    label: 'إدارة الجمعية', icon: 'fa-building-ngo', children: [
      { label: 'عن الجمعية', icon: 'fa-circle-info', route: 'r/about_content' },
      { label: 'المشاريع والبرامج', icon: 'fa-diagram-project', route: 'r/projects' },
      { label: 'الحوكمة', icon: 'fa-scale-balanced', route: 'r/governance_years' },
      { label: 'ملفات الحوكمة', icon: 'fa-file-pdf', route: 'r/governance_files' },
      { label: 'الأعضاء والمنسوبون', icon: 'fa-users', route: 'r/members' },
      { label: 'موظفو الجمعية', icon: 'fa-id-badge', route: 'r/employees' },
      { label: 'المدير التنفيذي', icon: 'fa-user-tie', route: 'r/executive_manager' },
      { label: 'الهيكل التنظيمي', icon: 'fa-sitemap', route: 'r/organizational_units' },
    ],
  },
  {
    label: 'المركز الإعلامي', icon: 'fa-photo-film', children: [
      { label: 'الأخبار', icon: 'fa-newspaper', route: 'r/news' },
      { label: 'تصنيفات الأخبار', icon: 'fa-tags', route: 'r/news_categories' },
      { label: 'الفيديوهات', icon: 'fa-video', route: 'r/media_videos' },
      { label: 'معرض الصور', icon: 'fa-images', route: 'r/albums' },
    ],
  },
  {
    label: 'المستفيدون', icon: 'fa-people-roof', children: [
      { label: 'دراسة احتياج المستفيدين', icon: 'fa-magnifying-glass-chart', route: 'r/beneficiary_needs' },
      { label: 'رضا المستفيدين', icon: 'fa-face-smile', route: 'r/satisfaction_surveys' },
    ],
  },
  {
    label: 'التطوع والتوظيف', icon: 'fa-handshake-angle', children: [
      { label: 'المتطوعون', icon: 'fa-handshake-angle', route: 'r/volunteers', badge: 'volunteers_new' },
      { label: 'الوظائف', icon: 'fa-briefcase', route: 'r/job_posts' },
      { label: 'طلبات التوظيف', icon: 'fa-file-lines', route: 'r/job_applications', badge: 'applications_new' },
      { label: 'رسائل التواصل', icon: 'fa-envelope', route: 'r/contact_messages', badge: 'messages_new' },
    ],
  },
  {
    label: 'المحتوى', icon: 'fa-layer-group', children: [
      { label: 'الصفحات', icon: 'fa-file', route: 'r/pages' },
      { label: 'القائمة الرئيسية', icon: 'fa-bars', route: 'menu' },
      { label: 'الملفات', icon: 'fa-folder-open', route: 'media', perm: 'files.view' },
    ],
  },
  {
    label: 'الإعدادات', icon: 'fa-gear', children: [
      { label: 'الهوية البصرية', icon: 'fa-palette', route: 'settings/identity' },
      { label: 'إعدادات الموقع', icon: 'fa-building', route: 'settings/general' },
      { label: 'مواقع التواصل', icon: 'fa-share-nodes', route: 'r/social_links' },
      { label: 'الفوتر', icon: 'fa-table-columns', route: 'settings/footer' },
      { label: 'نصوص الصفحات', icon: 'fa-file-pen', route: 'settings/pages' },
      { label: 'إعدادات SEO', icon: 'fa-magnifying-glass', route: 'settings/seo' },
      { label: 'المستخدمون', icon: 'fa-user-shield', route: 'r/users' },
      { label: 'الأدوار والصلاحيات', icon: 'fa-key', route: 'r/roles' },
      { label: 'سجل العمليات', icon: 'fa-clock-rotate-left', route: 'r/audit_logs' },
    ],
  },
];
