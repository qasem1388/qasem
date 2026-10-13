'use strict';
/**
 * تعريف موارد نظام إدارة المحتوى (CMS Resources).
 *
 * كل مورد يصف جدولًا في قاعدة البيانات وحقوله وطريقة عرضه وإدارته.
 * يُستخدم هذا التعريف في مكانين:
 *   1) الخادم: واجهة API عامة (CRUD) + التحقق من المدخلات + الصلاحيات + سجل العمليات.
 *   2) لوحة التحكم: توليد الجداول والنماذج والفلاتر تلقائيًا.
 * لإضافة قسم جديد للنظام يكفي إضافة جدول (migration) وتعريف مورد هنا.
 *
 * أنواع الحقول: text, textarea, richtext, number, email, url, tel, date, select, relation,
 *   boolean, color, icon, image, file, images, files, slug, youtube, password, permissions, datetime
 */
const O = require('./options');
const { hashPassword } = require('./passwords');
const { youtubeId } = require('./youtube');

const nameF = (label = 'العنوان', name = 'title', extra = {}) => ({ name, label, type: 'text', required: true, max: 255, ...extra });
const activeF = { name: 'is_active', label: 'ظاهر للزوار', type: 'boolean', default: true };
const statusF = { name: 'status', label: 'حالة النشر', type: 'select', options: O.PUBLISH_STATUS, default: 'draft', required: true };
const seoFields = [
  { name: 'seo_title', label: 'عنوان SEO', type: 'text', max: 255, section: 'تحسين محركات البحث (SEO)', help: 'إذا تُرك فارغًا يُستخدم العنوان' },
  { name: 'seo_description', label: 'وصف Meta', type: 'textarea', max: 500 },
  { name: 'og_image', label: 'صورة المشاركة (Open Graph)', type: 'image' },
];

const resources = {
  // ================= الصفحة الرئيسية =================
  homepage_slides: {
    table: 'homepage_slides', label: 'الشرائح', singular: 'شريحة', icon: 'fa-images', permission: 'homepage',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'description'],
    listColumns: ['image', 'title', 'button_text', 'is_active'],
    help: 'المقاس المقترح للصور 1920×250 بكسل (تتكيف تلقائيًا مع الجوال والتابلت).',
    fields: [
      nameF(),
      { name: 'description', label: 'وصف مختصر', type: 'textarea', max: 500 },
      { name: 'image', label: 'صورة الخلفية', type: 'image', required: true, help: 'المقاس المقترح: 1920 × 250 بكسل' },
      { name: 'button_text', label: 'نص الزر (اختياري)', type: 'text', max: 100, width: 'half' },
      { name: 'button_url', label: 'رابط الزر (اختياري)', type: 'url', max: 500, width: 'half' },
      { name: 'open_new_tab', label: 'فتح الرابط في نافذة جديدة', type: 'boolean', default: false },
      activeF,
    ],
  },

  mission_vision_values: {
    table: 'mission_vision_values', label: 'الرسالة والرؤية والقيم', singular: 'عنصر', icon: 'fa-bullseye', permission: 'homepage',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'content'],
    listColumns: ['icon', 'title', 'kind', 'is_active'],
    fields: [
      { name: 'kind', label: 'النوع', type: 'select', options: O.MVV_KIND, required: true, default: 'mission' },
      nameF(),
      { name: 'content', label: 'النص', type: 'textarea', max: 2000 },
      { name: 'icon', label: 'الأيقونة', type: 'icon', default: 'fa-solid fa-bullseye' },
      activeF,
    ],
  },

  statistics: {
    table: 'statistics', label: 'الإحصائيات', singular: 'إحصائية', icon: 'fa-chart-column', permission: 'homepage',
    sortable: true, toggle: 'is_active', searchFields: ['label'], filters: ['scope'],
    listColumns: ['icon', 'label', 'value', 'scope', 'is_active'],
    fields: [
      { name: 'scope', label: 'مكان الظهور', type: 'select', options: O.STAT_SCOPE, default: 'home', required: true },
      nameF('العنوان', 'label'),
      { name: 'value', label: 'الرقم', type: 'number', required: true, default: 0, width: 'half' },
      { name: 'icon', label: 'الأيقونة', type: 'icon', default: 'fa-solid fa-users', width: 'half' },
      { name: 'prefix', label: 'بادئة (مثال: +)', type: 'text', max: 20, width: 'half' },
      { name: 'suffix', label: 'لاحقة (مثال: %)', type: 'text', max: 20, width: 'half' },
      activeF,
    ],
  },

  services: {
    table: 'services', label: 'الخدمات والمشاريع (الرئيسية)', singular: 'خدمة', icon: 'fa-hand-holding-heart', permission: 'homepage',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'description'],
    listColumns: ['image', 'title', 'is_active'],
    help: 'تظهر في قسم "خدماتنا ومشاريعنا" بالصفحة الرئيسية (3 مربعات في الصف على الكمبيوتر).',
    fields: [
      nameF('اسم الخدمة / المشروع'),
      { name: 'description', label: 'وصف مختصر', type: 'textarea', max: 1000 },
      { name: 'image', label: 'الصورة', type: 'image', help: 'تُستخدم الصورة إن وُجدت، وإلا تظهر الأيقونة' },
      { name: 'icon', label: 'الأيقونة', type: 'icon', default: 'fa-solid fa-hand-holding-heart' },
      { name: 'button_text', label: 'نص زر التفاصيل (اختياري)', type: 'text', max: 100, width: 'half' },
      { name: 'button_url', label: 'رابط التفاصيل (اختياري)', type: 'url', max: 500, width: 'half' },
      activeF,
    ],
  },

  projects: {
    table: 'projects', label: 'المشاريع والبرامج', singular: 'مشروع', icon: 'fa-diagram-project', permission: 'projects',
    sortable: true, status: 'status', searchFields: ['title', 'summary', 'category'], filters: ['status', 'category'],
    listColumns: ['image', 'title', 'category', 'status', 'is_featured'],
    preview: '/projects/{slug}',
    fields: [
      nameF('اسم المشروع'),
      { name: 'slug', label: 'الرابط (Slug)', type: 'slug', from: 'title', required: true },
      { name: 'category', label: 'التصنيف', type: 'text', max: 128, width: 'half', filterable: true },
      { name: 'beneficiaries', label: 'الفئة المستفيدة', type: 'text', max: 255, width: 'half' },
      { name: 'summary', label: 'وصف مختصر', type: 'textarea', max: 1000 },
      { name: 'content', label: 'التفاصيل', type: 'richtext' },
      { name: 'image', label: 'الصورة الرئيسية', type: 'image' },
      { name: 'gallery', label: 'صور المشروع', type: 'images' },
      { name: 'start_date', label: 'تاريخ البداية', type: 'date', width: 'half' },
      { name: 'end_date', label: 'تاريخ النهاية', type: 'date', width: 'half' },
      { name: 'is_featured', label: 'مشروع مميز', type: 'boolean', default: false },
      statusF,
      ...seoFields,
    ],
  },

  // ================= الجمعية =================
  about_content: {
    table: 'about_content', label: 'عن الجمعية', singular: 'قسم', icon: 'fa-circle-info', permission: 'about',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'content'],
    listColumns: ['icon', 'title', 'section_key', 'is_active'], preview: '/about',
    fields: [
      { name: 'section_key', label: 'نوع القسم', type: 'select', options: O.ABOUT_SECTION, required: true, default: 'overview' },
      nameF(),
      { name: 'icon', label: 'الأيقونة', type: 'icon', default: 'fa-solid fa-circle-info' },
      { name: 'content', label: 'المحتوى', type: 'richtext' },
      activeF,
    ],
  },

  governance_years: {
    table: 'governance_years', label: 'سنوات الحوكمة', singular: 'سنة', icon: 'fa-calendar', permission: 'governance',
    sortable: true, toggle: 'is_active', searchFields: ['title'], defaultOrder: [['year', 'desc']],
    listColumns: ['year', 'title', 'is_active'], preview: '/governance',
    labelField: 'year',
    children: [{ label: 'الملفات', resource: 'governance_files', fk: 'year_id', icon: 'fa-file-pdf' }],
    fields: [
      { name: 'year', label: 'السنة', type: 'number', required: true, min: 1900, max: 2200, unique: true },
      { name: 'title', label: 'عنوان (اختياري)', type: 'text', max: 255 },
      { name: 'description', label: 'وصف (اختياري)', type: 'textarea', max: 1000 },
      activeF,
    ],
  },

  governance_files: {
    table: 'governance_files', label: 'ملفات الحوكمة', singular: 'ملف', icon: 'fa-file-pdf', permission: 'governance',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'description'], filters: ['year_id'],
    listColumns: ['title', 'year_id', 'file_date', 'file_url', 'is_active'], preview: '/governance',
    fields: [
      { name: 'year_id', label: 'السنة', type: 'relation', relation: { resource: 'governance_years', labelField: 'year' }, required: true },
      nameF('اسم الملف'),
      { name: 'description', label: 'وصف (اختياري)', type: 'textarea', max: 1000 },
      { name: 'file_date', label: 'تاريخ الملف', type: 'date' },
      { name: 'file_url', label: 'ملف PDF', type: 'file', required: true },
      activeF,
    ],
  },

  members: {
    table: 'members', label: 'الأعضاء', singular: 'عضو', icon: 'fa-users', permission: 'members',
    sortable: true, toggle: 'is_active', searchFields: ['name', 'position'], filters: ['member_group'],
    listColumns: ['photo', 'name', 'position', 'member_group', 'is_active'], preview: '/members',
    labelField: 'name',
    fields: [
      { name: 'member_group', label: 'الفئة', type: 'select', options: O.MEMBER_GROUP, required: true, default: 'board' },
      nameF('الاسم', 'name'),
      { name: 'position', label: 'المسمى', type: 'text', max: 255 },
      { name: 'photo', label: 'الصورة', type: 'image' },
      { name: 'bio', label: 'نبذة', type: 'textarea', max: 3000 },
      { name: 'joined_at', label: 'تاريخ الانضمام (اختياري)', type: 'date' },
      activeF,
    ],
  },

  employees: {
    table: 'employees', label: 'موظفو الجمعية', singular: 'موظف', icon: 'fa-id-badge', permission: 'members',
    sortable: true, toggle: 'is_active', searchFields: ['name', 'position', 'department'],
    listColumns: ['photo', 'name', 'position', 'department', 'is_active'], preview: '/members',
    labelField: 'name',
    fields: [
      nameF('الاسم', 'name'),
      { name: 'position', label: 'المسمى الوظيفي', type: 'text', max: 255, width: 'half' },
      { name: 'department', label: 'الإدارة / القسم', type: 'text', max: 255, width: 'half' },
      { name: 'photo', label: 'الصورة', type: 'image' },
      { name: 'bio', label: 'نبذة', type: 'textarea', max: 3000 },
      { name: 'joined_at', label: 'تاريخ الانضمام (اختياري)', type: 'date' },
      activeF,
    ],
  },

  executive_manager: {
    table: 'executive_manager', label: 'المدير التنفيذي', singular: 'المدير التنفيذي', icon: 'fa-user-tie', permission: 'members',
    singleton: true, preview: '/executive-manager',
    fields: [
      { name: 'name', label: 'الاسم', type: 'text', required: true, max: 255 },
      { name: 'job_title', label: 'المسمى الوظيفي', type: 'text', max: 255 },
      { name: 'photo', label: 'الصورة', type: 'image' },
      { name: 'national_id', label: 'رقم الهوية', type: 'text', max: 20, pattern: '^[0-9]{10}$', patternMessage: 'رقم الهوية يجب أن يتكون من 10 أرقام', section: 'بيانات التواصل والهوية', width: 'half', sensitive: true },
      { name: 'show_national_id', label: 'إظهار رقم الهوية في الموقع (بيانات حساسة)', type: 'boolean', default: false, width: 'half' },
      { name: 'mobile', label: 'رقم الجوال', type: 'tel', max: 30, width: 'half' },
      { name: 'show_mobile', label: 'إظهار الجوال في الموقع', type: 'boolean', default: true, width: 'half' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', max: 255, width: 'half' },
      { name: 'show_email', label: 'إظهار البريد في الموقع', type: 'boolean', default: true, width: 'half' },
      { name: 'bio', label: 'نبذة', type: 'richtext' },
    ],
  },

  organizational_units: {
    table: 'organizational_units', label: 'الهيكل التنظيمي', singular: 'وحدة تنظيمية', icon: 'fa-sitemap', permission: 'members',
    sortable: true, toggle: 'is_active', searchFields: ['name', 'holder_name'], filters: ['unit_type', 'parent_id'],
    listColumns: ['name', 'unit_type', 'parent_id', 'holder_name', 'is_active'], preview: '/organizational-structure',
    labelField: 'name', treeField: 'parent_id',
    help: 'حدد "يتبع لـ" لبناء العلاقة بين الإدارات والأقسام والمناصب. يمكن أيضًا رفع صورة للهيكل من إعدادات الصفحات.',
    fields: [
      nameF('اسم الإدارة / القسم / المنصب', 'name'),
      { name: 'unit_type', label: 'النوع', type: 'select', options: O.ORG_UNIT_TYPE, required: true, default: 'department', width: 'half' },
      { name: 'parent_id', label: 'يتبع لـ', type: 'relation', relation: { resource: 'organizational_units', labelField: 'name' }, width: 'half', help: 'اتركه فارغًا ليكون في أعلى الهيكل' },
      { name: 'holder_name', label: 'اسم شاغل المنصب (اختياري)', type: 'text', max: 255 },
      { name: 'description', label: 'وصف (اختياري)', type: 'textarea', max: 1000 },
      activeF,
    ],
  },

  // ================= المركز الإعلامي =================
  news: {
    table: 'news', label: 'الأخبار', singular: 'خبر', icon: 'fa-newspaper', permission: 'media',
    status: 'status', searchFields: ['title', 'excerpt', 'author_name'], filters: ['status', 'category_id'],
    defaultOrder: [['published_at', 'desc'], ['id', 'desc']],
    listColumns: ['image', 'title', 'category_id', 'published_at', 'status'],
    preview: '/media-center/news/{slug}', trackCreator: true,
    fields: [
      nameF(),
      { name: 'slug', label: 'الرابط (Slug)', type: 'slug', from: 'title', required: true },
      { name: 'category_id', label: 'التصنيف', type: 'relation', relation: { resource: 'news_categories', labelField: 'name' }, width: 'half' },
      { name: 'author_name', label: 'الكاتب', type: 'text', max: 128, width: 'half' },
      { name: 'published_at', label: 'تاريخ الخبر', type: 'date', required: true, defaultToday: true, width: 'half' },
      { name: 'is_featured', label: 'خبر مميز', type: 'boolean', default: false, width: 'half' },
      { name: 'image', label: 'الصورة الرئيسية', type: 'image' },
      { name: 'excerpt', label: 'ملخص الخبر', type: 'textarea', max: 1000 },
      { name: 'content', label: 'المحتوى الكامل', type: 'richtext' },
      { name: 'gallery', label: 'صور داخل الخبر', type: 'images' },
      { name: 'video_url', label: 'فيديو YouTube (اختياري)', type: 'youtube' },
      { name: 'attachments', label: 'ملفات مرفقة (اختياري)', type: 'files' },
      statusF,
      ...seoFields,
    ],
  },

  news_categories: {
    table: 'news_categories', label: 'تصنيفات الأخبار', singular: 'تصنيف', icon: 'fa-tags', permission: 'media',
    sortable: true, toggle: 'is_active', searchFields: ['name'], listColumns: ['name', 'slug', 'is_active'], labelField: 'name',
    fields: [
      nameF('اسم التصنيف', 'name', { max: 128 }),
      { name: 'slug', label: 'الرابط (Slug)', type: 'slug', from: 'name', required: true },
      activeF,
    ],
  },

  media_videos: {
    table: 'media_videos', label: 'الفيديوهات', singular: 'فيديو', icon: 'fa-video', permission: 'media',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'description'],
    listColumns: ['thumbnail', 'title', 'video_date', 'is_active'], preview: '/media-center/videos',
    help: 'الفيديوهات تُضاف من YouTube فقط ولا تُرفع ملفات الفيديو إلى الخادم.',
    fields: [
      nameF('عنوان الفيديو'),
      { name: 'youtube_url', label: 'رابط YouTube', type: 'youtube', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea', max: 1000 },
      { name: 'thumbnail', label: 'صورة مصغرة (اختيارية)', type: 'image', help: 'إذا تُركت فارغة تُستخدم صورة YouTube تلقائيًا' },
      { name: 'video_date', label: 'التاريخ', type: 'date', defaultToday: true },
      activeF,
    ],
    hooks: {
      beforeSave(data) {
        if (data.youtube_url !== undefined) data.youtube_id = youtubeId(data.youtube_url) || '';
      },
    },
  },

  albums: {
    table: 'albums', label: 'معرض الصور', singular: 'ألبوم', icon: 'fa-photo-film', permission: 'media',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'description'],
    listColumns: ['cover_image', 'title', 'album_date', 'is_active'], preview: '/media-center/gallery/{slug}',
    labelField: 'title',
    children: [{ label: 'صور الألبوم', resource: 'media_images', fk: 'album_id', icon: 'fa-image' }],
    fields: [
      nameF('اسم الألبوم'),
      { name: 'slug', label: 'الرابط (Slug)', type: 'slug', from: 'title', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea', max: 1000 },
      { name: 'cover_image', label: 'صورة الغلاف', type: 'image' },
      { name: 'album_date', label: 'التاريخ', type: 'date', defaultToday: true },
      activeF,
    ],
  },

  media_images: {
    table: 'media_images', label: 'صور الألبومات', singular: 'صورة', icon: 'fa-image', permission: 'media',
    sortable: true, toggle: 'is_active', searchFields: ['caption'], filters: ['album_id'],
    listColumns: ['image', 'caption', 'album_id', 'is_active'],
    bulkImages: { field: 'image', parentField: 'album_id' }, hideInMenu: true,
    fields: [
      { name: 'album_id', label: 'الألبوم', type: 'relation', relation: { resource: 'albums', labelField: 'title' }, required: true },
      { name: 'image', label: 'الصورة', type: 'image', required: true },
      { name: 'caption', label: 'الوصف', type: 'text', max: 500 },
      activeF,
    ],
  },

  // ================= المستفيدون =================
  beneficiary_needs: {
    table: 'beneficiary_needs', label: 'دراسة احتياج المستفيدين', singular: 'قسم', icon: 'fa-magnifying-glass-chart', permission: 'beneficiaries',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'content'], filters: ['section_type'],
    listColumns: ['title', 'section_type', 'is_active'], preview: '/beneficiary-needs',
    fields: [
      { name: 'section_type', label: 'نوع القسم', type: 'select', options: O.NEEDS_SECTION, required: true, default: 'intro' },
      nameF(),
      { name: 'content', label: 'المحتوى (نص، صور، جداول)', type: 'richtext' },
      { name: 'attachments', label: 'ملفات PDF والتقارير', type: 'files' },
      activeF,
    ],
  },

  satisfaction_surveys: {
    table: 'satisfaction_surveys', label: 'قياس رضا المستفيدين', singular: 'قسم', icon: 'fa-face-smile', permission: 'beneficiaries',
    sortable: true, toggle: 'is_active', searchFields: ['title', 'content'], filters: ['section_type'],
    listColumns: ['title', 'section_type', 'survey_year', 'satisfaction_rate', 'is_active'], preview: '/beneficiary-satisfaction',
    fields: [
      { name: 'section_type', label: 'نوع القسم', type: 'select', options: O.SATISFACTION_SECTION, required: true, default: 'intro' },
      nameF(),
      { name: 'survey_year', label: 'السنة / الفترة', type: 'text', max: 10, width: 'half' },
      { name: 'satisfaction_rate', label: 'نسبة الرضا % (اختياري)', type: 'number', min: 0, max: 100, width: 'half' },
      { name: 'content', label: 'المحتوى', type: 'richtext' },
      { name: 'survey_url', label: 'رابط الاستبيان الإلكتروني (اختياري)', type: 'url', max: 500 },
      { name: 'attachments', label: 'ملفات PDF والتقارير', type: 'files' },
      activeF,
    ],
  },

  // ================= التطوع والتوظيف =================
  volunteers: {
    table: 'volunteers', label: 'المتطوعون', singular: 'متطوع', icon: 'fa-handshake-angle', permission: 'volunteers',
    canCreate: false, status: null, searchFields: ['full_name', 'national_id', 'mobile', 'email', 'city', 'specialization', 'skills'],
    filters: ['status', 'city'], defaultOrder: [['created_at', 'desc']],
    listColumns: ['full_name', 'mobile', 'city', 'specialization', 'status', 'created_at'],
    labelField: 'full_name', exportable: true,
    fields: [
      { name: 'status', label: 'حالة المتطوع', type: 'select', options: O.VOLUNTEER_STATUS, default: 'new', required: true, quickEdit: true },
      { name: 'admin_notes', label: 'ملاحظات الإدارة', type: 'textarea', max: 3000 },
      { name: 'full_name', label: 'الاسم', type: 'text', readonly: true, section: 'بيانات المتطوع' },
      { name: 'national_id', label: 'رقم الهوية', type: 'text', readonly: true, sensitive: true },
      { name: 'mobile', label: 'رقم الجوال', type: 'tel', readonly: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', readonly: true },
      { name: 'city', label: 'المدينة', type: 'text', readonly: true, filterable: true },
      { name: 'qualification', label: 'المؤهل', type: 'text', readonly: true },
      { name: 'specialization', label: 'التخصص', type: 'text', readonly: true },
      { name: 'skills', label: 'المهارات', type: 'textarea', readonly: true },
      { name: 'experience', label: 'الخبرات', type: 'textarea', readonly: true },
      { name: 'interests', label: 'المجالات المرغوبة', type: 'textarea', readonly: true },
      { name: 'availability', label: 'أوقات التفرغ', type: 'text', readonly: true },
      { name: 'notes', label: 'ملاحظات المتطوع', type: 'textarea', readonly: true },
      { name: 'created_at', label: 'تاريخ التسجيل', type: 'datetime', readonly: true },
    ],
  },

  job_posts: {
    table: 'job_posts', label: 'الوظائف', singular: 'وظيفة', icon: 'fa-briefcase', permission: 'jobs',
    sortable: true, status: 'status', searchFields: ['title', 'department', 'description'], filters: ['status', 'job_type'],
    listColumns: ['title', 'department', 'job_type', 'end_date', 'status'], preview: '/jobs/{slug}',
    labelField: 'title',
    children: [{ label: 'الطلبات', resource: 'job_applications', fk: 'job_id', icon: 'fa-file-lines' }],
    fields: [
      nameF('المسمى الوظيفي'),
      { name: 'slug', label: 'الرابط (Slug)', type: 'slug', from: 'title', required: true },
      { name: 'department', label: 'القسم', type: 'text', max: 255, width: 'half' },
      { name: 'job_type', label: 'نوع الوظيفة', type: 'select', options: O.JOB_TYPE, default: 'full_time', width: 'half' },
      { name: 'location', label: 'مقر العمل', type: 'text', max: 255 },
      { name: 'description', label: 'وصف الوظيفة', type: 'richtext' },
      { name: 'qualifications', label: 'المؤهلات', type: 'textarea', max: 5000, help: 'كل سطر يظهر كنقطة' },
      { name: 'experience', label: 'الخبرات', type: 'textarea', max: 5000, help: 'كل سطر يظهر كنقطة' },
      { name: 'skills', label: 'المهارات المطلوبة', type: 'textarea', max: 5000, help: 'كل سطر يظهر كنقطة' },
      { name: 'start_date', label: 'تاريخ بداية الإعلان', type: 'date', width: 'half', defaultToday: true },
      { name: 'end_date', label: 'تاريخ انتهاء الإعلان', type: 'date', width: 'half' },
      statusF,
      ...seoFields,
    ],
  },

  job_applications: {
    table: 'job_applications', label: 'طلبات التوظيف', singular: 'طلب', icon: 'fa-file-lines', permission: 'jobs',
    canCreate: false, searchFields: ['full_name', 'email', 'mobile', 'job_title'], filters: ['status', 'job_id'],
    defaultOrder: [['created_at', 'desc']],
    listColumns: ['full_name', 'job_id', 'mobile', 'cv_file', 'status', 'created_at'],
    labelField: 'full_name', exportable: true,
    fields: [
      { name: 'status', label: 'حالة الطلب', type: 'select', options: O.APPLICATION_STATUS, default: 'new', required: true, quickEdit: true },
      { name: 'admin_notes', label: 'ملاحظات الإدارة', type: 'textarea', max: 3000 },
      { name: 'job_id', label: 'الوظيفة', type: 'relation', relation: { resource: 'job_posts', labelField: 'title' }, readonly: true, section: 'بيانات المتقدم' },
      { name: 'full_name', label: 'الاسم', type: 'text', readonly: true },
      { name: 'mobile', label: 'رقم الجوال', type: 'tel', readonly: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', readonly: true },
      { name: 'qualification', label: 'المؤهل', type: 'text', readonly: true },
      { name: 'experience', label: 'الخبرات', type: 'textarea', readonly: true },
      { name: 'cv_file', label: 'السيرة الذاتية', type: 'privatefile', readonly: true },
      { name: 'message', label: 'رسالة للجهة', type: 'textarea', readonly: true },
      { name: 'created_at', label: 'تاريخ التقديم', type: 'datetime', readonly: true },
    ],
  },

  contact_messages: {
    table: 'contact_messages', label: 'رسائل التواصل', singular: 'رسالة', icon: 'fa-envelope', permission: 'messages',
    canCreate: false, searchFields: ['name', 'email', 'phone', 'subject', 'message'], filters: ['status'],
    defaultOrder: [['created_at', 'desc']], listColumns: ['name', 'subject', 'phone', 'status', 'created_at'], labelField: 'subject',
    fields: [
      { name: 'status', label: 'الحالة', type: 'select', options: O.MESSAGE_STATUS, default: 'new', required: true, quickEdit: true },
      { name: 'admin_notes', label: 'ملاحظات الإدارة', type: 'textarea', max: 3000 },
      { name: 'name', label: 'الاسم', type: 'text', readonly: true, section: 'الرسالة' },
      { name: 'email', label: 'البريد', type: 'email', readonly: true },
      { name: 'phone', label: 'الجوال', type: 'tel', readonly: true },
      { name: 'subject', label: 'الموضوع', type: 'text', readonly: true },
      { name: 'message', label: 'نص الرسالة', type: 'textarea', readonly: true },
      { name: 'created_at', label: 'التاريخ', type: 'datetime', readonly: true },
    ],
  },

  // ================= المحتوى =================
  pages: {
    table: 'pages', label: 'الصفحات', singular: 'صفحة', icon: 'fa-file', permission: 'pages',
    sortable: true, status: 'status', searchFields: ['name', 'title', 'slug'], filters: ['status'],
    listColumns: ['name', 'slug', 'show_in_menu', 'show_in_footer', 'status'],
    preview: '/page/{slug}', labelField: 'name', trackCreator: true,
    help: 'تظهر كل صفحة على الرابط /page/اسم-الرابط',
    fields: [
      nameF('اسم الصفحة', 'name', { width: 'half' }),
      { name: 'slug', label: 'رابط الصفحة (Slug)', type: 'slug', from: 'name', required: true, width: 'half' },
      nameF('العنوان الظاهر'),
      { name: 'content', label: 'المحتوى', type: 'richtext' },
      { name: 'image', label: 'صورة الصفحة', type: 'image' },
      { name: 'show_in_menu', label: 'إظهار في القائمة الرئيسية', type: 'boolean', default: false, width: 'half' },
      { name: 'show_in_footer', label: 'إظهار في الفوتر', type: 'boolean', default: false, width: 'half' },
      statusF,
      ...seoFields,
    ],
  },

  navigation_items: {
    table: 'navigation_items', label: 'القائمة الرئيسية', singular: 'رابط', icon: 'fa-bars', permission: 'menu',
    sortable: true, toggle: 'is_active', searchFields: ['label', 'url'], filters: ['location'],
    listColumns: ['label', 'link_type', 'url', 'is_active'], labelField: 'label', customView: 'menu',
    fields: [
      { name: 'location', label: 'موقع القائمة', type: 'select', options: O.NAV_LOCATION, default: 'header', required: true, width: 'half' },
      { name: 'parent_id', label: 'رابط أب (لقائمة منسدلة)', type: 'relation', relation: { resource: 'navigation_items', labelField: 'label' }, width: 'half' },
      { name: 'label', label: 'النص الظاهر', type: 'text', required: true, max: 128 },
      { name: 'link_type', label: 'نوع الرابط', type: 'select', options: O.NAV_LINK_TYPE, default: 'url', required: true },
      { name: 'page_id', label: 'الصفحة', type: 'relation', relation: { resource: 'pages', labelField: 'name' }, showIf: { link_type: 'page' } },
      { name: 'url', label: 'الرابط', type: 'url', max: 500, showIf: { link_type: 'url' }, help: 'مثال: /about أو /governance أو https://...', linkSuggestions: true },
      { name: 'open_new_tab', label: 'فتح في نافذة جديدة', type: 'boolean', default: false },
      activeF,
    ],
  },

  social_links: {
    table: 'social_links', label: 'مواقع التواصل', singular: 'حساب', icon: 'fa-share-nodes', permission: 'settings',
    sortable: true, toggle: 'is_active', searchFields: ['url', 'label'], listColumns: ['platform', 'url', 'is_active'],
    fields: [
      { name: 'platform', label: 'المنصة', type: 'select', options: O.SOCIAL_PLATFORM, required: true },
      { name: 'url', label: 'الرابط', type: 'url', required: true, max: 500, absolute: true },
      { name: 'label', label: 'اسم الحساب (اختياري)', type: 'text', max: 128 },
      activeF,
    ],
  },

  // ================= المستخدمون =================
  users: {
    table: 'users', label: 'المستخدمون', singular: 'مستخدم', icon: 'fa-user-shield', permission: 'users',
    searchFields: ['name', 'email'], filters: ['role_id'], toggle: 'is_active', labelField: 'name',
    listColumns: ['name', 'email', 'role_id', 'last_login_at', 'is_active'],
    fields: [
      nameF('الاسم', 'name', { max: 128 }),
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, max: 255, unique: true },
      { name: 'password', label: 'كلمة المرور', type: 'password', virtual: true, requiredOnCreate: true, minLength: 8, help: 'اتركها فارغة للإبقاء على كلمة المرور الحالية (8 أحرف على الأقل)' },
      { name: 'role_id', label: 'الدور', type: 'relation', relation: { resource: 'roles', labelField: 'label' }, required: true },
      { name: 'is_active', label: 'الحساب مفعّل', type: 'boolean', default: true },
      { name: 'last_login_at', label: 'آخر دخول', type: 'datetime', readonly: true },
    ],
    hooks: {
      async beforeSave(data, ctx) {
        if (ctx.input.password) data.password_hash = await hashPassword(ctx.input.password);
        if (!ctx.isNew && ctx.existing.id === ctx.user.id) {
          if (data.is_active === false) throw ctx.httpError(400, 'لا يمكنك تعطيل حسابك الحالي');
          if (data.role_id !== undefined && data.role_id !== ctx.existing.role_id && !ctx.user.isSuper) {
            throw ctx.httpError(400, 'لا يمكنك تغيير دورك الحالي');
          }
        }
      },
      beforeDelete(row, ctx) {
        if (row.id === ctx.user.id) throw ctx.httpError(400, 'لا يمكنك حذف حسابك الحالي');
      },
    },
  },

  roles: {
    table: 'roles', label: 'الأدوار والصلاحيات', singular: 'دور', icon: 'fa-key', permission: 'users',
    searchFields: ['name', 'label'], listColumns: ['label', 'name', 'description', 'is_system'], labelField: 'label',
    fields: [
      nameF('اسم الدور', 'label', { max: 128 }),
      { name: 'name', label: 'المعرّف البرمجي', type: 'slug', from: 'label', required: true, latinOnly: true, unique: true },
      { name: 'description', label: 'الوصف', type: 'textarea', max: 500 },
      { name: 'is_system', label: 'دور نظامي', type: 'boolean', readonly: true },
      { name: 'permissions', label: 'الصلاحيات', type: 'permissions', virtual: true },
    ],
    hooks: {
      beforeSave(data, ctx) {
        if (!ctx.isNew && ctx.existing.name === 'super_admin' && data.name && data.name !== 'super_admin') {
          throw ctx.httpError(400, 'لا يمكن تعديل معرّف دور المدير العام');
        }
      },
      beforeDelete(row, ctx) {
        if (row.is_system) throw ctx.httpError(400, 'لا يمكن حذف دور نظامي');
      },
    },
  },

  audit_logs: {
    table: 'audit_logs', label: 'سجل العمليات', singular: 'عملية', icon: 'fa-clock-rotate-left', permission: 'audit',
    canCreate: false, canEdit: false, canDelete: false, readOnly: true,
    searchFields: ['user_name', 'action', 'entity', 'details', 'ip'], filters: ['action', 'entity'],
    defaultOrder: [['id', 'desc']], listColumns: ['created_at', 'user_name', 'action', 'entity', 'entity_id', 'ip'],
    fields: [
      { name: 'created_at', label: 'الوقت', type: 'datetime', readonly: true },
      { name: 'user_name', label: 'المستخدم', type: 'text', readonly: true },
      { name: 'action', label: 'العملية', type: 'text', readonly: true, filterable: true },
      { name: 'entity', label: 'القسم', type: 'text', readonly: true, filterable: true },
      { name: 'entity_id', label: 'المعرّف', type: 'text', readonly: true },
      { name: 'details', label: 'التفاصيل', type: 'textarea', readonly: true },
      { name: 'ip', label: 'IP', type: 'text', readonly: true },
      { name: 'user_agent', label: 'المتصفح', type: 'text', readonly: true },
    ],
  },
};

// إكمال القيم الافتراضية لكل مورد
for (const [name, r] of Object.entries(resources)) {
  r.name = name;
  r.canCreate = r.canCreate !== false && !r.singleton;
  r.canEdit = r.canEdit !== false;
  r.canDelete = r.canDelete !== false && !r.singleton;
  r.searchFields = r.searchFields || [];
  r.filters = r.filters || [];
  r.labelField = r.labelField || 'title';
  if (!r.defaultOrder) r.defaultOrder = r.sortable ? [['sort_order', 'asc'], ['id', 'asc']] : [['id', 'desc']];
  if (r.status === undefined) r.status = r.fields.some((f) => f.name === 'status' && f.options === O.PUBLISH_STATUS) ? 'status' : null;
  r.fieldMap = Object.fromEntries(r.fields.map((f) => [f.name, f]));
}

/** الأعمدة الفعلية في الجدول التي يمكن قراءتها (تستثني الحقول الافتراضية وكلمات المرور) */
function selectableColumns(r) {
  const cols = new Set(['id']);
  for (const f of r.fields) if (!f.virtual) cols.add(f.name);
  if (r.sortable) cols.add('sort_order');
  if (r.toggle) cols.add(r.toggle);
  if (r.name === 'media_videos') cols.add('youtube_id');
  if (r.table !== 'audit_logs' && r.table !== 'executive_manager') {
    cols.add('created_at');
    cols.add('updated_at');
  }
  if (r.table === 'executive_manager') cols.add('updated_at');
  return [...cols];
}

/** نسخة قابلة للإرسال إلى لوحة التحكم (بدون الدوال) */
function publicMeta(r) {
  const { hooks, fieldMap, ...rest } = r;
  return JSON.parse(JSON.stringify(rest));
}

module.exports = { resources, selectableColumns, publicMeta };
