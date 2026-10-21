import type { Field, ResourceDef } from "./types";

const L = { ar: "", en: "" };

const publishing = (extra: Field[] = []): ResourceDef["sections"][number] => ({
  title: "النشر",
  side: true,
  fields: [{ type: "boolean", name: "published", label: "منشور في الموقع" }, ...extra],
});

const slugField = (from = "title"): Field => ({
  type: "slug",
  name: "slug",
  label: "الرابط (بالإنجليزية)",
  from,
  hint: "يظهر في عنوان الصفحة، مثال: general-supply",
});

export const resources: ResourceDef[] = [
  {
    key: "services",
    model: "service",
    label: "الخدمات",
    singular: "خدمة",
    description: "الخدمات المعروضة في صفحة «خدماتنا». الخدمات المميزة تظهر في الصفحة الرئيسية.",
    sections: [
      {
        title: "البيانات الأساسية",
        fields: [
          { type: "localized", name: "title", label: "اسم الخدمة", required: true, max: 120 },
          { type: "localized", name: "summary", label: "وصف مختصر", required: true, max: 400, multiline: true },
          { type: "rich", name: "body", label: "تفاصيل الخدمة" },
        ],
      },
      { title: "المميزات", fields: [{ type: "features", name: "features", label: "مميزات الخدمة", max: 12 }] },
      {
        title: "الصور",
        fields: [
          { type: "image", name: "image", label: "الصورة الرئيسية", required: true },
          { type: "gallery", name: "gallery", label: "معرض الصور", max: 12 },
        ],
      },
      publishing([
        { type: "boolean", name: "featured", label: "مميزة (تظهر في الرئيسية)" },
        { type: "relation", name: "categoryId", label: "التصنيف", resource: "service-categories", required: true },
        { type: "icon", name: "icon", label: "الأيقونة" },
        slugField(),
      ]),
    ],
    list: { title: "title", subtitle: "summary", image: "image", relation: "categoryId" },
    orderField: "order",
    publishField: "published",
    featuredField: "featured",
    defaults: {
      title: L,
      summary: L,
      body: L,
      features: [],
      image: "",
      gallery: [],
      published: true,
      featured: false,
      icon: "briefcase",
      slug: "",
      categoryId: "",
    },
  },
  {
    key: "service-categories",
    model: "serviceCategory",
    label: "تصنيفات الخدمات",
    singular: "تصنيف",
    sections: [
      {
        title: "التصنيف",
        fields: [
          { type: "localized", name: "name", label: "اسم التصنيف", required: true, max: 80 },
          { ...slugField("name"), hint: "معرّف داخلي بالإنجليزية." },
        ],
      },
    ],
    list: { title: "name" },
    orderField: "order",
    defaults: { name: L, slug: "" },
  },
  {
    key: "projects",
    model: "project",
    label: "المشاريع",
    singular: "مشروع",
    description: "المشاريع المكتملة والجارية. المشاريع المميزة تظهر في الصفحة الرئيسية.",
    sections: [
      {
        title: "البيانات الأساسية",
        fields: [
          { type: "localized", name: "title", label: "اسم المشروع", required: true, max: 160 },
          { type: "localized", name: "summary", label: "وصف مختصر", required: true, max: 400, multiline: true },
          { type: "rich", name: "body", label: "وصف المشروع" },
          { type: "localizedList", name: "scope", label: "نطاق العمل", max: 12, itemLabel: "بند" },
        ],
      },
      {
        title: "بيانات المشروع",
        fields: [
          {
            type: "localized",
            name: "client",
            label: "العميل",
            max: 160,
            optional: true,
            hint: "اتركه فارغًا أو اكتب «اسم العميل محجوب» عند عدم الإذن بالنشر.",
          },
          { type: "localized", name: "location", label: "الموقع", required: true, max: 120 },
          { type: "number", name: "year", label: "السنة", min: 1950, max: 2100, integer: true },
        ],
      },
      {
        title: "الصور",
        fields: [
          { type: "image", name: "image", label: "الصورة الرئيسية", required: true },
          { type: "gallery", name: "gallery", label: "صور المشروع", max: 20 },
        ],
      },
      publishing([
        { type: "boolean", name: "featured", label: "مميز (يظهر في الرئيسية)" },
        {
          type: "select",
          name: "status",
          label: "الحالة",
          options: [
            { value: "COMPLETED", label: "مكتمل" },
            { value: "ONGOING", label: "قيد التنفيذ" },
          ],
        },
        { type: "relation", name: "sectorId", label: "القطاع", resource: "sectors" },
        slugField(),
      ]),
    ],
    list: { title: "title", subtitle: "location", image: "image", badges: ["status"], relation: "sectorId" },
    orderField: "order",
    publishField: "published",
    featuredField: "featured",
    defaults: {
      title: L,
      summary: L,
      body: L,
      scope: [],
      client: L,
      location: L,
      year: new Date().getFullYear(),
      image: "",
      gallery: [],
      published: true,
      featured: false,
      status: "COMPLETED",
      sectorId: "",
      slug: "",
    },
  },
  {
    key: "sectors",
    model: "sector",
    label: "القطاعات",
    singular: "قطاع",
    sections: [
      {
        title: "البيانات الأساسية",
        fields: [
          { type: "localized", name: "name", label: "اسم القطاع", required: true, max: 120 },
          { type: "localized", name: "summary", label: "وصف مختصر", required: true, max: 300, multiline: true },
          { type: "rich", name: "body", label: "تعريف القطاع" },
          { type: "localizedList", name: "challenges", label: "ما نركز عليه", max: 8, itemLabel: "نقطة" },
        ],
      },
      publishing([{ type: "icon", name: "icon", label: "الأيقونة" }, slugField("name")]),
    ],
    list: { title: "name", subtitle: "summary" },
    orderField: "order",
    publishField: "published",
    defaults: { name: L, summary: L, body: L, challenges: [], icon: "building", published: true, slug: "" },
  },
  {
    key: "news",
    model: "newsPost",
    label: "المركز الإعلامي",
    singular: "منشور",
    description: "الأخبار والمقالات والإعلانات والفعاليات. المنشورات ذات تاريخ النشر المستقبلي تظهر تلقائيًا في موعدها.",
    sections: [
      {
        title: "المحتوى",
        fields: [
          { type: "localized", name: "title", label: "العنوان", required: true, max: 200 },
          { type: "localized", name: "excerpt", label: "المقتطف", required: true, max: 400, multiline: true },
          { type: "rich", name: "body", label: "النص الكامل" },
          { type: "image", name: "image", label: "صورة الغلاف", required: true },
        ],
      },
      {
        title: "بيانات الفعالية (للفعاليات فقط)",
        fields: [
          { type: "date", name: "eventDate", label: "موعد الفعالية" },
          { type: "localized", name: "eventLocation", label: "مكان الفعالية", max: 160, optional: true },
        ],
      },
      publishing([
        {
          type: "select",
          name: "kind",
          label: "النوع",
          options: [
            { value: "NEWS", label: "خبر" },
            { value: "ARTICLE", label: "مقال" },
            { value: "ANNOUNCEMENT", label: "إعلان" },
            { value: "EVENT", label: "فعالية" },
          ],
        },
        { type: "date", name: "publishedAt", label: "تاريخ النشر", required: true },
        slugField(),
      ]),
    ],
    list: { title: "title", subtitle: "publishedAt", image: "image", badges: ["kind"] },
    sort: { field: "publishedAt", dir: "desc" },
    publishField: "published",
    defaults: {
      title: L,
      excerpt: L,
      body: L,
      image: "",
      kind: "NEWS",
      publishedAt: "",
      eventDate: "",
      eventLocation: L,
      published: true,
      slug: "",
    },
  },
  {
    key: "photos",
    model: "galleryPhoto",
    label: "معرض الصور",
    singular: "صورة",
    sections: [
      {
        title: "الصورة",
        fields: [
          { type: "image", name: "src", label: "الصورة", required: true },
          { type: "localized", name: "caption", label: "الوصف", required: true, max: 160 },
          {
            type: "localized",
            name: "album",
            label: "الألبوم",
            required: true,
            max: 60,
            hint: "مثل: المشاريع، الفعاليات، فريق العمل.",
          },
        ],
      },
    ],
    list: { title: "caption", subtitle: "album", image: "src" },
    orderField: "order",
    defaults: { src: "", caption: L, album: L },
  },
  {
    key: "videos",
    model: "video",
    label: "معرض الفيديو",
    singular: "فيديو",
    sections: [
      {
        title: "الفيديو",
        fields: [
          { type: "localized", name: "title", label: "العنوان", required: true, max: 160 },
          {
            type: "text",
            name: "youtubeId",
            label: "معرّف YouTube",
            dir: "ltr",
            max: 20,
            pattern: "^[A-Za-z0-9_-]{11}$",
            patternMessage: "المعرّف 11 حرفًا، مثل dQw4w9WgXcQ من الرابط youtube.com/watch?v=dQw4w9WgXcQ",
            hint: "اتركه فارغًا ليُفتح رابط قناة الشركة بدلًا من التشغيل.",
          },
          {
            type: "text",
            name: "duration",
            label: "المدة",
            dir: "ltr",
            required: true,
            max: 10,
            pattern: "^\\d{1,2}:\\d{2}(:\\d{2})?$",
            patternMessage: "بالصيغة 3:45",
          },
          { type: "image", name: "poster", label: "صورة الغلاف", required: true },
        ],
      },
    ],
    list: { title: "title", subtitle: "duration", image: "poster" },
    orderField: "order",
    defaults: { title: L, youtubeId: "", duration: "", poster: "" },
  },
  {
    key: "clients",
    model: "client",
    label: "العملاء والشركاء",
    singular: "شريك",
    sections: [
      {
        title: "بيانات الشريك",
        fields: [
          { type: "localized", name: "name", label: "الاسم", required: true, max: 120 },
          { type: "image", name: "logo", label: "الشعار", required: true, aspect: "logo" },
          { type: "url", name: "url", label: "الموقع الإلكتروني (اختياري)" },
        ],
      },
      publishing(),
    ],
    list: { title: "name", image: "logo" },
    orderField: "order",
    publishField: "published",
    defaults: { name: L, logo: "", url: "", published: true },
  },
  {
    key: "testimonials",
    model: "testimonial",
    label: "آراء العملاء",
    singular: "رأي",
    description: "انشر فقط آراء حقيقية بموافقة أصحابها.",
    sections: [
      {
        title: "الرأي",
        fields: [
          { type: "localized", name: "quote", label: "نص الرأي", required: true, max: 600, multiline: true },
          { type: "localized", name: "author", label: "صاحب الرأي", required: true, max: 100 },
          { type: "localized", name: "role", label: "المنصب / الجهة", required: true, max: 120 },
          { type: "number", name: "rating", label: "التقييم (1–5)", min: 1, max: 5, integer: true },
        ],
      },
      publishing(),
    ],
    list: { title: "author", subtitle: "role" },
    orderField: "order",
    publishField: "published",
    defaults: { quote: L, author: L, role: L, rating: 5, published: true },
  },
  {
    key: "stories",
    model: "successStory",
    label: "قصص النجاح",
    singular: "قصة نجاح",
    sections: [
      {
        title: "القصة",
        fields: [
          { type: "localized", name: "title", label: "العنوان", required: true, max: 160 },
          { type: "localized", name: "challenge", label: "التحدي", required: true, max: 400, multiline: true },
          { type: "localized", name: "solution", label: "الحل", required: true, max: 400, multiline: true },
          { type: "localized", name: "result", label: "النتيجة", required: true, max: 400, multiline: true },
        ],
      },
      {
        title: "الرقم البارز",
        fields: [
          { type: "text", name: "metricValue", label: "القيمة", required: true, max: 12, dir: "ltr", hint: "مثل 35% أو 40" },
          { type: "localized", name: "metricLabel", label: "وصف القيمة", required: true, max: 60 },
        ],
      },
      publishing([{ type: "relation", name: "sectorId", label: "القطاع", resource: "sectors" }]),
    ],
    list: { title: "title", relation: "sectorId" },
    orderField: "order",
    publishField: "published",
    defaults: { title: L, challenge: L, solution: L, result: L, metricValue: "", metricLabel: L, sectorId: "", published: true },
  },
  {
    key: "faqs",
    model: "faq",
    label: "الأسئلة الشائعة",
    singular: "سؤال",
    sections: [
      {
        title: "السؤال والإجابة",
        fields: [
          {
            type: "localized",
            name: "category",
            label: "التصنيف",
            required: true,
            max: 60,
            hint: "الأسئلة ذات التصنيف نفسه تُجمع معًا.",
          },
          { type: "localized", name: "question", label: "السؤال", required: true, max: 200 },
          { type: "localized", name: "answer", label: "الإجابة", required: true, max: 1500, multiline: true, rows: 5 },
        ],
      },
    ],
    list: { title: "question", subtitle: "category" },
    orderField: "order",
    defaults: { category: L, question: L, answer: L },
  },
  {
    key: "jobs",
    model: "job",
    label: "الوظائف",
    singular: "وظيفة",
    description: "الوظائف المفتوحة تظهر في صفحة التوظيف مع نموذج التقديم.",
    sections: [
      {
        title: "الوظيفة",
        fields: [
          { type: "localized", name: "title", label: "المسمى الوظيفي", required: true, max: 120 },
          { type: "localized", name: "summary", label: "نبذة", required: true, max: 500, multiline: true },
          { type: "localizedList", name: "responsibilities", label: "المهام والمسؤوليات", max: 15, itemLabel: "مهمة" },
          { type: "localizedList", name: "requirements", label: "المتطلبات", max: 15, itemLabel: "متطلب" },
        ],
      },
      {
        title: "التفاصيل",
        fields: [
          { type: "localized", name: "department", label: "القسم", required: true, max: 80 },
          { type: "localized", name: "location", label: "الموقع", required: true, max: 80 },
          { type: "localized", name: "experience", label: "الخبرة المطلوبة", required: true, max: 80 },
        ],
      },
      {
        title: "النشر",
        side: true,
        fields: [
          { type: "boolean", name: "open", label: "الوظيفة متاحة للتقديم" },
          {
            type: "select",
            name: "type",
            label: "نوع الدوام",
            options: [
              { value: "FULL_TIME", label: "دوام كامل" },
              { value: "PART_TIME", label: "دوام جزئي" },
              { value: "CONTRACT", label: "عقد" },
              { value: "INTERNSHIP", label: "تدريب" },
            ],
          },
          { type: "date", name: "postedAt", label: "تاريخ النشر", required: true },
          slugField(),
        ],
      },
    ],
    list: { title: "title", subtitle: "location", badges: ["type"] },
    sort: { field: "postedAt", dir: "desc" },
    publishField: "open",
    defaults: {
      title: L,
      summary: L,
      responsibilities: [],
      requirements: [],
      department: L,
      location: L,
      experience: L,
      open: true,
      type: "FULL_TIME",
      postedAt: "",
      slug: "",
    },
  },
];

export const resourceByKey = Object.fromEntries(resources.map((r) => [r.key, r])) as Record<string, ResourceDef>;

export function allFields(def: ResourceDef) {
  return def.sections.flatMap((s) => s.fields);
}
