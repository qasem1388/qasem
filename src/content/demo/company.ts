import type { AboutPage, Branch, Faq, GalleryPhoto, Job, LegalPage, SuccessStory, Video } from "@/types/content";

/** Team names and certificates are illustrative placeholders — replace before launch. */
export const aboutPage: AboutPage = {
  intro: {
    ar: "تأسست شركة الريادة التجارية عام 2010 في مدينة الرياض بهدف تقديم حلول تجارية متكاملة تجمع بين التوريد والمقاولات والخدمات اللوجستية والاستشارات تحت مظلة واحدة.\n\nعلى مدى أكثر من خمسة عشر عامًا، نمت الشركة لتخدم عملاء في القطاعين العام والخاص في مختلف مناطق المملكة، معتمدة على فريق من الكفاءات الوطنية وشبكة شركاء موثوقة.\n\nنؤمن بأن النجاح الحقيقي يُقاس بنجاح عملائنا، ولذلك نبني علاقات طويلة الأمد قائمة على الثقة والشفافية والالتزام.",
    en: "Al-Riyada Trading Company was founded in Riyadh in 2010 to provide integrated business solutions that bring procurement, contracting, logistics and advisory under one roof.\n\nOver more than fifteen years the company has grown to serve public and private clients across the Kingdom, powered by national talent and a trusted partner network.\n\nWe believe real success is measured by our clients’ success, so we build long-term relationships founded on trust, transparency and commitment.",
  },
  image: "/demo/about.svg",
  values: [
    {
      icon: "shield",
      title: { ar: "النزاهة", en: "Integrity" },
      body: { ar: "نلتزم بالشفافية والأمانة في جميع تعاملاتنا.", en: "Transparency and honesty in all our dealings." },
    },
    {
      icon: "badge",
      title: { ar: "الجودة", en: "Quality" },
      body: { ar: "نعمل وفق معايير واضحة ونراجع أداءنا باستمرار.", en: "Clear standards and continuous performance review." },
    },
    {
      icon: "idea",
      title: { ar: "الابتكار", en: "Innovation" },
      body: { ar: "نبحث دائمًا عن طرق أفضل لخدمة عملائنا.", en: "Always seeking better ways to serve our clients." },
    },
    {
      icon: "handshake",
      title: { ar: "الشراكة", en: "Partnership" },
      body: { ar: "نعتبر نجاح عملائنا وشركائنا نجاحًا لنا.", en: "Our clients’ and partners’ success is our success." },
    },
    {
      icon: "users",
      title: { ar: "روح الفريق", en: "Teamwork" },
      body: { ar: "نعمل كفريق واحد بأهداف مشتركة.", en: "One team with shared goals." },
    },
    {
      icon: "leaf",
      title: { ar: "الاستدامة", en: "Sustainability" },
      body: { ar: "نراعي الأثر البيئي والاجتماعي لأعمالنا.", en: "Mindful of our environmental and social impact." },
    },
  ],
  goals: [
    {
      ar: "التوسع في جميع مناطق المملكة عبر شبكة فروع متكاملة.",
      en: "Expand across all regions through an integrated branch network.",
    },
    { ar: "رفع نسبة المحتوى المحلي في سلاسل الإمداد.", en: "Increase local content across our supply chains." },
    {
      ar: "التحول الرقمي الكامل في إدارة المشاريع والخدمات.",
      en: "Full digital transformation of project and service management.",
    },
    { ar: "تطوير الكفاءات الوطنية وتمكين الشباب.", en: "Develop national talent and empower young people." },
  ],
  history: [
    {
      year: 2010,
      title: { ar: "التأسيس", en: "Founded" },
      body: { ar: "انطلاق الشركة في الرياض بنشاط التوريدات العامة.", en: "Launched in Riyadh focusing on general supplies." },
    },
    {
      year: 2014,
      title: { ar: "دخول قطاع المقاولات", en: "Entering contracting" },
      body: { ar: "إضافة خدمات التشطيب والصيانة للمباني.", en: "Added fit-out and building maintenance services." },
    },
    {
      year: 2018,
      title: { ar: "الخدمات اللوجستية", en: "Logistics services" },
      body: {
        ar: "إطلاق قسم النقل والتخزين وافتتاح أول مستودع.",
        en: "Launched transport and warehousing with our first warehouse.",
      },
    },
    {
      year: 2022,
      title: { ar: "التوسع الإقليمي", en: "Regional expansion" },
      body: { ar: "افتتاح فرع جدة وإطلاق خدمات الاستشارات.", en: "Opened the Jeddah branch and launched advisory services." },
    },
    {
      year: 2026,
      title: { ar: "المنطقة الشرقية", en: "Eastern Province" },
      body: { ar: "افتتاح فرع الدمام ضمن خطة التوسع.", en: "Opened the Dammam branch as part of our expansion plan." },
    },
  ],
  leaderMessage: {
    name: { ar: "رئيس مجلس الإدارة", en: "Chairman of the Board" },
    role: { ar: "كلمة رئيس مجلس الإدارة", en: "Chairman’s message" },
    body: {
      ar: "منذ اليوم الأول، كان هدفنا أن نكون شريكًا يُعتمد عليه، لا مجرد مزود خدمة. وقد قطعنا شوطًا كبيرًا بفضل الله ثم بثقة عملائنا وجهود فريقنا.\n\nنتطلع إلى المستقبل بطموح يواكب رؤية المملكة 2030، ونواصل الاستثمار في الإنسان والتقنية لنقدم قيمة حقيقية ومستدامة.",
      en: "From day one our aim has been to be a dependable partner, not just a service provider. We have come a long way thanks to our clients’ trust and our team’s dedication.\n\nWe look ahead with ambition aligned with Saudi Vision 2030, continuing to invest in people and technology to deliver real, lasting value.",
    },
  },
  team: [
    {
      id: "ceo",
      name: { ar: "م. فيصل", en: "Eng. Faisal" },
      role: { ar: "الرئيس التنفيذي", en: "Chief Executive Officer" },
      bio: { ar: "خبرة تتجاوز 20 عامًا في إدارة الأعمال.", en: "20+ years in business leadership." },
    },
    {
      id: "coo",
      name: { ar: "أ. نورة", en: "Ms. Noura" },
      role: { ar: "مديرة العمليات", en: "Chief Operating Officer" },
      bio: { ar: "متخصصة في تطوير العمليات والجودة.", en: "Specialist in operations and quality." },
    },
    {
      id: "cfo",
      name: { ar: "أ. عبدالله", en: "Mr. Abdullah" },
      role: { ar: "المدير المالي", en: "Chief Financial Officer" },
      bio: { ar: "خبرة في التخطيط المالي والحوكمة.", en: "Experienced in financial planning and governance." },
    },
    {
      id: "pm",
      name: { ar: "م. سارة", en: "Eng. Sarah" },
      role: { ar: "مديرة المشاريع", en: "Head of Projects" },
      bio: { ar: "قيادة مشاريع إنشائية وتقنية كبرى.", en: "Leads major construction and technical projects." },
    },
    {
      id: "scm",
      name: { ar: "أ. خالد", en: "Mr. Khalid" },
      role: { ar: "مدير سلاسل الإمداد", en: "Head of Supply Chain" },
      bio: { ar: "بناء شبكات توريد محلية ودولية.", en: "Builds local and international supply networks." },
    },
    {
      id: "hr",
      name: { ar: "أ. ريم", en: "Ms. Reem" },
      role: { ar: "مديرة الموارد البشرية", en: "Head of HR" },
      bio: { ar: "تطوير الكفاءات وبيئة العمل.", en: "Talent development and workplace culture." },
    },
  ],
  orgChart: {
    id: "board",
    title: { ar: "مجلس الإدارة", en: "Board of Directors" },
    children: [
      {
        id: "ceo",
        title: { ar: "الرئيس التنفيذي", en: "CEO" },
        children: [
          {
            id: "ops",
            title: { ar: "العمليات", en: "Operations" },
            children: [
              { id: "proj", title: { ar: "المشاريع", en: "Projects" } },
              { id: "fm", title: { ar: "إدارة المرافق", en: "Facilities" } },
            ],
          },
          {
            id: "scm",
            title: { ar: "سلاسل الإمداد", en: "Supply Chain" },
            children: [
              { id: "proc", title: { ar: "المشتريات", en: "Procurement" } },
              { id: "log", title: { ar: "اللوجستيات", en: "Logistics" } },
            ],
          },
          { id: "fin", title: { ar: "المالية", en: "Finance" } },
          { id: "hr", title: { ar: "الموارد البشرية", en: "Human Resources" } },
          { id: "bd", title: { ar: "تطوير الأعمال", en: "Business Development" } },
        ],
      },
    ],
  },
  certifications: [
    {
      id: "c1",
      icon: "badge",
      title: { ar: "شهادة نظام إدارة الجودة", en: "Quality Management System Certificate" },
      issuer: { ar: "جهة مانحة (مثال توضيحي)", en: "Certifying body (illustrative)" },
      year: 2024,
    },
    {
      id: "c2",
      icon: "shield",
      title: { ar: "شهادة الصحة والسلامة المهنية", en: "Occupational Health & Safety Certificate" },
      issuer: { ar: "جهة مانحة (مثال توضيحي)", en: "Certifying body (illustrative)" },
      year: 2024,
    },
    {
      id: "c3",
      icon: "leaf",
      title: { ar: "شهادة نظام الإدارة البيئية", en: "Environmental Management Certificate" },
      issuer: { ar: "جهة مانحة (مثال توضيحي)", en: "Certifying body (illustrative)" },
      year: 2023,
    },
    {
      id: "c4",
      icon: "government",
      title: { ar: "التصنيف لدى الجهات الحكومية", en: "Government contractor classification" },
      issuer: { ar: "جهة حكومية (مثال توضيحي)", en: "Government authority (illustrative)" },
      year: 2025,
    },
    {
      id: "c5",
      icon: "award",
      title: { ar: "عضوية الغرفة التجارية", en: "Chamber of Commerce membership" },
      issuer: { ar: "الغرفة التجارية (مثال توضيحي)", en: "Chamber of Commerce (illustrative)" },
      year: 2026,
    },
    {
      id: "c6",
      icon: "gem",
      title: { ar: "شهادة المحتوى المحلي", en: "Local Content Certificate" },
      issuer: { ar: "جهة مانحة (مثال توضيحي)", en: "Certifying body (illustrative)" },
      year: 2025,
    },
  ],
};

export const branches: Branch[] = [
  {
    id: "riyadh",
    isMain: true,
    name: { ar: "المقر الرئيسي — الرياض", en: "Head Office — Riyadh" },
    address: { ar: "طريق الملك فهد، حي العليا، الرياض 12211", en: "King Fahd Road, Al Olaya, Riyadh 12211" },
    phone: "+966110000000",
    phoneDisplay: "011 000 0000",
    email: "info@example.com",
    hours: { ar: "الأحد – الخميس: 8:00 ص – 5:00 م", en: "Sun – Thu: 8:00 AM – 5:00 PM" },
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: "jeddah",
    name: { ar: "فرع جدة", en: "Jeddah Branch" },
    address: { ar: "طريق الملك عبدالعزيز، حي الشاطئ، جدة 23411", en: "King Abdulaziz Road, Al Shati, Jeddah 23411" },
    phone: "+966120000000",
    phoneDisplay: "012 000 0000",
    email: "jeddah@example.com",
    hours: { ar: "الأحد – الخميس: 8:00 ص – 5:00 م", en: "Sun – Thu: 8:00 AM – 5:00 PM" },
    lat: 21.5433,
    lng: 39.1728,
  },
  {
    id: "dammam",
    name: { ar: "فرع الدمام", en: "Dammam Branch" },
    address: { ar: "طريق الملك سعود، حي الفيصلية، الدمام 32272", en: "King Saud Road, Al Faisaliyah, Dammam 32272" },
    phone: "+966130000000",
    phoneDisplay: "013 000 0000",
    email: "dammam@example.com",
    hours: { ar: "الأحد – الخميس: 8:00 ص – 5:00 م", en: "Sun – Thu: 8:00 AM – 5:00 PM" },
    lat: 26.4207,
    lng: 50.0888,
  },
];

const L = (ar: string, en: string) => ({ ar, en });

export const jobs: Job[] = [
  {
    slug: "project-engineer",
    title: L("مهندس مشاريع", "Project Engineer"),
    department: L("إدارة المشاريع", "Projects"),
    location: L("الرياض", "Riyadh"),
    type: "full-time",
    experience: L("3 – 5 سنوات", "3 – 5 years"),
    postedAt: "2026-10-01",
    summary: L(
      "نبحث عن مهندس مشاريع لمتابعة تنفيذ مشاريع التشطيب والصيانة وضمان الجودة والالتزام بالجداول الزمنية.",
      "We are looking for a project engineer to oversee fit-out and maintenance projects, ensuring quality and schedule adherence.",
    ),
    responsibilities: [
      L("متابعة أعمال التنفيذ في الموقع يوميًا.", "Supervise daily site execution."),
      L("إعداد تقارير التقدم الأسبوعية.", "Prepare weekly progress reports."),
      L("التنسيق مع المقاولين والموردين.", "Coordinate with subcontractors and suppliers."),
      L("مراجعة المخططات وجداول الكميات.", "Review drawings and bills of quantities."),
    ],
    requirements: [
      L("بكالوريوس هندسة مدنية أو معمارية.", "Bachelor’s in civil or architectural engineering."),
      L("عضوية الهيئة السعودية للمهندسين.", "Saudi Council of Engineers membership."),
      L("إجادة برامج إدارة المشاريع.", "Proficiency in project management software."),
      L("مهارات تواصل ممتازة.", "Excellent communication skills."),
    ],
    open: true,
  },
  {
    slug: "procurement-specialist",
    title: L("أخصائي مشتريات", "Procurement Specialist"),
    department: L("سلاسل الإمداد", "Supply Chain"),
    location: L("جدة", "Jeddah"),
    type: "full-time",
    experience: L("2 – 4 سنوات", "2 – 4 years"),
    postedAt: "2026-09-20",
    summary: L(
      "إدارة عمليات الشراء وتقييم الموردين والتفاوض للحصول على أفضل قيمة.",
      "Manage purchasing, evaluate suppliers and negotiate for best value.",
    ),
    responsibilities: [
      L("طلب عروض الأسعار ومقارنتها.", "Request and compare quotations."),
      L("إصدار أوامر الشراء ومتابعتها.", "Issue and follow up purchase orders."),
      L("تقييم أداء الموردين.", "Evaluate supplier performance."),
    ],
    requirements: [
      L("بكالوريوس في إدارة الأعمال أو سلاسل الإمداد.", "Bachelor’s in business or supply chain."),
      L("خبرة في أنظمة ERP.", "Experience with ERP systems."),
      L("مهارات تفاوض وتحليل.", "Negotiation and analytical skills."),
    ],
    open: true,
  },
  {
    slug: "logistics-coordinator",
    title: L("منسق عمليات لوجستية", "Logistics Coordinator"),
    department: L("اللوجستيات", "Logistics"),
    location: L("الدمام", "Dammam"),
    type: "full-time",
    experience: L("1 – 3 سنوات", "1 – 3 years"),
    postedAt: "2026-09-05",
    summary: L(
      "تنسيق عمليات الشحن والتخزين والتوزيع لضمان التسليم في الوقت المحدد.",
      "Coordinate shipping, storage and distribution to ensure on-time delivery.",
    ),
    responsibilities: [
      L("جدولة الشحنات ومتابعتها.", "Schedule and track shipments."),
      L("إدارة المخزون في المستودع.", "Manage warehouse inventory."),
      L("التواصل مع العملاء بشأن التسليم.", "Communicate with clients on deliveries."),
    ],
    requirements: [
      L("دبلوم أو بكالوريوس في مجال ذي صلة.", "Diploma or bachelor’s in a related field."),
      L("رخصة قيادة سارية.", "Valid driving licence."),
      L("مهارات تنظيمية عالية.", "Strong organisational skills."),
    ],
    open: true,
  },
  {
    slug: "graduate-trainee",
    title: L("برنامج تدريب حديثي التخرج", "Graduate Trainee Programme"),
    department: L("الموارد البشرية", "Human Resources"),
    location: L("الرياض", "Riyadh"),
    type: "internship",
    experience: L("حديثو التخرج", "Recent graduates"),
    postedAt: "2026-08-15",
    summary: L(
      "برنامج تدريبي لمدة ستة أشهر يتنقل فيه المتدرب بين إدارات الشركة لاكتساب خبرة عملية.",
      "A six-month programme rotating trainees across departments to gain hands-on experience.",
    ),
    responsibilities: [
      L("المشاركة في مشاريع حقيقية.", "Take part in real projects."),
      L("حضور ورش التطوير المهني.", "Attend professional development workshops."),
    ],
    requirements: [
      L("مواطن سعودي حديث التخرج.", "Saudi national, recent graduate."),
      L("معدل جيد جدًا فأعلى.", "GPA of very good or above."),
      L("شغف بالتعلم.", "A passion for learning."),
    ],
    open: true,
  },
];

export const photos: GalleryPhoto[] = Array.from({ length: 9 }, (_, i) => ({
  id: `p${i + 1}`,
  src: `/demo/gallery-${i + 1}.svg`,
  caption: [
    L("زيارة ميدانية لأحد المشاريع", "Site visit to a project"),
    L("مستودع التوزيع الإقليمي", "Regional distribution warehouse"),
    L("فريق التوريد خلال عملية فحص", "Supply team during inspection"),
    L("أعمال صيانة وقائية", "Preventive maintenance works"),
    L("حفل تكريم الشركاء", "Partners recognition ceremony"),
    L("اجتماع فريق الإدارة", "Management team meeting"),
    L("تسليم مشروع تجهيز", "Fit-out project handover"),
    L("ورشة عمل تقنية", "Technical workshop"),
    L("أسبوع السلامة المهنية", "Safety week"),
  ][i],
  album: [L("المشاريع", "Projects"), L("الفعاليات", "Events"), L("فريق العمل", "Our Team")][i % 3],
}));

/** Demo videos have no YouTube id; add one from the admin panel to enable playback. */
export const videos: Video[] = [
  { id: "v1", title: L("فيلم تعريفي عن الشركة", "Company introduction film"), poster: "/demo/hero.svg", duration: "2:45" },
  {
    id: "v2",
    title: L("جولة في مركز التوزيع", "Tour of the distribution centre"),
    poster: "/demo/project-2.svg",
    duration: "3:10",
  },
  {
    id: "v3",
    title: L("قصة مشروع: تجهيز برج إداري", "Project story: office tower fit-out"),
    poster: "/demo/project-1.svg",
    duration: "4:05",
  },
  { id: "v4", title: L("أسبوع السلامة المهنية", "Safety week highlights"), poster: "/demo/gallery-9.svg", duration: "1:50" },
];

export const successStories: SuccessStory[] = [
  {
    id: "s1",
    sectorId: "retail",
    title: L("خفض زمن التوريد لسلسلة متاجر", "Cutting lead times for a retail chain"),
    challenge: L("تأخر وصول البضائع إلى الفروع وارتفاع تكاليف النقل.", "Late deliveries to branches and high transport costs."),
    solution: L(
      "إعادة تصميم شبكة التوزيع وتشغيل مستودع إقليمي.",
      "Redesigned the distribution network and ran a regional warehouse.",
    ),
    result: L("تسليم أسرع وتكاليف أقل خلال ستة أشهر.", "Faster delivery and lower cost within six months."),
    metric: { value: "35%", label: L("انخفاض زمن التوريد", "shorter lead time") },
  },
  {
    id: "s2",
    sectorId: "health",
    title: L("تشغيل مرفق صحي دون انقطاع", "Uninterrupted healthcare facility operations"),
    challenge: L("أعطال متكررة في الأنظمة الخدمية تؤثر على المرضى.", "Frequent utility failures affecting patients."),
    solution: L("برنامج صيانة وقائية مع فريق مقيم.", "Preventive maintenance programme with an on-site team."),
    result: L("استقرار تشغيلي ورضا أعلى للمستفيدين.", "Stable operations and higher satisfaction."),
    metric: { value: "99%", label: L("جاهزية الأنظمة", "system uptime") },
  },
  {
    id: "s3",
    sectorId: "education",
    title: L("تحويل رقمي لمجمع تعليمي", "Digital upgrade for an education campus"),
    challenge: L("بنية شبكات قديمة لا تدعم التعليم الإلكتروني.", "Legacy networks unable to support e-learning."),
    solution: L(
      "تنفيذ شبكات حديثة وقاعات ذكية خلال العطلة.",
      "Rolled out modern networks and smart classrooms during the break.",
    ),
    result: L("بيئة تعليمية متصلة بالكامل قبل بدء العام.", "A fully connected campus before term started."),
    metric: { value: "40", label: L("قاعة ذكية", "smart classrooms") },
  },
];

export const faqs: Faq[] = [
  {
    id: "f1",
    category: L("عام", "General"),
    question: L("ما المناطق التي تغطيها خدماتكم؟", "Which regions do you cover?"),
    answer: L(
      "نغطي جميع مناطق المملكة عبر المقر الرئيسي في الرياض وفرعي جدة والدمام وشبكة من الشركاء.",
      "We cover the entire Kingdom through our Riyadh head office, Jeddah and Dammam branches and a partner network.",
    ),
  },
  {
    id: "f2",
    category: L("عام", "General"),
    question: L("هل تتعاملون مع الجهات الحكومية؟", "Do you work with government entities?"),
    answer: L(
      "نعم، نشارك في المنافسات الحكومية وفق الأنظمة المعمول بها.",
      "Yes, we take part in government tenders in line with applicable regulations.",
    ),
  },
  {
    id: "f3",
    category: L("عروض الأسعار", "Quotations"),
    question: L("كم يستغرق إعداد عرض السعر؟", "How long does a quotation take?"),
    answer: L("عادة من يوم إلى ثلاثة أيام عمل حسب حجم الطلب وتفاصيله.", "Usually one to three business days depending on scope."),
  },
  {
    id: "f4",
    category: L("عروض الأسعار", "Quotations"),
    question: L("كيف أتابع حالة طلبي؟", "How do I track my request?"),
    answer: L(
      "تحصل على رقم مرجعي عند إرسال الطلب، ويمكنك التواصل معنا به في أي وقت.",
      "You receive a reference number on submission and can contact us with it at any time.",
    ),
  },
  {
    id: "f5",
    category: L("الخدمات", "Services"),
    question: L("هل تقدمون عقود صيانة سنوية؟", "Do you offer annual maintenance contracts?"),
    answer: L(
      "نعم، نقدم عقود صيانة وقائية وتشغيلية مرنة بمستويات خدمة محددة.",
      "Yes, flexible preventive and operational contracts with defined SLAs.",
    ),
  },
  {
    id: "f6",
    category: L("الخدمات", "Services"),
    question: L("هل يمكن تخصيص الخدمة حسب احتياجنا؟", "Can services be tailored to our needs?"),
    answer: L(
      "بالتأكيد، نبدأ بدراسة الاحتياج ثم نصمم الحل المناسب.",
      "Certainly — we start by assessing needs, then design the right solution.",
    ),
  },
  {
    id: "f7",
    category: L("التوظيف", "Careers"),
    question: L("كيف أتقدم لوظيفة؟", "How do I apply for a job?"),
    answer: L(
      "من صفحة التوظيف اختر الوظيفة المناسبة واملأ النموذج وأرفق سيرتك الذاتية.",
      "Pick a role on the Careers page, complete the form and attach your CV.",
    ),
  },
];

export const legalPages: LegalPage[] = [
  {
    slug: "privacy",
    title: L("سياسة الخصوصية", "Privacy Policy"),
    updatedAt: "2026-10-01",
    body: L(
      "نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفق نظام حماية البيانات الشخصية في المملكة العربية السعودية.\n\n## البيانات التي نجمعها\n- البيانات التي تقدمها عبر النماذج مثل الاسم ورقم الجوال والبريد الإلكتروني.\n- الملفات التي ترفقها مثل السيرة الذاتية أو مستندات الطلب.\n- بيانات تقنية أساسية لازمة لتشغيل الموقع وحمايته.\n\n## كيف نستخدم البيانات\n- الرد على استفساراتك وطلباتك.\n- دراسة طلبات التوظيف.\n- تحسين خدماتنا وحماية الموقع من الإساءة.\n\n## مشاركة البيانات\nلا نبيع بياناتك ولا نشاركها مع أطراف ثالثة إلا بما يلزم لتقديم الخدمة أو بموجب النظام.\n\n## حقوقك\nيحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بالتواصل معنا عبر البريد الإلكتروني.\n\n> هذا نص توضيحي ضمن البيانات التجريبية، ويجب مراجعته قانونيًا قبل النشر.",
      "We respect your privacy and are committed to protecting your personal data in line with the Saudi Personal Data Protection Law.\n\n## Data we collect\n- Information you submit through forms such as name, mobile number and email.\n- Files you attach such as CVs or request documents.\n- Basic technical data needed to operate and protect the website.\n\n## How we use data\n- To respond to your enquiries and requests.\n- To review job applications.\n- To improve our services and protect the site from abuse.\n\n## Sharing\nWe do not sell your data or share it with third parties except as needed to provide the service or as required by law.\n\n## Your rights\nYou may request access to, correction or deletion of your data by contacting us by email.\n\n> This is illustrative demo text and must be legally reviewed before publishing.",
    ),
  },
  {
    slug: "terms",
    title: L("الشروط والأحكام", "Terms & Conditions"),
    updatedAt: "2026-10-01",
    body: L(
      "باستخدامك لهذا الموقع فإنك توافق على الشروط والأحكام التالية.\n\n## استخدام الموقع\n- يُستخدم الموقع لأغراض التعريف بالشركة وخدماتها والتواصل معها.\n- يُمنع استخدام الموقع بأي طريقة تخالف الأنظمة أو تضر بالآخرين.\n\n## الملكية الفكرية\nجميع المحتويات من نصوص وصور وشعارات مملوكة للشركة أو مرخصة لها، ولا يجوز نسخها دون إذن كتابي.\n\n## إخلاء المسؤولية\nنسعى لدقة المعلومات المنشورة، لكنها قد تتغير دون إشعار مسبق، ولا تُعد عرضًا ملزمًا.\n\n## القانون المطبق\nتخضع هذه الشروط لأنظمة المملكة العربية السعودية.\n\n> هذا نص توضيحي ضمن البيانات التجريبية، ويجب مراجعته قانونيًا قبل النشر.",
      "By using this website you agree to the following terms and conditions.\n\n## Use of the site\n- The site is provided to present the company and its services and to contact us.\n- You may not use the site in any way that breaks the law or harms others.\n\n## Intellectual property\nAll content including text, images and logos is owned by or licensed to the company and may not be copied without written permission.\n\n## Disclaimer\nWe strive for accuracy, but information may change without notice and is not a binding offer.\n\n## Governing law\nThese terms are governed by the laws of the Kingdom of Saudi Arabia.\n\n> This is illustrative demo text and must be legally reviewed before publishing.",
    ),
  },
  {
    slug: "cookies",
    title: L("سياسة ملفات تعريف الارتباط", "Cookie Policy"),
    updatedAt: "2026-10-01",
    body: L(
      "يستخدم هذا الموقع عددًا محدودًا من ملفات تعريف الارتباط (الكوكيز).\n\n## الملفات الضرورية\n- ملف حفظ اللغة المفضلة (NEXT_LOCALE) لعرض الموقع باللغة التي اخترتها.\n\n## ملفات التحليلات\nلا تُفعّل أدوات التحليلات إلا بعد موافقتك، ويمكنك سحب الموافقة في أي وقت.\n\n## التحكم في الملفات\nيمكنك حذف ملفات تعريف الارتباط أو منعها من إعدادات المتصفح، وقد يؤثر ذلك على بعض وظائف الموقع.",
      "This website uses a small number of cookies.\n\n## Essential cookies\n- A language preference cookie (NEXT_LOCALE) to show the site in your chosen language.\n\n## Analytics cookies\nAnalytics tools are enabled only after your consent, which you can withdraw at any time.\n\n## Managing cookies\nYou can delete or block cookies in your browser settings; this may affect some site features.",
    ),
  },
];
