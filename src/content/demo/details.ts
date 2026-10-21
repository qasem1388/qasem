import type { NewsBody, ProjectDetail, SectorDetail, ServiceDetail } from "@/types/content";

const g = (...names: string[]) => names.map((n) => `/demo/${n}.svg`);

export const serviceDetails: Record<string, ServiceDetail> = {
  "general-supply": {
    body: {
      ar: "نوفر خدمة توريد متكاملة تبدأ من فهم الاحتياج وإعداد المواصفات، مرورًا بالتفاوض مع الموردين المعتمدين، وانتهاءً بالتسليم والتركيب في الموقع.\n\nنعتمد على شبكة واسعة من المصنعين والوكلاء داخل المملكة وخارجها، مع التزام كامل بمتطلبات المحتوى المحلي وأنظمة المنافسات والمشتريات الحكومية.",
      en: "We provide end-to-end supply services, from understanding requirements and preparing specifications to negotiating with approved suppliers and delivering and installing on site.\n\nWe rely on a broad network of manufacturers and agents inside and outside the Kingdom, fully complying with local content requirements and government procurement regulations.",
    },
    features: [
      {
        title: { ar: "موردون معتمدون", en: "Approved suppliers" },
        body: {
          ar: "قائمة موردين مؤهلين بعد تقييم الجودة والسعر والالتزام.",
          en: "A qualified supplier list evaluated for quality, price and reliability.",
        },
      },
      {
        title: { ar: "إدارة المخزون", en: "Inventory management" },
        body: {
          ar: "تخطيط الكميات وجدولة التوريد لتقليل الهدر والتكاليف.",
          en: "Quantity planning and delivery scheduling to cut waste and cost.",
        },
      },
      {
        title: { ar: "تتبع الطلبات", en: "Order tracking" },
        body: {
          ar: "تقارير دورية بحالة كل طلب من الشراء حتى الاستلام.",
          en: "Regular status reports for every order from purchase to receipt.",
        },
      },
      {
        title: { ar: "ضمان وخدمة ما بعد البيع", en: "Warranty & after-sales" },
        body: {
          ar: "متابعة الضمانات والاستبدال والصيانة بعد التسليم.",
          en: "Warranty follow-up, replacements and maintenance after delivery.",
        },
      },
    ],
    gallery: g("service-supply", "project-2", "gallery-3"),
  },
  contracting: {
    body: {
      ar: "ننفذ مشاريع الإنشاء والتشطيب والترميم للمباني التجارية والإدارية والتعليمية، بإشراف مهندسين متخصصين ووفق كود البناء السعودي.\n\nتغطي خدماتنا الأعمال المدنية والمعمارية والكهروميكانيكية، مع خطط سلامة معتمدة وتقارير تقدم أسبوعية للعميل.",
      en: "We deliver construction, fit-out and renovation projects for commercial, administrative and educational buildings, supervised by specialist engineers and compliant with the Saudi Building Code.\n\nOur services cover civil, architectural and MEP works, with approved safety plans and weekly progress reports.",
    },
    features: [
      {
        title: { ar: "إدارة مشاريع احترافية", en: "Professional PM" },
        body: { ar: "جداول زمنية دقيقة ومتابعة يومية للتنفيذ.", en: "Accurate schedules and daily execution follow-up." },
      },
      {
        title: { ar: "السلامة أولًا", en: "Safety first" },
        body: { ar: "خطط صحة وسلامة مهنية معتمدة لكل موقع.", en: "Approved HSE plans for every site." },
      },
      {
        title: { ar: "جودة المواد", en: "Material quality" },
        body: {
          ar: "اعتماد عينات المواد قبل التوريد والتركيب.",
          en: "Material samples approved before supply and installation.",
        },
      },
      {
        title: { ar: "تسليم موثق", en: "Documented handover" },
        body: { ar: "مخططات تنفيذية نهائية وكتيبات تشغيل.", en: "As-built drawings and operation manuals." },
      },
    ],
    gallery: g("service-contracting", "project-1", "gallery-1"),
  },
  "facility-management": {
    body: {
      ar: "نتولى تشغيل وصيانة المنشآت بشكل متكامل يشمل الصيانة الوقائية والتصحيحية، والنظافة، والأمن، وإدارة الطاقة.\n\nنستخدم أنظمة رقمية لإدارة البلاغات وجدولة الصيانة، مع مؤشرات أداء واضحة يتم مراجعتها شهريًا مع العميل.",
      en: "We run and maintain facilities end to end, including preventive and corrective maintenance, cleaning, security and energy management.\n\nDigital systems handle work orders and maintenance scheduling, with clear KPIs reviewed monthly with the client.",
    },
    features: [
      {
        title: { ar: "صيانة وقائية", en: "Preventive maintenance" },
        body: { ar: "جداول صيانة مبنية على توصيات المصنعين.", en: "Schedules based on manufacturer recommendations." },
      },
      {
        title: { ar: "استجابة للبلاغات", en: "Responsive service" },
        body: { ar: "مستويات خدمة محددة لزمن الاستجابة والإصلاح.", en: "Defined SLAs for response and repair times." },
      },
      {
        title: { ar: "كفاءة الطاقة", en: "Energy efficiency" },
        body: { ar: "مراقبة الاستهلاك واقتراح فرص التوفير.", en: "Consumption monitoring and savings opportunities." },
      },
      {
        title: { ar: "تقارير الأداء", en: "Performance reports" },
        body: { ar: "لوحات مؤشرات شهرية شفافة.", en: "Transparent monthly KPI dashboards." },
      },
    ],
    gallery: g("service-facility", "project-5", "gallery-4"),
  },
  logistics: {
    body: {
      ar: "نقدم حلول نقل وتخزين وتوزيع مرنة تخدم المنشآت التجارية والصناعية في مختلف مناطق المملكة.\n\nتشمل خدماتنا التخزين المبرد والجاف، وإدارة المستودعات، والتوصيل للميل الأخير، مع منصة تتبع لحظية للشحنات.",
      en: "Flexible transport, warehousing and distribution solutions for commercial and industrial organisations across the Kingdom.\n\nServices include ambient and cold storage, warehouse management and last-mile delivery, with a real-time tracking platform.",
    },
    features: [
      {
        title: { ar: "تغطية واسعة", en: "Wide coverage" },
        body: {
          ar: "شبكة نقل تغطي المدن الرئيسية والمحافظات.",
          en: "A transport network covering major cities and governorates.",
        },
      },
      {
        title: { ar: "مستودعات حديثة", en: "Modern warehouses" },
        body: { ar: "أنظمة إدارة مستودعات وتصنيف ذكي للمخزون.", en: "WMS and smart inventory classification." },
      },
      {
        title: { ar: "تتبع لحظي", en: "Live tracking" },
        body: { ar: "معرفة موقع الشحنة وحالتها في أي وقت.", en: "Know where your shipment is at any time." },
      },
      {
        title: { ar: "مرونة في التعاقد", en: "Flexible contracts" },
        body: { ar: "عقود قصيرة وطويلة الأجل حسب الاحتياج.", en: "Short and long-term contracts as needed." },
      },
    ],
    gallery: g("service-logistics", "project-2", "gallery-2"),
  },
  "business-consulting": {
    body: {
      ar: "نساعد المنشآت على اتخاذ قرارات مدروسة عبر دراسات الجدوى، وتحليل الأسواق، وإعادة هندسة الإجراءات، وبناء أطر الحوكمة.\n\nيعمل مستشارونا جنبًا إلى جنب مع فرق العميل لضمان تطبيق التوصيات وقياس أثرها.",
      en: "We help organisations make informed decisions through feasibility studies, market analysis, process re-engineering and governance frameworks.\n\nOur consultants work alongside client teams to ensure recommendations are implemented and measured.",
    },
    features: [
      {
        title: { ar: "دراسات الجدوى", en: "Feasibility studies" },
        body: { ar: "تحليل مالي وتسويقي وفني متكامل.", en: "Integrated financial, market and technical analysis." },
      },
      {
        title: { ar: "تطوير الإجراءات", en: "Process improvement" },
        body: { ar: "تبسيط الإجراءات وأتمتتها لرفع الكفاءة.", en: "Simplifying and automating processes for efficiency." },
      },
      {
        title: { ar: "الحوكمة والامتثال", en: "Governance & compliance" },
        body: { ar: "سياسات ولوائح متوافقة مع الأنظمة.", en: "Policies and regulations aligned with the law." },
      },
      {
        title: { ar: "قياس الأداء", en: "Performance measurement" },
        body: { ar: "بناء مؤشرات أداء ومتابعتها.", en: "Designing and tracking KPIs." },
      },
    ],
    gallery: g("service-consulting", "news-2", "gallery-6"),
  },
  "technical-solutions": {
    body: {
      ar: "نوفر ونركب الأنظمة التقنية للمنشآت، بما في ذلك الشبكات، وأنظمة المراقبة والتحكم في الدخول، ومراكز البيانات الصغيرة، وأنظمة الصوت والعرض.\n\nنقدم عقود دعم فني وصيانة مرنة تضمن استمرارية الأنظمة وأمانها.",
      en: "We supply and install technical systems including networks, CCTV and access control, small data rooms, and AV systems.\n\nFlexible support and maintenance contracts keep systems running and secure.",
    },
    features: [
      {
        title: { ar: "البنية التحتية للشبكات", en: "Network infrastructure" },
        body: { ar: "تصميم وتنفيذ شبكات سلكية ولاسلكية.", en: "Design and rollout of wired and wireless networks." },
      },
      {
        title: { ar: "الأنظمة الأمنية", en: "Security systems" },
        body: { ar: "كاميرات مراقبة وتحكم في الدخول.", en: "CCTV and access control." },
      },
      {
        title: { ar: "الدعم الفني", en: "Technical support" },
        body: { ar: "مكتب دعم ومستويات خدمة واضحة.", en: "Help desk with clear service levels." },
      },
      {
        title: { ar: "التوافق والأمان", en: "Compliance & security" },
        body: { ar: "تطبيق أفضل ممارسات الأمن السيبراني.", en: "Cybersecurity best practices applied." },
      },
    ],
    gallery: g("service-tech", "project-5", "gallery-8"),
  },
};

export const projectDetails: Record<string, ProjectDetail> = {
  "business-tower-fitout": {
    client: { ar: "مطوّر عقاري (اسم العميل محجوب)", en: "Real-estate developer (name withheld)" },
    body: {
      ar: "تجهيز ثمانية أدوار مكتبية بمساحات عمل مفتوحة وقاعات اجتماعات ومرافق خدمية، مع أنظمة إضاءة وتكييف موفرة للطاقة.\n\nتم التسليم قبل الموعد المحدد بأسبوعين مع الالتزام الكامل بالميزانية.",
      en: "Fit-out of eight office floors with open workspaces, meeting rooms and amenities, plus energy-efficient lighting and HVAC.\n\nDelivered two weeks ahead of schedule and fully on budget.",
    },
    scope: [
      { ar: "أعمال التشطيبات المعمارية", en: "Architectural finishes" },
      { ar: "الأعمال الكهروميكانيكية", en: "MEP works" },
      { ar: "توريد الأثاث المكتبي", en: "Office furniture supply" },
    ],
    gallery: g("project-1", "gallery-1", "gallery-5"),
  },
  "logistics-hub": {
    client: { ar: "شركة تجزئة (اسم العميل محجوب)", en: "Retail company (name withheld)" },
    body: {
      ar: "تصميم وتشغيل مركز توزيع إقليمي بنظام إدارة مستودعات متكامل، يخدم أكثر من مئة نقطة بيع.\n\nالمشروع قيد التشغيل التدريجي مع خطة توسع للمرحلة الثانية.",
      en: "Design and operation of a regional distribution centre with an integrated WMS serving over a hundred points of sale.\n\nThe project is in phased operation with a second-stage expansion plan.",
    },
    scope: [
      { ar: "تصميم تخطيط المستودع", en: "Warehouse layout design" },
      { ar: "أنظمة الرفوف والمناولة", en: "Racking and handling systems" },
      { ar: "تشغيل وإدارة", en: "Operations management" },
    ],
    gallery: g("project-2", "gallery-2", "service-logistics"),
  },
  "medical-center-supply": {
    client: { ar: "مركز رعاية صحية (اسم العميل محجوب)", en: "Healthcare centre (name withheld)" },
    body: {
      ar: "توريد وتركيب تجهيزات العيادات والمكاتب الإدارية وأنظمة الانتظار والاستقبال وفق اشتراطات الجهات الصحية.",
      en: "Supply and installation of clinic and office equipment, plus waiting and reception systems, to healthcare authority requirements.",
    },
    scope: [
      { ar: "تجهيزات العيادات", en: "Clinic equipment" },
      { ar: "الأثاث الإداري", en: "Administrative furniture" },
      { ar: "التدريب على التشغيل", en: "Operator training" },
    ],
    gallery: g("project-3", "gallery-7", "gallery-4"),
  },
  "industrial-maintenance": {
    client: { ar: "منشأة صناعية (اسم العميل محجوب)", en: "Industrial facility (name withheld)" },
    body: {
      ar: "عقد صيانة وقائية وتشغيلية على مدار الساعة لمرافق خدمية داخل منشأة صناعية، بفريق مقيم ومؤشرات أداء شهرية.",
      en: "A 24/7 preventive and operational maintenance contract for utilities within an industrial facility, with an on-site team and monthly KPIs.",
    },
    scope: [
      { ar: "صيانة المعدات الدوارة", en: "Rotating equipment maintenance" },
      { ar: "أنظمة التكييف والتبريد", en: "HVAC and chillers" },
      { ar: "إدارة قطع الغيار", en: "Spare-parts management" },
    ],
    gallery: g("project-4", "gallery-9", "gallery-3"),
  },
  "campus-network": {
    client: { ar: "جهة تعليمية (اسم العميل محجوب)", en: "Education provider (name withheld)" },
    body: {
      ar: "تنفيذ البنية التحتية للشبكات والأنظمة الأمنية لمجمع تعليمي يضم عدة مبانٍ وقاعات، مع غرفة تحكم مركزية.",
      en: "Network infrastructure and security systems for a multi-building education campus, with a central control room.",
    },
    scope: [
      { ar: "الشبكات السلكية واللاسلكية", en: "Wired and wireless networks" },
      { ar: "كاميرات المراقبة", en: "CCTV" },
      { ar: "أنظمة القاعات الذكية", en: "Smart classroom systems" },
    ],
    gallery: g("project-5", "gallery-8", "service-tech"),
  },
  "hotel-operations": {
    client: { ar: "منشأة فندقية (اسم العميل محجوب)", en: "Hospitality operator (name withheld)" },
    body: {
      ar: "تجهيز الغرف والأجنحة والمرافق العامة لمنشأة فندقية، وتقديم خدمات التشغيل والصيانة خلال السنة الأولى.",
      en: "Fit-out of rooms, suites and public areas for a hotel, plus operations and maintenance during the first year.",
    },
    scope: [
      { ar: "تجهيز الغرف", en: "Room fit-out" },
      { ar: "المطابخ والمغاسل", en: "Kitchens and laundry" },
      { ar: "تشغيل وصيانة", en: "Operations & maintenance" },
    ],
    gallery: g("project-6", "gallery-5", "gallery-6"),
  },
};

const sectorBody = (ar: string, en: string): SectorDetail["body"] => ({ ar, en });

export const sectorDetails: Record<string, SectorDetail> = {
  government: {
    body: sectorBody(
      "نعمل مع الجهات الحكومية وفق نظام المنافسات والمشتريات الحكومية، ونقدم حلولًا موثقة وشفافة تحقق أعلى قيمة للمال العام.",
      "We work with public entities under the Government Tenders and Procurement Law, delivering transparent, documented solutions that maximise value for public money.",
    ),
    challenges: [
      { ar: "الامتثال الكامل للأنظمة", en: "Full regulatory compliance" },
      { ar: "متطلبات المحتوى المحلي", en: "Local content requirements" },
      { ar: "جداول زمنية صارمة", en: "Strict timelines" },
    ],
  },
  construction: {
    body: sectorBody(
      "شريك تنفيذي لمطوري المشاريع والمقاولين الرئيسيين في أعمال التشطيب والتوريد والصيانة.",
      "A delivery partner for developers and main contractors in fit-out, supply and maintenance.",
    ),
    challenges: [
      { ar: "تنسيق متعدد الأطراف", en: "Multi-party coordination" },
      { ar: "ضبط التكاليف", en: "Cost control" },
      { ar: "السلامة في المواقع", en: "Site safety" },
    ],
  },
  energy: {
    body: sectorBody(
      "نخدم المنشآت الصناعية وقطاع الطاقة بتوريد المعدات وقطع الغيار وعقود الصيانة طويلة الأجل.",
      "We serve industrial and energy facilities with equipment, spare parts and long-term maintenance contracts.",
    ),
    challenges: [
      { ar: "استمرارية التشغيل", en: "Operational continuity" },
      { ar: "معايير السلامة العالية", en: "High safety standards" },
      { ar: "إدارة قطع الغيار", en: "Spare-parts management" },
    ],
  },
  health: {
    body: sectorBody(
      "نجهز المرافق الصحية ونساعد في تشغيلها وفق اشتراطات الجهات المختصة ومعايير مكافحة العدوى.",
      "We equip and help operate healthcare facilities in line with authority requirements and infection-control standards.",
    ),
    challenges: [
      { ar: "اشتراطات تنظيمية دقيقة", en: "Strict regulations" },
      { ar: "التشغيل دون انقطاع", en: "Uninterrupted operation" },
      { ar: "النظافة والتعقيم", en: "Hygiene and sterilisation" },
    ],
  },
  education: {
    body: sectorBody(
      "نوفر بيئات تعليمية حديثة عبر تجهيز القاعات والمختبرات وأنظمة التعليم الذكي.",
      "We create modern learning environments by equipping classrooms, labs and smart-learning systems.",
    ),
    challenges: [
      { ar: "التنفيذ خارج أوقات الدراسة", en: "Work outside term time" },
      { ar: "متانة التجهيزات", en: "Durable equipment" },
      { ar: "التقنيات الحديثة", en: "Modern technology" },
    ],
  },
  retail: {
    body: sectorBody(
      "ندعم شركات التجزئة بحلول لوجستية وتجهيزات للفروع ومراكز التوزيع.",
      "We support retailers with logistics and fit-out for branches and distribution centres.",
    ),
    challenges: [
      { ar: "سرعة الافتتاح", en: "Fast store openings" },
      { ar: "إدارة المخزون", en: "Inventory management" },
      { ar: "تغطية جغرافية", en: "Geographic coverage" },
    ],
  },
  hospitality: {
    body: sectorBody(
      "نقدم للفنادق والمنتجعات حلول تجهيز وتشغيل تواكب نمو قطاع السياحة في المملكة.",
      "We provide hotels and resorts with fit-out and operations solutions aligned with the Kingdom’s tourism growth.",
    ),
    challenges: [
      { ar: "تجربة الضيف", en: "Guest experience" },
      { ar: "الجودة الفاخرة", en: "Premium quality" },
      { ar: "التشغيل الموسمي", en: "Seasonal operations" },
    ],
  },
  industrial: {
    body: sectorBody(
      "ندير سلاسل الإمداد ومستلزمات خطوط الإنتاج بما يقلل التوقف ويرفع الكفاءة.",
      "We manage supply chains and production consumables to minimise downtime and raise efficiency.",
    ),
    challenges: [
      { ar: "تقليل التوقف", en: "Minimising downtime" },
      { ar: "جودة المدخلات", en: "Input quality" },
      { ar: "تكلفة التشغيل", en: "Operating cost" },
    ],
  },
};

export const newsBodies: Record<string, NewsBody> = {
  "new-branch-opening": {
    body: {
      ar: "أعلنت شركة الريادة التجارية افتتاح فرعها الجديد في مدينة الدمام، في خطوة تهدف إلى تعزيز حضورها في المنطقة الشرقية وتقديم خدمات أسرع للعملاء.\n\nويضم الفرع فريقًا متخصصًا في التوريد والخدمات اللوجستية، إضافة إلى مستودع لخدمة المشاريع في المنطقة.\n\nويأتي هذا التوسع ضمن الخطة الاستراتيجية للشركة للأعوام الثلاثة القادمة.",
      en: "Al-Riyada Trading Company announced the opening of its new branch in Dammam, strengthening its presence in the Eastern Province and serving clients faster.\n\nThe branch includes a team specialised in procurement and logistics, plus a warehouse serving regional projects.\n\nThis expansion is part of the company’s three-year strategic plan.",
    },
  },
  "quality-management-journey": {
    body: {
      ar: "يمثل نظام إدارة الجودة حجر الأساس لأي منشأة تسعى إلى النمو المستدام. وفيما يلي خطوات عملية للبدء:\n\n- تحديد العمليات الرئيسية وتوثيقها.\n- وضع مؤشرات أداء قابلة للقياس.\n- تدريب الفريق على الإجراءات.\n- المراجعة الدورية والتحسين المستمر.\n\nالنجاح لا يأتي من الوثائق وحدها، بل من ثقافة جودة يتبناها الجميع.",
      en: "A quality management system is the foundation for sustainable growth. Here are practical steps to begin:\n\n- Identify and document key processes.\n- Set measurable KPIs.\n- Train the team on procedures.\n- Review regularly and improve continuously.\n\nSuccess comes not from documents alone, but from a quality culture embraced by everyone.",
    },
  },
  "industry-exhibition-participation": {
    body: {
      ar: "شاركت الشركة في معرض الأعمال والتوريد بجناح تعريفي، التقى فيه فريقنا بعدد من ممثلي الجهات الحكومية والشركات الخاصة لاستعراض أحدث الحلول.",
      en: "The company took part in the Business & Supply Expo with a showcase stand where our team met representatives of public and private organisations.",
    },
    eventDate: "2026-07-10",
    eventLocation: { ar: "مركز المعارض — الرياض", en: "Exhibition Centre — Riyadh" },
  },
  "supply-chain-trends": {
    body: {
      ar: "تشهد سلاسل الإمداد تحولات متسارعة بفعل التقنية وتغير توقعات العملاء. ومن أبرز الاتجاهات:\n\n- الاعتماد على البيانات في التنبؤ بالطلب.\n- تنويع مصادر التوريد محليًا.\n- أتمتة المستودعات.\n\nالمنشآت التي تستثمر مبكرًا في هذه الاتجاهات تحقق مرونة أعلى.",
      en: "Supply chains are changing fast due to technology and shifting customer expectations. Key trends include:\n\n- Data-driven demand forecasting.\n- Diversifying local sourcing.\n- Warehouse automation.\n\nOrganisations investing early gain greater resilience.",
    },
  },
  "working-hours-announcement": {
    body: {
      ar: "تعلن الشركة عن تعديل ساعات العمل الرسمية لتصبح من الأحد إلى الخميس، من الساعة 8:00 صباحًا حتى 5:00 مساءً، اعتبارًا من بداية الشهر القادم.",
      en: "The company announces updated official working hours: Sunday to Thursday, 8:00 AM to 5:00 PM, effective from the start of next month.",
    },
  },
  "partners-forum": {
    body: {
      ar: "تنظم الشركة ملتقى الشركاء السنوي لمناقشة فرص التعاون واستعراض مؤشرات الأداء وتكريم الموردين المتميزين.",
      en: "The company hosts its annual partners forum to discuss collaboration opportunities, review performance and recognise outstanding suppliers.",
    },
    eventDate: "2026-11-25",
    eventLocation: { ar: "قاعة المؤتمرات — المقر الرئيسي", en: "Conference Hall — Head Office" },
  },
  "safety-week": {
    body: {
      ar: "اختتمت الشركة أسبوع الصحة والسلامة المهنية بمشاركة جميع فرق المواقع، وتضمن ورش عمل وتدريبات عملية على الإخلاء والإسعافات الأولية.",
      en: "The company concluded its Occupational Health & Safety Week with all site teams, including workshops and hands-on evacuation and first-aid drills.",
    },
  },
};
