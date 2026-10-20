import type { HomePage } from "@/types/content";

export const homePage: HomePage = {
  sections: [
    { key: "hero", enabled: true },
    { key: "about", enabled: true },
    { key: "visionMission", enabled: true },
    { key: "services", enabled: true },
    { key: "stats", enabled: true },
    { key: "projects", enabled: true },
    { key: "sectors", enabled: true },
    { key: "whyUs", enabled: true },
    { key: "clients", enabled: true },
    { key: "testimonials", enabled: true },
    { key: "news", enabled: true },
    { key: "quote", enabled: true },
    { key: "contact", enabled: true },
  ],
  hero: {
    eyebrow: { ar: "شريكك الموثوق للنمو منذ 2010", en: "Your trusted growth partner since 2010" },
    title: {
      ar: "نصنع قيمة مستدامة لأعمالك بحلول تجارية متكاملة",
      en: "Creating lasting value for your business with integrated solutions",
    },
    subtitle: {
      ar: "من التوريد والمقاولات إلى الخدمات اللوجستية والاستشارات، نقدم حلولًا موثوقة تواكب طموحات رؤية المملكة 2030.",
      en: "From procurement and contracting to logistics and advisory, we deliver dependable solutions aligned with Saudi Vision 2030.",
    },
    image: "/demo/hero.svg",
    ctas: [
      { label: { ar: "اكتشف خدماتنا", en: "Explore Our Services" }, href: "#services", variant: "primary" },
      { label: { ar: "اطلب عرض سعر", en: "Request a Quote" }, href: "#quote", variant: "secondary" },
      { label: { ar: "تواصل معنا", en: "Contact Us" }, href: "#contact", variant: "ghost" },
    ],
    highlights: [
      { ar: "فريق معتمد ومتخصص", en: "Certified specialist team" },
      { ar: "تغطية لجميع مناطق المملكة", en: "Kingdom-wide coverage" },
      { ar: "التزام صارم بالجودة والمواعيد", en: "Strict quality & timelines" },
    ],
  },
  about: {
    eyebrow: { ar: "من نحن", en: "About Us" },
    title: { ar: "خبرة سعودية تبني الثقة وتصنع الفرق", en: "Saudi expertise that builds trust and makes a difference" },
    body: {
      ar: "تأسست شركة الريادة التجارية لتكون شريكًا استراتيجيًا للمنشآت الباحثة عن الجودة والموثوقية. نجمع بين المعرفة العميقة بالسوق المحلي وأفضل الممارسات العالمية، لنقدم خدمات متكاملة تُدار باحترافية من التخطيط حتى التسليم وما بعده.",
      en: "Al-Riyada Trading Company was founded to be a strategic partner for organisations that value quality and reliability. We combine deep local market knowledge with global best practice to deliver integrated services managed professionally from planning to handover and beyond.",
    },
    image: "/demo/about.svg",
    points: [
      { ar: "حوكمة واضحة وإدارة مشاريع احترافية", en: "Clear governance and professional project management" },
      { ar: "شبكة واسعة من الموردين والشركاء المعتمدين", en: "A wide network of approved suppliers and partners" },
      { ar: "دعم فني وخدمة عملاء بعد التسليم", en: "Technical and customer support after handover" },
      { ar: "التزام بمتطلبات المحتوى المحلي", en: "Commitment to local content requirements" },
    ],
    cta: { label: { ar: "تعرّف علينا أكثر", en: "Learn more about us" }, href: "/about" },
  },
  visionMission: {
    eyebrow: { ar: "توجهنا", en: "Our Direction" },
    title: { ar: "رؤية واضحة ورسالة نلتزم بها", en: "A clear vision and a mission we live by" },
    items: [
      {
        icon: "eye",
        title: { ar: "رؤيتنا", en: "Our Vision" },
        body: {
          ar: "أن نكون الخيار الأول للحلول التجارية المتكاملة في المملكة، وشريكًا فاعلًا في تحقيق مستهدفات التنمية.",
          en: "To be the first choice for integrated business solutions in the Kingdom and an active partner in national development.",
        },
      },
      {
        icon: "target",
        title: { ar: "رسالتنا", en: "Our Mission" },
        body: {
          ar: "تقديم خدمات عالية الجودة بكفاءة وشفافية، عبر فريق محترف وشراكات موثوقة تحقق قيمة مستدامة لعملائنا.",
          en: "Delivering high-quality services efficiently and transparently through a professional team and trusted partnerships.",
        },
      },
      {
        icon: "gem",
        title: { ar: "قيمنا", en: "Our Values" },
        body: {
          ar: "النزاهة، الجودة، الابتكار، الالتزام، والعمل بروح الفريق الواحد في كل ما نقدمه.",
          en: "Integrity, quality, innovation, commitment and teamwork in everything we deliver.",
        },
      },
    ],
  },
  services: {
    eyebrow: { ar: "خدماتنا", en: "Our Services" },
    title: { ar: "حلول متكاملة تلبي احتياجات أعمالك", en: "Integrated solutions for your business needs" },
    subtitle: {
      ar: "نقدم باقة متنوعة من الخدمات يديرها فريق متخصص وفق أعلى معايير الجودة.",
      en: "A diverse portfolio of services delivered by specialists to the highest quality standards.",
    },
    cta: { label: { ar: "عرض جميع الخدمات", en: "View all services" }, href: "/services" },
  },
  stats: {
    items: [
      { icon: "folder", value: 350, suffix: "+", label: { ar: "مشروع منجز", en: "Projects Delivered" } },
      { icon: "handshake", value: 120, suffix: "+", label: { ar: "عميل وشريك", en: "Clients & Partners" } },
      { icon: "award", value: 15, suffix: "+", label: { ar: "عامًا من الخبرة", en: "Years of Experience" } },
      { icon: "users", value: 200, suffix: "+", label: { ar: "موظف متخصص", en: "Specialist Staff" } },
    ],
  },
  projects: {
    eyebrow: { ar: "أعمالنا", en: "Our Work" },
    title: { ar: "مشاريع نفخر بإنجازها", en: "Projects we are proud of" },
    subtitle: {
      ar: "نماذج من المشاريع التي نفذناها لعملائنا في قطاعات ومناطق مختلفة.",
      en: "A selection of projects delivered for clients across sectors and regions.",
    },
    cta: { label: { ar: "استعرض جميع المشاريع", en: "Browse all projects" }, href: "/projects" },
  },
  sectors: {
    eyebrow: { ar: "القطاعات", en: "Sectors" },
    title: { ar: "نخدم قطاعات حيوية متعددة", en: "Serving a range of vital sectors" },
    subtitle: {
      ar: "خبرة تراكمية في فهم متطلبات كل قطاع وتقديم حلول مصممة خصيصًا له.",
      en: "Accumulated expertise in understanding each sector and tailoring solutions to it.",
    },
  },
  whyUs: {
    eyebrow: { ar: "لماذا تختارنا؟", en: "Why Choose Us?" },
    title: { ar: "ما يميزنا ويجعلنا شريكك الأمثل", en: "What sets us apart as your ideal partner" },
    image: "/demo/why-us.svg",
    items: [
      {
        icon: "shield",
        title: { ar: "موثوقية والتزام", en: "Reliability" },
        body: {
          ar: "عقود واضحة والتزام تام بالجداول الزمنية المتفق عليها.",
          en: "Clear contracts and full adherence to agreed timelines.",
        },
      },
      {
        icon: "badge",
        title: { ar: "جودة معتمدة", en: "Certified Quality" },
        body: {
          ar: "إجراءات عمل موثقة ورقابة جودة في كل مرحلة.",
          en: "Documented procedures and quality control at every stage.",
        },
      },
      {
        icon: "users",
        title: { ar: "فريق متخصص", en: "Expert Team" },
        body: {
          ar: "كفاءات سعودية وخبرات متنوعة في مختلف التخصصات.",
          en: "Saudi talent and diverse expertise across disciplines.",
        },
      },
      {
        icon: "clock",
        title: { ar: "استجابة سريعة", en: "Fast Response" },
        body: {
          ar: "دعم فني ومتابعة مستمرة على مدار أيام العمل.",
          en: "Ongoing technical support and follow-up throughout the week.",
        },
      },
    ],
  },
  clients: {
    eyebrow: { ar: "عملاؤنا وشركاؤنا", en: "Clients & Partners" },
    title: { ar: "ثقة نعتز بها", en: "Trust we are proud of" },
  },
  testimonials: {
    eyebrow: { ar: "آراء العملاء", en: "Testimonials" },
    title: { ar: "ماذا يقول عملاؤنا؟", en: "What our clients say" },
  },
  news: {
    eyebrow: { ar: "المركز الإعلامي", en: "Media Center" },
    title: { ar: "أحدث الأخبار والمقالات", en: "Latest news & articles" },
    cta: { label: { ar: "جميع الأخبار", en: "All news" }, href: "/media/news" },
  },
  quote: {
    eyebrow: { ar: "طلب عرض سعر", en: "Request a Quote" },
    title: { ar: "احصل على عرض سعر مخصص لمشروعك", en: "Get a tailored quote for your project" },
    subtitle: {
      ar: "أرسل تفاصيل احتياجك وسيتواصل معك أحد مستشارينا خلال يوم عمل واحد.",
      en: "Send us your requirements and one of our consultants will contact you within one business day.",
    },
    points: [
      { ar: "دراسة مجانية لاحتياجك", en: "Free needs assessment" },
      { ar: "عرض واضح ومفصل", en: "Clear, detailed proposal" },
      { ar: "رقم مرجعي لمتابعة طلبك", en: "Reference number to track your request" },
    ],
  },
  contact: {
    eyebrow: { ar: "تواصل معنا", en: "Contact Us" },
    title: { ar: "يسعدنا تواصلك معنا", en: "We’d love to hear from you" },
    subtitle: {
      ar: "فريقنا جاهز للإجابة عن استفساراتك في أوقات العمل الرسمية.",
      en: "Our team is ready to answer your questions during business hours.",
    },
  },
};
