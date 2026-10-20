import type { Client, NewsPost, Project, Sector, Service, ServiceCategory, Testimonial } from "@/types/content";

export const serviceCategories: ServiceCategory[] = [
  { id: "supply", name: { ar: "التوريد والتجارة", en: "Supply & Trading" } },
  { id: "projects", name: { ar: "المشاريع والمقاولات", en: "Projects & Contracting" } },
  { id: "advisory", name: { ar: "الاستشارات والدعم", en: "Advisory & Support" } },
];

export const services: Service[] = [
  {
    slug: "general-supply",
    categoryId: "supply",
    icon: "truck",
    title: { ar: "التوريدات العامة", en: "General Supplies" },
    summary: {
      ar: "توريد المعدات والمستلزمات المكتبية والتشغيلية من موردين معتمدين، مع إدارة كاملة لسلسلة الإمداد.",
      en: "Sourcing office and operational equipment from approved suppliers with end-to-end supply-chain management.",
    },
    image: "/demo/service-supply.svg",
    featured: true,
    order: 1,
  },
  {
    slug: "contracting",
    categoryId: "projects",
    icon: "hardhat",
    title: { ar: "المقاولات العامة", en: "General Contracting" },
    summary: {
      ar: "تنفيذ أعمال الإنشاء والتشطيب والصيانة وفق أعلى معايير السلامة والجودة وبجداول زمنية دقيقة.",
      en: "Construction, fit-out and maintenance works delivered to the highest safety and quality standards, on schedule.",
    },
    image: "/demo/service-contracting.svg",
    featured: true,
    order: 2,
  },
  {
    slug: "facility-management",
    categoryId: "projects",
    icon: "building",
    title: { ar: "إدارة المرافق", en: "Facility Management" },
    summary: {
      ar: "تشغيل وصيانة المباني والمنشآت بخطط وقائية ذكية تضمن استمرارية الأعمال وخفض التكاليف.",
      en: "Operating and maintaining buildings with smart preventive plans that ensure continuity and lower costs.",
    },
    image: "/demo/service-facility.svg",
    featured: true,
    order: 3,
  },
  {
    slug: "logistics",
    categoryId: "supply",
    icon: "compass",
    title: { ar: "الخدمات اللوجستية", en: "Logistics Services" },
    summary: {
      ar: "حلول نقل وتخزين وتوزيع مرنة تغطي مناطق المملكة، مع تتبع لحظي للشحنات.",
      en: "Flexible transport, warehousing and distribution across the Kingdom with real-time shipment tracking.",
    },
    image: "/demo/service-logistics.svg",
    featured: true,
    order: 4,
  },
  {
    slug: "business-consulting",
    categoryId: "advisory",
    icon: "chart",
    title: { ar: "الاستشارات الإدارية", en: "Business Consulting" },
    summary: {
      ar: "دراسات الجدوى وتطوير الإجراءات وحوكمة الأعمال لمساعدة المنشآت على النمو المستدام.",
      en: "Feasibility studies, process improvement and governance to help organisations grow sustainably.",
    },
    image: "/demo/service-consulting.svg",
    featured: true,
    order: 5,
  },
  {
    slug: "technical-solutions",
    categoryId: "advisory",
    icon: "cog",
    title: { ar: "الحلول التقنية", en: "Technical Solutions" },
    summary: {
      ar: "توريد وتركيب الأنظمة التقنية والأمنية والشبكات مع الدعم الفني وعقود الصيانة.",
      en: "Supply and installation of IT, security and network systems with technical support and maintenance contracts.",
    },
    image: "/demo/service-tech.svg",
    featured: true,
    order: 6,
  },
];

export const sectors: Sector[] = [
  {
    id: "government",
    slug: "government",
    icon: "government",
    name: { ar: "القطاع الحكومي", en: "Government" },
    summary: {
      ar: "دعم الجهات الحكومية بحلول توريد وتشغيل متوافقة مع الأنظمة.",
      en: "Compliant supply and operations for public entities.",
    },
  },
  {
    id: "construction",
    slug: "construction",
    icon: "hardhat",
    name: { ar: "التشييد والبناء", en: "Construction" },
    summary: {
      ar: "شريك تنفيذي موثوق لمشاريع البنية التحتية والمباني.",
      en: "A trusted delivery partner for buildings and infrastructure.",
    },
  },
  {
    id: "energy",
    slug: "energy",
    icon: "energy",
    name: { ar: "الطاقة والصناعة", en: "Energy & Industry" },
    summary: {
      ar: "توريد المعدات الصناعية وخدمات الصيانة للمنشآت الصناعية.",
      en: "Industrial equipment supply and plant maintenance.",
    },
  },
  {
    id: "health",
    slug: "healthcare",
    icon: "health",
    name: { ar: "الرعاية الصحية", en: "Healthcare" },
    summary: { ar: "تجهيز المرافق الصحية بالمستلزمات وإدارة التشغيل.", en: "Equipping and operating healthcare facilities." },
  },
  {
    id: "education",
    slug: "education",
    icon: "education",
    name: { ar: "التعليم والتدريب", en: "Education" },
    summary: {
      ar: "تجهيز المنشآت التعليمية وقاعات التدريب بأحدث الحلول.",
      en: "Modern solutions for schools and training centres.",
    },
  },
  {
    id: "retail",
    slug: "retail",
    icon: "retail",
    name: { ar: "التجزئة والتجارة", en: "Retail & Trade" },
    summary: {
      ar: "حلول لوجستية وتجهيزات للمتاجر ومراكز التوزيع.",
      en: "Logistics and fit-out for stores and distribution centres.",
    },
  },
  {
    id: "hospitality",
    slug: "hospitality",
    icon: "gem",
    name: { ar: "الضيافة والسياحة", en: "Hospitality" },
    summary: { ar: "تشغيل وتجهيز الفنادق والمنتجعات بمعايير عالية.", en: "Fit-out and operations for hotels and resorts." },
  },
  {
    id: "industrial",
    slug: "manufacturing",
    icon: "factory",
    name: { ar: "التصنيع", en: "Manufacturing" },
    summary: { ar: "إدارة سلاسل الإمداد ومستلزمات خطوط الإنتاج.", en: "Supply-chain management for production lines." },
  },
];

export const projects: Project[] = [
  {
    slug: "business-tower-fitout",
    title: { ar: "تجهيز برج إداري متعدد الأدوار", en: "Multi-storey Office Tower Fit-out" },
    summary: { ar: "أعمال تشطيب وتجهيز كاملة لمساحات مكتبية حديثة.", en: "Complete fit-out of modern office floors." },
    sectorId: "construction",
    status: "completed",
    location: { ar: "الرياض", en: "Riyadh" },
    year: 2024,
    image: "/demo/project-1.svg",
    featured: true,
  },
  {
    slug: "logistics-hub",
    title: { ar: "مركز توزيع لوجستي إقليمي", en: "Regional Logistics Hub" },
    summary: {
      ar: "تصميم وتشغيل مستودع ذكي بطاقة استيعابية عالية.",
      en: "Design and operation of a high-capacity smart warehouse.",
    },
    sectorId: "retail",
    status: "ongoing",
    location: { ar: "الدمام", en: "Dammam" },
    year: 2025,
    image: "/demo/project-2.svg",
    featured: true,
  },
  {
    slug: "medical-center-supply",
    title: { ar: "توريد تجهيزات مركز طبي", en: "Medical Centre Equipment Supply" },
    summary: { ar: "توريد وتركيب تجهيزات طبية ومكتبية متكاملة.", en: "Supply and installation of medical and office equipment." },
    sectorId: "health",
    status: "completed",
    location: { ar: "جدة", en: "Jeddah" },
    year: 2023,
    image: "/demo/project-3.svg",
    featured: true,
  },
  {
    slug: "industrial-maintenance",
    title: { ar: "عقد صيانة منشأة صناعية", en: "Industrial Plant Maintenance Contract" },
    summary: { ar: "صيانة وقائية وتشغيلية على مدار الساعة.", en: "Round-the-clock preventive and operational maintenance." },
    sectorId: "energy",
    status: "ongoing",
    location: { ar: "الجبيل", en: "Jubail" },
    year: 2025,
    image: "/demo/project-4.svg",
    featured: true,
  },
  {
    slug: "campus-network",
    title: { ar: "شبكات وأنظمة مجمع تعليمي", en: "Education Campus Networks" },
    summary: { ar: "تنفيذ البنية التحتية التقنية والأنظمة الأمنية.", en: "IT infrastructure and security systems rollout." },
    sectorId: "education",
    status: "completed",
    location: { ar: "المدينة المنورة", en: "Madinah" },
    year: 2024,
    image: "/demo/project-5.svg",
    featured: true,
  },
  {
    slug: "hotel-operations",
    title: { ar: "تشغيل وتجهيز منشأة فندقية", en: "Hotel Fit-out & Operations" },
    summary: { ar: "تجهيز الغرف والمرافق وإدارة خدمات التشغيل.", en: "Room and amenity fit-out with operations management." },
    sectorId: "hospitality",
    status: "completed",
    location: { ar: "أبها", en: "Abha" },
    year: 2023,
    image: "/demo/project-6.svg",
    featured: true,
  },
];

/** Placeholder partner logos — not real organisations. */
export const clients: Client[] = Array.from({ length: 8 }, (_, i) => ({
  id: `client-${i + 1}`,
  name: { ar: `شريك تجريبي ${i + 1}`, en: `Demo Partner ${i + 1}` },
  logo: `/demo/client-${i + 1}.svg`,
}));

/** Illustrative testimonials for demo purposes only. */
export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote: {
      ar: "التزام واضح بالمواعيد ودقة في التنفيذ، وفريق متعاون يفهم احتياجاتنا من أول اجتماع.",
      en: "Clear commitment to deadlines and precise execution, with a cooperative team that understood our needs from the first meeting.",
    },
    author: { ar: "مدير المشتريات", en: "Procurement Manager" },
    role: { ar: "جهة حكومية — مثال توضيحي", en: "Public entity — illustrative example" },
    rating: 5,
  },
  {
    id: "t2",
    quote: {
      ar: "ساعدونا في إعادة تنظيم سلسلة الإمداد وخفض زمن التوريد بشكل ملحوظ خلال أشهر قليلة.",
      en: "They helped us restructure our supply chain and noticeably reduce lead times within a few months.",
    },
    author: { ar: "مدير العمليات", en: "Operations Director" },
    role: { ar: "شركة تجزئة — مثال توضيحي", en: "Retail company — illustrative example" },
    rating: 5,
  },
  {
    id: "t3",
    quote: {
      ar: "جودة في المواد وشفافية في التقارير، وخدمة ما بعد التسليم على مستوى عالٍ من الاحترافية.",
      en: "Quality materials, transparent reporting, and highly professional after-delivery support.",
    },
    author: { ar: "مدير المشروع", en: "Project Manager" },
    role: { ar: "مطوّر عقاري — مثال توضيحي", en: "Real-estate developer — illustrative example" },
    rating: 5,
  },
];

export const news: NewsPost[] = [
  {
    slug: "new-branch-opening",
    kind: "news",
    title: { ar: "افتتاح فرع جديد للشركة في المنطقة الشرقية", en: "New Branch Opens in the Eastern Province" },
    excerpt: {
      ar: "في إطار خطة التوسع، افتتحت الشركة فرعها الجديد لخدمة العملاء في المنطقة الشرقية بشكل أسرع.",
      en: "As part of our expansion plan, the company opened a new branch to serve Eastern Province clients faster.",
    },
    image: "/demo/news-1.svg",
    publishedAt: "2026-09-14",
  },
  {
    slug: "quality-management-journey",
    kind: "article",
    title: { ar: "كيف تبني منشأتك نظام جودة فعّالًا؟", en: "How to Build an Effective Quality System" },
    excerpt: {
      ar: "خطوات عملية لتطبيق أنظمة إدارة الجودة وقياس أثرها على رضا العملاء وكفاءة التشغيل.",
      en: "Practical steps to implement quality management and measure its impact on satisfaction and efficiency.",
    },
    image: "/demo/news-2.svg",
    publishedAt: "2026-08-28",
  },
  {
    slug: "industry-exhibition-participation",
    kind: "event",
    title: { ar: "مشاركتنا في معرض الأعمال والتوريد", en: "Our Participation in the Business & Supply Expo" },
    excerpt: {
      ar: "شاركت الشركة بجناح تعريفي استعرضت فيه أبرز خدماتها وحلولها للقطاعين العام والخاص.",
      en: "The company showcased its key services and solutions for the public and private sectors.",
    },
    image: "/demo/news-3.svg",
    publishedAt: "2026-07-10",
  },
];
