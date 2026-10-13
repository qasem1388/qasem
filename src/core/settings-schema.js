'use strict';
/**
 * مخطط إعدادات الموقع: كل مجموعة تظهر كصفحة/تبويب في لوحة التحكم.
 * القيم تُخزَّن في جدول site_settings (مفتاح ← قيمة) وتُطبق مباشرة على الموقع.
 */
const FONTS = [
  { value: 'Tajawal', label: 'تجوال Tajawal' },
  { value: 'Cairo', label: 'القاهرة Cairo' },
  { value: 'Almarai', label: 'المراعي Almarai' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' },
  { value: 'Noto Kufi Arabic', label: 'نوتو كوفي Noto Kufi Arabic' },
  { value: 'Readex Pro', label: 'ريدكس Readex Pro' },
];

const groups = {
  identity: {
    label: 'الهوية البصرية', icon: 'fa-palette', permission: 'settings',
    fields: [
      { name: 'org_name', label: 'اسم الجمعية', type: 'text', required: true, max: 255, default: 'جمعية الخير الأهلية' },
      { name: 'org_tagline', label: 'العبارة المختصرة أسفل الاسم', type: 'text', max: 255, default: 'معًا نصنع أثرًا مستدامًا' },
      { name: 'logo', label: 'شعار الجمعية', type: 'image', help: 'يفضل صورة PNG بخلفية شفافة' },
      { name: 'favicon', label: 'أيقونة المتصفح (Favicon)', type: 'image', help: 'صورة مربعة PNG بمقاس 512×512' },
      { name: 'color_primary', label: 'اللون الرئيسي', type: 'color', default: '#0f766e', width: 'third', section: 'الألوان' },
      { name: 'color_secondary', label: 'اللون الثانوي', type: 'color', default: '#c99a2e', width: 'third' },
      { name: 'color_button', label: 'لون الأزرار', type: 'color', default: '#0f766e', width: 'third' },
      { name: 'color_text', label: 'لون النصوص', type: 'color', default: '#1f2937', width: 'third' },
      { name: 'color_background', label: 'لون الخلفية', type: 'color', default: '#f7f8f6', width: 'third' },
      { name: 'color_footer', label: 'لون خلفية الفوتر', type: 'color', default: '#0b3b37', width: 'third' },
      { name: 'font_family', label: 'الخط المستخدم', type: 'select', options: FONTS, default: 'Tajawal', section: 'الخطوط' },
      { name: 'base_font_size', label: 'حجم الخط الأساسي (px)', type: 'number', min: 14, max: 22, default: 17, help: 'حجم أكبر يسهل القراءة لكبار السن' },
    ],
  },
  general: {
    label: 'معلومات الجمعية', icon: 'fa-building-ngo', permission: 'settings',
    fields: [
      { name: 'org_description', label: 'وصف الجمعية', type: 'textarea', max: 1000, default: '' },
      { name: 'license_number', label: 'رقم الترخيص', type: 'text', max: 64, width: 'half' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', max: 255, width: 'half' },
      { name: 'phone', label: 'الهاتف', type: 'tel', max: 30, width: 'half' },
      { name: 'mobile', label: 'الجوال', type: 'tel', max: 30, width: 'half' },
      { name: 'whatsapp_number', label: 'رقم واتساب (للتواصل السريع)', type: 'tel', max: 30, width: 'half' },
      { name: 'city', label: 'المدينة', type: 'text', max: 128, width: 'half' },
      { name: 'address', label: 'العنوان', type: 'text', max: 500 },
      { name: 'map_url', label: 'رابط Google Maps', type: 'url', max: 1000, absolute: true },
      { name: 'map_embed_url', label: 'رابط تضمين الخريطة (Embed)', type: 'url', max: 2000, absolute: true, help: 'من Google Maps: مشاركة ← تضمين خريطة ← انسخ قيمة src فقط' },
      { name: 'working_hours', label: 'أوقات العمل', type: 'text', max: 255 },
    ],
  },
  home: {
    label: 'إدارة الصفحة الرئيسية', icon: 'fa-house', permission: 'homepage',
    fields: [
      { name: 'home_about_text', label: 'نبذة مختصرة جدًا (سطرين كحد أقصى)', type: 'textarea', max: 300, default: '' },
      { name: 'home_about_link_text', label: 'نص رابط "المزيد"', type: 'text', max: 60, default: 'تعرّف علينا أكثر' },
      { name: 'home_show_slider', label: 'إظهار السلايدر', type: 'boolean', default: true, section: 'أقسام الصفحة', width: 'half' },
      { name: 'home_show_about', label: 'إظهار النبذة', type: 'boolean', default: true, width: 'half' },
      { name: 'home_show_mvv', label: 'إظهار الرسالة والرؤية والقيم', type: 'boolean', default: true, width: 'half' },
      { name: 'home_show_stats', label: 'إظهار الإحصائيات', type: 'boolean', default: true, width: 'half' },
      { name: 'home_show_services', label: 'إظهار خدماتنا ومشاريعنا', type: 'boolean', default: true, width: 'half' },
      { name: 'home_show_news', label: 'إظهار آخر الأخبار', type: 'boolean', default: true, width: 'half' },
      { name: 'home_stats_title', label: 'عنوان قسم الإحصائيات', type: 'text', max: 255, default: 'أثرنا بالأرقام', section: 'عناوين الأقسام' },
      { name: 'home_services_title', label: 'عنوان قسم الخدمات', type: 'text', max: 255, default: 'خدماتنا ومشاريعنا' },
      { name: 'home_services_subtitle', label: 'وصف قسم الخدمات', type: 'text', max: 500, default: '' },
      { name: 'home_news_title', label: 'عنوان قسم الأخبار', type: 'text', max: 255, default: 'آخر الأخبار' },
      { name: 'home_slider_interval', label: 'مدة عرض الشريحة (ثوانٍ)', type: 'number', min: 2, max: 30, default: 6 },
    ],
  },
  footer: {
    label: 'الفوتر', icon: 'fa-shoe-prints', permission: 'settings',
    fields: [
      { name: 'footer_about', label: 'نبذة مختصرة في الفوتر', type: 'textarea', max: 600, default: '' },
      { name: 'footer_copyright', label: 'نص حقوق النشر', type: 'text', max: 255, default: 'جميع الحقوق محفوظة', help: 'يُضاف اسم الجمعية والسنة تلقائيًا' },
      { name: 'footer_show_map', label: 'إظهار رابط الخريطة', type: 'boolean', default: true },
      { name: 'footer_links_title', label: 'عنوان عمود روابط الموقع', type: 'text', max: 100, default: 'روابط الموقع' },
      { name: 'footer_important_title', label: 'عنوان عمود الروابط المهمة', type: 'text', max: 100, default: 'روابط مهمة' },
    ],
  },
  pages: {
    label: 'نصوص الصفحات', icon: 'fa-file-pen', permission: 'settings',
    fields: [
      { name: 'governance_intro', label: 'مقدمة صفحة الحوكمة', type: 'textarea', max: 1000, default: '' },
      { name: 'members_intro', label: 'مقدمة صفحة الأعضاء', type: 'textarea', max: 1000, default: '' },
      { name: 'org_structure_mode', label: 'طريقة عرض الهيكل التنظيمي', type: 'select', default: 'chart', section: 'الهيكل التنظيمي',
        options: [{ value: 'chart', label: 'مخطط تفاعلي من البيانات' }, { value: 'image', label: 'صورة مرفوعة' }, { value: 'both', label: 'المخطط والصورة معًا' }] },
      { name: 'org_structure_image', label: 'صورة الهيكل التنظيمي', type: 'image' },
      { name: 'volunteer_intro', label: 'مقدمة صفحة التطوع', type: 'textarea', max: 1500, default: '', section: 'التطوع والوظائف' },
      { name: 'volunteer_areas', label: 'مجالات التطوع المتاحة', type: 'textarea', max: 2000, default: '', help: 'كل مجال في سطر مستقل' },
      { name: 'volunteer_success_message', label: 'رسالة نجاح تسجيل المتطوع', type: 'text', max: 500, default: 'شكرًا لك! تم تسجيل طلب التطوع بنجاح وسيتم التواصل معك قريبًا.' },
      { name: 'jobs_intro', label: 'مقدمة صفحة الوظائف', type: 'textarea', max: 1500, default: '' },
      { name: 'contact_intro', label: 'مقدمة صفحة تواصل معنا', type: 'textarea', max: 1000, default: '', section: 'تواصل معنا' },
    ],
  },
  seo: {
    label: 'إعدادات SEO', icon: 'fa-magnifying-glass', permission: 'settings',
    fields: [
      { name: 'seo_title', label: 'عنوان الموقع', type: 'text', max: 255, default: '' },
      { name: 'seo_description', label: 'وصف الموقع', type: 'textarea', max: 500, default: '' },
      { name: 'seo_keywords', label: 'الكلمات المفتاحية', type: 'text', max: 500, default: '', help: 'افصل بينها بفاصلة' },
      { name: 'seo_og_image', label: 'صورة Open Graph الافتراضية', type: 'image', help: 'المقاس المقترح 1200×630' },
      { name: 'seo_title_separator', label: 'فاصل العنوان', type: 'text', max: 5, default: '|' },
      { name: 'seo_allow_indexing', label: 'السماح لمحركات البحث بالأرشفة', type: 'boolean', default: true },
      { name: 'google_site_verification', label: 'رمز التحقق من Google Search Console', type: 'text', max: 255 },
    ],
  },
};

for (const g of Object.values(groups)) g.fieldMap = Object.fromEntries(g.fields.map((f) => [f.name, f]));

const defaults = {};
for (const g of Object.values(groups)) for (const f of g.fields) defaults[f.name] = f.default !== undefined ? f.default : null;

const FONT_VALUES = FONTS.map((f) => f.value);

module.exports = { groups, defaults, FONT_VALUES };
