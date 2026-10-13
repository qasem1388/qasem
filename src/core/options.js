'use strict';
/** القوائم الثابتة المستخدمة في الحقول (القيمة المخزنة → التسمية العربية) */

function opts(map) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

module.exports = {
  opts,
  PUBLISH_STATUS: opts({ draft: 'مسودة', published: 'منشور', unpublished: 'غير منشور' }),
  VOLUNTEER_STATUS: opts({ new: 'جديد', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض', active: 'نشط' }),
  APPLICATION_STATUS: opts({ new: 'جديد', reviewed: 'تمت المراجعة', shortlisted: 'قائمة مختصرة', rejected: 'مرفوض', hired: 'تم التوظيف' }),
  MESSAGE_STATUS: opts({ new: 'جديدة', read: 'مقروءة', replied: 'تم الرد', archived: 'مؤرشفة' }),
  JOB_TYPE: opts({ full_time: 'دوام كامل', part_time: 'دوام جزئي', contract: 'عقد مؤقت', remote: 'عن بُعد', internship: 'تدريب' }),
  MEMBER_GROUP: opts({ general_assembly: 'أعضاء الجمعية العمومية', board: 'أعضاء مجلس الإدارة' }),
  MVV_KIND: opts({ mission: 'الرسالة', vision: 'الرؤية', values: 'القيم', other: 'أخرى' }),
  STAT_SCOPE: opts({ home: 'الصفحة الرئيسية', needs: 'دراسة الاحتياج', satisfaction: 'رضا المستفيدين' }),
  ABOUT_SECTION: opts({
    overview: 'نبذة عن الجمعية', history: 'تاريخ الجمعية', goals: 'الأهداف العامة',
    strategic_goals: 'الأهداف الاستراتيجية', mission: 'الرسالة', vision: 'الرؤية', values: 'القيم', custom: 'قسم مخصص',
  }),
  ORG_UNIT_TYPE: opts({
    board: 'مجلس / هيئة', committee: 'لجنة', management: 'إدارة عليا', department: 'إدارة',
    section: 'قسم', position: 'منصب / وظيفة',
  }),
  NEEDS_SECTION: opts({ intro: 'تعريف الدراسة', goals: 'أهداف الدراسة', results: 'نتائج الدراسة', reports: 'التقارير', other: 'أخرى' }),
  SATISFACTION_SECTION: opts({ intro: 'تعريف قياس الرضا', surveys: 'الاستبيانات', results: 'النتائج', reports: 'التقارير', other: 'أخرى' }),
  NAV_LOCATION: opts({ header: 'القائمة الرئيسية', footer: 'روابط مهمة (الفوتر)' }),
  NAV_LINK_TYPE: opts({ url: 'رابط مخصص / صفحة نظام', page: 'صفحة من الصفحات الديناميكية' }),
  SOCIAL_PLATFORM: opts({
    x: 'X (تويتر)', facebook: 'فيسبوك', instagram: 'إنستغرام', snapchat: 'سناب شات', youtube: 'يوتيوب',
    tiktok: 'تيك توك', whatsapp: 'واتساب', linkedin: 'لينكدإن', telegram: 'تيليجرام',
  }),
};
