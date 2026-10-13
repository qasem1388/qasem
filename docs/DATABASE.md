# مخطط قاعدة البيانات

المخطط معرّف في `src/db/migrations/20260101000000_initial_schema.js` ومتوافق مع **PostgreSQL** و **SQLite**.
- التواريخ (تاريخ الخبر، تاريخ الملف...) تُخزن كنص `YYYY-MM-DD` لتجنب مشاكل المناطق الزمنية.
- القوائم المركبة (صور داخل الخبر، المرفقات) تُخزن كنص JSON: `[{ "url": "...", "name": "...", "caption": "..." }]`.
- أغلب الجداول تحتوي على `sort_order` (ترتيب الظهور) و `is_active` (إظهار/إخفاء) و `created_at` / `updated_at`.
- المحتوى القابل للنشر يحتوي على `status`: `draft` (مسودة) / `published` (منشور) / `unpublished` (غير منشور)، وحقول SEO: `seo_title`, `seo_description`, `og_image`.

## العلاقات

```
roles 1───* users                     roles *───* permissions   (عبر role_permissions)
users 1───* audit_logs                users 1───* media_files (uploaded_by)
pages 1───* navigation_items (page_id)        navigation_items 1───* navigation_items (parent_id: قوائم منسدلة)
governance_years 1───* governance_files (حذف السنة يحذف ملفاتها)
news_categories 1───* news            albums 1───* media_images (حذف الألبوم يحذف صوره)
organizational_units 1───* organizational_units (parent_id: الهيكل الهرمي)
job_posts 1───* job_applications
```

## الجداول

| الجدول | المقابل في المتطلبات | الوصف |
|---|---|---|
| `users` | users | المستخدمون (المدراء). `password_hash` مشفر بـ bcrypt، `failed_logins` و `locked_until` للحماية من التخمين |
| `roles` | roles | الأدوار. `super_admin` يملك كل الصلاحيات؛ `is_system` يمنع الحذف |
| `permissions` | permissions | صلاحيات بصيغة `module.view` / `module.manage` |
| `role_permissions` | — | ربط الأدوار بالصلاحيات |
| `sessions` | — | جلسات تسجيل الدخول |
| `site_settings` | site_settings | الإعدادات (مفتاح/قيمة JSON): الهوية، الألوان، معلومات الجمعية، الفوتر، SEO، نصوص الصفحات |
| `homepage_slides` | homepage_slides | شرائح السلايدر: صورة، عنوان، وصف، زر ورابط اختياريان |
| `mission_vision_values` | values | الرسالة والرؤية والقيم (`kind`) مع أيقونة |
| `statistics` | statistics | الإحصائيات (`scope`: الرئيسية / دراسة الاحتياج / رضا المستفيدين) |
| `services` | services | مربعات "خدماتنا ومشاريعنا" في الرئيسية |
| `projects` | projects | المشاريع والبرامج بصفحات تفصيلية |
| `pages` | pages | الصفحات الديناميكية (`/page/:slug`) مع إظهار في القائمة/الفوتر |
| `navigation_items` | navigation_items | روابط القوائم (`location`: header/footer)، رابط مخصص أو صفحة، قوائم فرعية |
| `about_content` | about_content | أقسام صفحة "عن الجمعية" (نبذة، تاريخ، أهداف عامة، استراتيجية...) |
| `governance_years` | governance_years | سنوات الحوكمة |
| `governance_files` | governance_files | ملفات PDF لكل سنة |
| `members` | members | أعضاء الجمعية العمومية ومجلس الإدارة (`member_group`) |
| `employees` | employees | موظفو الجمعية |
| `executive_manager` | executive_manager | سجل واحد للمدير التنفيذي مع خيارات إظهار الهوية/الجوال/البريد |
| `organizational_units` | organizational_units | الإدارات والأقسام والمناصب بشكل هرمي |
| `news_categories` | — | تصنيفات الأخبار |
| `news` | news | الأخبار: صورة رئيسية، محتوى، تاريخ، كاتب، تصنيف، صور، فيديو، مرفقات |
| `media_videos` | media_videos | فيديوهات YouTube (`youtube_id` يُستخرج تلقائيًا) |
| `albums` | albums | ألبومات معرض الصور |
| `media_images` | media_images | صور الألبومات مع وصف وترتيب |
| `beneficiary_needs` | beneficiary_needs | أقسام دراسة احتياج المستفيدين مع مرفقات PDF |
| `satisfaction_surveys` | satisfaction_surveys | أقسام قياس الرضا: النتائج، نسبة الرضا، رابط الاستبيان، التقارير |
| `volunteers` | volunteers | طلبات التطوع، `status`: new/reviewed/accepted/rejected/active |
| `job_posts` | job_posts | الوظائف مع تواريخ بداية ونهاية الإعلان |
| `job_applications` | job_applications | طلبات التوظيف؛ `cv_file` مسار داخل التخزين الخاص |
| `contact_messages` | — | رسائل نموذج "تواصل معنا" |
| `media_files` | media_files | مكتبة الملفات (صور و PDF) |
| `social_links` | social_links | حسابات التواصل الاجتماعي (X، فيسبوك، إنستغرام، سناب شات، يوتيوب، تيك توك، واتساب...) |
| `audit_logs` | audit_logs | سجل العمليات: المستخدم، العملية، القسم، المعرف، التفاصيل، IP، المتصفح |

## الترحيلات المستقبلية

لأي تعديل على المخطط أنشئ ملفًا جديدًا في `src/db/migrations/` باسم يبدأ بالتاريخ (لا تعدّل الملفات القديمة بعد النشر)،
وسيُنفذ تلقائيًا عند التشغيل التالي أو عبر `npm run db:migrate`.
