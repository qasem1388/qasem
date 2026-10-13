'use strict';
/**
 * بيانات تجريبية لعرض الموقع مباشرة بعد التثبيت.
 * جميع هذه البيانات قابلة للتعديل أو الحذف من لوحة التحكم.
 */
const storage = require('../../core/storage');
const { patternImage, logoImage, samplePdf } = require('./images');

const P = '#0f766e';
const S = '#c99a2e';

async function saveMedia(knex, buffer, name, kind) {
  const ext = kind === 'pdf' ? 'pdf' : 'png';
  const info = { ext, kind, mime: kind === 'pdf' ? 'application/pdf' : 'image/png' };
  const { fileName, url } = await storage.savePublic({ buffer }, info);
  await knex('media_files').insert({ original_name: `${name}.${ext}`, file_name: fileName, url, mime_type: info.mime, kind, size: buffer.length });
  return url;
}

const today = new Date();
const isoDay = (offset = 0) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);

async function seedDemo(knex) {
  const palette = [
    ['#0f766e', '#134e4a'], ['#155e75', '#0f766e'], ['#7c5a12', '#c99a2e'], ['#1e3a5f', '#0f766e'],
    ['#14532d', '#0f766e'], ['#3f3f46', '#0f766e'],
  ];
  const img = (w, h, i, name) => saveMedia(knex, patternImage(w, h, palette[i % palette.length][0], palette[i % palette.length][1], i), name, 'image');

  const logo = await saveMedia(knex, logoImage(256, P, S), 'logo', 'image');

  // ===== الإعدادات =====
  const settings = {
    org_name: 'جمعية الخير الأهلية',
    org_tagline: 'معًا نصنع أثرًا مستدامًا',
    logo,
    favicon: logo,
    org_description: 'جمعية أهلية غير ربحية مسجلة لدى المركز الوطني لتنمية القطاع غير الربحي، تعمل على تمكين الأسر والأفراد وتقديم الخدمات الاجتماعية والتنموية.',
    license_number: '1234',
    email: 'info@example.org',
    phone: '0110000000',
    mobile: '0500000000',
    whatsapp_number: '966500000000',
    city: 'الرياض',
    address: 'المملكة العربية السعودية، الرياض، حي النموذج، شارع المثال',
    map_url: 'https://maps.google.com/?q=Riyadh',
    working_hours: 'الأحد – الخميس: 8 صباحًا – 4 مساءً',
    home_about_text: 'جمعية أهلية تعمل على تمكين الأسر المحتاجة وتنمية المجتمع عبر برامج نوعية مستدامة، بالشراكة مع القطاعين الحكومي والخاص.',
    home_services_subtitle: 'نقدم مجموعة من الخدمات والبرامج التنموية التي تلامس احتياجات المستفيدين',
    footer_about: 'جمعية أهلية غير ربحية تسعى لخدمة المجتمع وتمكين الأسر عبر برامج تنموية مستدامة وشراكات فاعلة.',
    seo_title: 'جمعية الخير الأهلية',
    seo_description: 'الموقع الرسمي لجمعية الخير الأهلية: الأخبار، المشاريع، الحوكمة، التطوع والوظائف.',
    seo_keywords: 'جمعية, جمعية أهلية, تطوع, تنمية, السعودية',
    governance_intro: 'إيمانًا بمبادئ الشفافية والإفصاح، ننشر هنا وثائق الحوكمة والتقارير والقوائم المالية مصنفة حسب السنوات.',
    members_intro: 'نعتز بفريق عمل الجمعية ومجلس إدارتها وأعضاء جمعيتها العمومية.',
    volunteer_intro: 'انضم إلى فريق المتطوعين وساهم في صناعة الأثر. يسعدنا تسجيلك وسيتواصل معك فريقنا بعد مراجعة الطلب.',
    volunteer_areas: 'تنظيم الفعاليات\nالتعليم والتدريب\nالدعم الاجتماعي\nالتصميم والإعلام\nالتقنية\nالخدمات الميدانية',
    jobs_intro: 'نبحث دائمًا عن الكفاءات المتميزة للانضمام إلى فريق الجمعية.',
    contact_intro: 'يسعدنا تواصلك معنا لأي استفسار أو اقتراح.',
  };
  for (const [key, value] of Object.entries(settings)) {
    await knex('site_settings').insert({ key, value: JSON.stringify(value), group_name: 'seed' }).onConflict('key').merge();
  }

  // ===== الشرائح =====
  const slides = [
    ['معًا نصنع أثرًا مستدامًا', 'برامج تنموية نوعية لتمكين الأسر والأفراد', 'تعرّف علينا', '/about'],
    ['كن جزءًا من التغيير', 'انضم إلى فريق المتطوعين وشارك في خدمة المجتمع', 'سجّل متطوعًا', '/volunteer'],
    ['الشفافية والحوكمة', 'نلتزم بأعلى معايير الإفصاح والحوكمة', 'ملفات الحوكمة', '/governance'],
    ['مشاريعنا التنموية', 'مشاريع تلامس احتياجات المستفيدين وتحقق الاستدامة', 'استعرض المشاريع', '/projects'],
  ];
  for (let i = 0; i < slides.length; i++) {
    const [title, description, button_text, button_url] = slides[i];
    await knex('homepage_slides').insert({ title, description, button_text, button_url, image: await img(1920, 250, i, `slide-${i + 1}`), sort_order: i + 1 });
  }

  // ===== الرسالة والرؤية والقيم =====
  await knex('mission_vision_values').insert([
    { kind: 'vision', title: 'الرؤية', content: 'أن نكون جمعية رائدة في التنمية المجتمعية المستدامة على مستوى المملكة.', icon: 'fa-solid fa-eye', sort_order: 1 },
    { kind: 'mission', title: 'الرسالة', content: 'تقديم برامج وخدمات تنموية نوعية تمكّن الأسر والأفراد عبر شراكات فاعلة وكوادر مؤهلة.', icon: 'fa-solid fa-bullseye', sort_order: 2 },
    { kind: 'values', title: 'القيم', content: 'الشفافية • الإتقان • المسؤولية • التعاون • الاستدامة', icon: 'fa-solid fa-gem', sort_order: 3 },
  ]);

  // ===== الإحصائيات =====
  await knex('statistics').insert([
    { scope: 'home', label: 'مستفيد', value: 12500, prefix: '+', icon: 'fa-solid fa-people-group', sort_order: 1 },
    { scope: 'home', label: 'متطوع ومتطوعة', value: 840, prefix: '+', icon: 'fa-solid fa-handshake-angle', sort_order: 2 },
    { scope: 'home', label: 'برنامج', value: 36, icon: 'fa-solid fa-layer-group', sort_order: 3 },
    { scope: 'home', label: 'مشروع منجز', value: 58, icon: 'fa-solid fa-diagram-project', sort_order: 4 },
    { scope: 'satisfaction', label: 'نسبة رضا المستفيدين', value: 92, suffix: '%', icon: 'fa-solid fa-face-smile', sort_order: 1 },
    { scope: 'satisfaction', label: 'مشارك في الاستبيان', value: 1350, icon: 'fa-solid fa-clipboard-check', sort_order: 2 },
    { scope: 'needs', label: 'أسرة شملتها الدراسة', value: 2100, icon: 'fa-solid fa-house-user', sort_order: 1 },
    { scope: 'needs', label: 'حي سكني', value: 18, icon: 'fa-solid fa-map-location-dot', sort_order: 2 },
  ]);

  // ===== الخدمات =====
  const services = [
    ['السلال الغذائية', 'توفير السلال الغذائية الشهرية للأسر المستحقة وفق معايير دقيقة.', 'fa-solid fa-basket-shopping'],
    ['كفالة الأيتام', 'رعاية متكاملة للأيتام تشمل الجوانب التعليمية والصحية والاجتماعية.', 'fa-solid fa-children'],
    ['التمكين الاقتصادي', 'برامج تدريب وتأهيل للأسر المنتجة وربطها بفرص العمل.', 'fa-solid fa-chart-line'],
    ['الإسكان الخيري', 'ترميم وتأهيل المساكن للأسر المحتاجة لتوفير بيئة آمنة.', 'fa-solid fa-house-chimney'],
    ['البرامج التعليمية', 'دعم الطلاب والطالبات بالحقائب المدرسية والدروس التقوية.', 'fa-solid fa-graduation-cap'],
    ['الرعاية الصحية', 'مبادرات توعوية وصحية بالشراكة مع الجهات المتخصصة.', 'fa-solid fa-heart-pulse'],
  ];
  for (let i = 0; i < services.length; i++) {
    const [title, description, icon] = services[i];
    await knex('services').insert({ title, description, icon, button_text: 'التفاصيل', button_url: '/projects', image: i < 3 ? await img(800, 500, i + 2, `service-${i + 1}`) : null, sort_order: i + 1 });
  }

  // ===== المشاريع =====
  const projects = [
    ['مشروع سلة الخير', 'سلة-الخير', 'الأمن الغذائي', 'توزيع أكثر من 5000 سلة غذائية سنويًا على الأسر المستحقة.'],
    ['برنامج الأسر المنتجة', 'الأسر-المنتجة', 'التمكين الاقتصادي', 'تدريب الأسر على مهارات الإنتاج والتسويق وتحقيق الاكتفاء.'],
    ['مشروع ترميم المنازل', 'ترميم-المنازل', 'الإسكان', 'ترميم المنازل المتهالكة وتوفير بيئة سكنية آمنة.'],
  ];
  for (let i = 0; i < projects.length; i++) {
    const [title, slug, category, summary] = projects[i];
    await knex('projects').insert({
      title, slug, category, summary, status: 'published', is_featured: i === 0, sort_order: i + 1,
      image: await img(960, 560, i + 1, `project-${i + 1}`), beneficiaries: 'الأسر المحتاجة', start_date: isoDay(-200), gallery: '[]',
      content: `<p>${summary}</p><h3>أهداف المشروع</h3><ul><li>تلبية الاحتياجات الأساسية للأسر.</li><li>تعزيز الاستقرار الأسري.</li><li>تحقيق الاستدامة عبر الشراكات.</li></ul>`,
    });
  }

  // ===== عن الجمعية =====
  await knex('about_content').insert([
    { section_key: 'overview', title: 'نبذة عن الجمعية', icon: 'fa-solid fa-circle-info', sort_order: 1, content: '<p>جمعية الخير الأهلية جمعية غير ربحية مسجلة لدى المركز الوطني لتنمية القطاع غير الربحي، تأسست بهدف خدمة المجتمع المحلي وتمكين الأسر عبر برامج تنموية مستدامة.</p>' },
    { section_key: 'history', title: 'تاريخ الجمعية', icon: 'fa-solid fa-clock-rotate-left', sort_order: 2, content: '<p>تأسست الجمعية عام 1430هـ بمبادرة من نخبة من أبناء المجتمع، وتوسعت خدماتها لتشمل عدة أحياء ومحافظات.</p><table><thead><tr><th>العام</th><th>الحدث</th></tr></thead><tbody><tr><td>1430هـ</td><td>تأسيس الجمعية</td></tr><tr><td>1438هـ</td><td>إطلاق برنامج الأسر المنتجة</td></tr><tr><td>1445هـ</td><td>تجاوز 10,000 مستفيد</td></tr></tbody></table>' },
    { section_key: 'goals', title: 'الأهداف العامة', icon: 'fa-solid fa-flag', sort_order: 3, content: '<ul><li>تقديم الخدمات الاجتماعية للأسر المحتاجة.</li><li>تنمية قدرات الأفراد وتمكينهم اقتصاديًا.</li><li>تعزيز العمل التطوعي في المجتمع.</li></ul>' },
    { section_key: 'strategic_goals', title: 'الأهداف الاستراتيجية', icon: 'fa-solid fa-chess', sort_order: 4, content: '<ol><li>رفع كفاءة الخدمات المقدمة للمستفيدين.</li><li>تنويع مصادر الدخل وتحقيق الاستدامة المالية.</li><li>تطوير الحوكمة والتحول الرقمي.</li></ol>' },
  ]);

  // ===== الحوكمة =====
  const year = today.getFullYear();
  for (let y = year - 2; y <= year; y++) {
    const [ins] = await knex('governance_years').insert({ year: y, title: `وثائق عام ${y}`, sort_order: year - y + 1 }).returning('id');
    const yearId = typeof ins === 'object' ? ins.id : ins;
    const docs = ['القوائم المالية المدققة', 'التقرير السنوي', 'محضر اجتماع الجمعية العمومية'];
    for (let i = 0; i < docs.length; i++) {
      const url = await saveMedia(knex, samplePdf(`Governance ${y} - Document ${i + 1}`), `governance-${y}-${i + 1}`, 'pdf');
      await knex('governance_files').insert({ year_id: yearId, title: `${docs[i]} ${y}`, file_date: `${y}-0${i + 3}-15`, file_url: url, sort_order: i + 1 });
    }
  }
  await knex('governance_files').where('title', 'like', 'التقرير السنوي%').update({ description: 'يتضمن إنجازات الجمعية وبرامجها خلال العام.' });

  // ===== الأعضاء =====
  const people = [
    ['general_assembly', 'أحمد بن محمد العبدالله', 'عضو جمعية عمومية'], ['general_assembly', 'خالد بن سعد القحطاني', 'عضو جمعية عمومية'],
    ['general_assembly', 'نورة بنت عبدالرحمن السالم', 'عضو جمعية عمومية'], ['board', 'عبدالله بن فهد الدوسري', 'رئيس مجلس الإدارة'],
    ['board', 'سارة بنت علي الحربي', 'نائب رئيس المجلس'], ['board', 'محمد بن ناصر الشهري', 'المشرف المالي'], ['board', 'فهد بن عبدالعزيز المطيري', 'عضو مجلس الإدارة'],
  ];
  for (let i = 0; i < people.length; i++) {
    const [member_group, name, position] = people[i];
    await knex('members').insert({ member_group, name, position, sort_order: i + 1, bio: 'عضو فاعل يسهم في تحقيق رسالة الجمعية وأهدافها.' });
  }
  await knex('employees').insert([
    { name: 'ريم بنت سعود العتيبي', position: 'مديرة البرامج', department: 'إدارة البرامج والمشاريع', sort_order: 1 },
    { name: 'ماجد بن حسن الزهراني', position: 'محاسب', department: 'الإدارة المالية', sort_order: 2 },
    { name: 'هند بنت خالد الغامدي', position: 'منسقة التطوع', department: 'إدارة التطوع', sort_order: 3 },
  ]);
  await knex('executive_manager').insert({
    name: 'م. عمر بن عبدالله الراشد', job_title: 'المدير التنفيذي', national_id: '1000000000', show_national_id: false,
    mobile: '0500000001', email: 'ceo@example.org', photo: null,
    bio: '<p>يحمل درجة الماجستير في إدارة المنظمات غير الربحية، وله خبرة تزيد عن 15 عامًا في العمل التنموي وقيادة الفرق.</p>',
  });

  // ===== الهيكل التنظيمي =====
  const unit = async (name, unit_type, parent_id, holder_name, sort_order) => {
    const [ins] = await knex('organizational_units').insert({ name, unit_type, parent_id, holder_name, sort_order }).returning('id');
    return typeof ins === 'object' ? ins.id : ins;
  };
  const ga = await unit('الجمعية العمومية', 'board', null, null, 1);
  const board = await unit('مجلس الإدارة', 'board', ga, 'عبدالله الدوسري', 1);
  await unit('لجنة المراجعة', 'committee', board, null, 1);
  const ceo = await unit('المدير التنفيذي', 'management', board, 'م. عمر الراشد', 2);
  const prog = await unit('إدارة البرامج والمشاريع', 'department', ceo, 'ريم العتيبي', 1);
  await unit('قسم الخدمات الاجتماعية', 'section', prog, null, 1);
  await unit('قسم التطوع', 'section', prog, 'هند الغامدي', 2);
  const fin = await unit('الإدارة المالية والإدارية', 'department', ceo, null, 2);
  await unit('المحاسبة', 'section', fin, 'ماجد الزهراني', 1);
  await unit('إدارة الاتصال وتنمية الموارد', 'department', ceo, null, 3);

  // ===== الأخبار =====
  const [c1] = await knex('news_categories').insert({ name: 'أخبار الجمعية', slug: 'أخبار-الجمعية', sort_order: 1 }).returning('id');
  const [c2] = await knex('news_categories').insert({ name: 'فعاليات', slug: 'فعاليات', sort_order: 2 }).returning('id');
  const catId = (c) => (typeof c === 'object' ? c.id : c);
  const news = [
    ['الجمعية توقع اتفاقية شراكة لدعم الأسر المنتجة', catId(c1)],
    ['إطلاق حملة السلال الغذائية لشهر رمضان', catId(c2)],
    ['تكريم المتطوعين المتميزين في الحفل السنوي', catId(c2)],
    ['اجتماع الجمعية العمومية العادي', catId(c1)],
  ];
  for (let i = 0; i < news.length; i++) {
    const [title, category_id] = news[i];
    await knex('news').insert({
      title, slug: `خبر-${i + 1}`, category_id, author_name: 'المركز الإعلامي', published_at: isoDay(-i * 9), status: 'published', is_featured: i === 0,
      image: await img(960, 540, i + 1, `news-${i + 1}`), gallery: '[]', attachments: '[]',
      excerpt: 'في إطار سعي الجمعية لتعزيز أثرها المجتمعي، أعلنت اليوم عن خطوة جديدة تخدم المستفيدين وتحقق الاستدامة.',
      content: '<p>في إطار سعي الجمعية لتعزيز أثرها المجتمعي، أعلنت اليوم عن خطوة جديدة تخدم المستفيدين وتحقق الاستدامة.</p><p>وأكد المدير التنفيذي أن هذه المبادرة تأتي ضمن الخطة الاستراتيجية للجمعية، وبالشراكة مع عدد من الجهات الداعمة.</p><blockquote>نسعى لأن يكون لكل برنامج أثر ملموس ومستدام.</blockquote>',
    });
  }

  // ===== الفيديوهات والألبومات =====
  await knex('media_videos').insert([
    { title: 'فيلم تعريفي عن الجمعية', youtube_url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', youtube_id: 'aqz-KE-bpKQ', description: 'فيلم قصير يعرّف بالجمعية وبرامجها.', video_date: isoDay(-30), sort_order: 1 },
    { title: 'تغطية الحفل السنوي', youtube_url: 'https://youtu.be/ScMzIvxBSi4', youtube_id: 'ScMzIvxBSi4', description: 'لقطات من الحفل السنوي لتكريم المتطوعين.', video_date: isoDay(-60), sort_order: 2 },
  ]);
  const [a1] = await knex('albums').insert({ title: 'الحفل السنوي', slug: 'الحفل-السنوي', description: 'صور من الحفل السنوي للجمعية', album_date: isoDay(-60), sort_order: 1, cover_image: await img(800, 600, 0, 'album-1') }).returning('id');
  const albumId = typeof a1 === 'object' ? a1.id : a1;
  for (let i = 0; i < 6; i++) await knex('media_images').insert({ album_id: albumId, image: await img(800, 600, i, `album-1-${i + 1}`), caption: `صورة ${i + 1}`, sort_order: i + 1 });

  // ===== المستفيدون =====
  await knex('beneficiary_needs').insert([
    { section_type: 'intro', title: 'تعريف الدراسة', sort_order: 1, content: '<p>دراسة ميدانية تهدف إلى التعرف على الاحتياجات الفعلية للمستفيدين لتوجيه برامج الجمعية بما يحقق أعلى أثر.</p>', attachments: '[]' },
    { section_type: 'goals', title: 'أهداف الدراسة', sort_order: 2, content: '<ul><li>تحديد أولويات الاحتياج.</li><li>قياس الفجوات في الخدمات الحالية.</li><li>بناء خطة تشغيلية مبنية على البيانات.</li></ul>', attachments: '[]' },
    { section_type: 'results', title: 'نتائج الدراسة', sort_order: 3, content: '<table><thead><tr><th>الاحتياج</th><th>النسبة</th></tr></thead><tbody><tr><td>الاحتياج الغذائي</td><td>45%</td></tr><tr><td>الإسكان</td><td>25%</td></tr><tr><td>التعليم</td><td>18%</td></tr><tr><td>الصحة</td><td>12%</td></tr></tbody></table>', attachments: '[]' },
  ]);
  await knex('satisfaction_surveys').insert([
    { section_type: 'intro', title: 'تعريف قياس الرضا', sort_order: 1, content: '<p>نقيس رضا المستفيدين بشكل دوري لضمان جودة الخدمات وتحسينها المستمر.</p>', attachments: '[]' },
    { section_type: 'results', title: `نتائج قياس الرضا ${year - 1}`, survey_year: String(year - 1), satisfaction_rate: 92, sort_order: 2, content: '<p>بلغت نسبة الرضا العامة 92% من إجمالي المشاركين.</p>', attachments: '[]' },
  ]);

  // ===== الوظائف =====
  await knex('job_posts').insert([
    { title: 'أخصائي اجتماعي', slug: 'أخصائي-اجتماعي', department: 'إدارة البرامج', job_type: 'full_time', location: 'الرياض', start_date: isoDay(-5), end_date: isoDay(30), status: 'published', sort_order: 1,
      description: '<p>دراسة حالات المستفيدين ومتابعتها وتقديم الدعم الاجتماعي اللازم.</p>', qualifications: 'بكالوريوس خدمة اجتماعية أو علم اجتماع', experience: 'خبرة لا تقل عن سنتين في مجال العمل الاجتماعي', skills: 'مهارات التواصل\nإعداد التقارير\nالعمل ضمن فريق' },
    { title: 'منسق إعلامي', slug: 'منسق-إعلامي', department: 'إدارة الاتصال', job_type: 'part_time', location: 'الرياض', start_date: isoDay(-3), end_date: isoDay(20), status: 'published', sort_order: 2,
      description: '<p>إدارة حسابات التواصل الاجتماعي وإعداد المحتوى الإعلامي للجمعية.</p>', qualifications: 'بكالوريوس إعلام أو تسويق', experience: 'سنة على الأقل', skills: 'كتابة المحتوى\nالتصميم الأساسي\nإدارة الحسابات' },
  ]);

  // ===== مواقع التواصل =====
  await knex('social_links').insert([
    { platform: 'x', url: 'https://x.com/', sort_order: 1 },
    { platform: 'instagram', url: 'https://instagram.com/', sort_order: 2 },
    { platform: 'snapchat', url: 'https://snapchat.com/', sort_order: 3 },
    { platform: 'youtube', url: 'https://youtube.com/', sort_order: 4 },
    { platform: 'whatsapp', url: 'https://wa.me/966500000000', sort_order: 5 },
  ]);

  // ===== الصفحات الديناميكية =====
  await knex('pages').insert([
    { name: 'سياسة الخصوصية', slug: 'privacy', title: 'سياسة الخصوصية', status: 'published', show_in_footer: true, sort_order: 1, content: '<p>نلتزم بحماية خصوصية بياناتك وعدم مشاركتها مع أي طرف ثالث إلا وفق الأنظمة المعمول بها.</p>' },
    { name: 'الشركاء', slug: 'partners', title: 'شركاؤنا', status: 'published', show_in_footer: true, sort_order: 2, content: '<p>نفخر بشراكتنا مع عدد من الجهات الحكومية والخاصة والقطاع غير الربحي.</p>' },
  ]);

  // ===== القائمة الرئيسية =====
  const nav = async (label, url, sort_order, parent_id = null, location = 'header') => {
    const [ins] = await knex('navigation_items').insert({ label, url, sort_order, parent_id, location, link_type: 'url' }).returning('id');
    return typeof ins === 'object' ? ins.id : ins;
  };
  await nav('الرئيسية', '/', 1);
  const about = await nav('عن الجمعية', '/about', 2);
  await nav('نبذة عن الجمعية', '/about', 1, about);
  await nav('الأعضاء والمنسوبون', '/members', 2, about);
  await nav('المدير التنفيذي', '/executive-manager', 3, about);
  await nav('الهيكل التنظيمي', '/organizational-structure', 4, about);
  await nav('الحوكمة', '/governance', 3);
  const programs = await nav('البرامج والمشاريع', '/projects', 4);
  await nav('المشاريع والبرامج', '/projects', 1, programs);
  await nav('دراسة احتياج المستفيدين', '/beneficiary-needs', 2, programs);
  await nav('قياس رضا المستفيدين', '/beneficiary-satisfaction', 3, programs);
  await nav('المركز الإعلامي', '/media-center', 5);
  await nav('التطوع', '/volunteer', 6);
  await nav('الوظائف', '/jobs', 7);
  await nav('تواصل معنا', '/contact', 8);
  await nav('المركز الوطني لتنمية القطاع غير الربحي', 'https://ncnp.gov.sa', 1, null, 'footer');
  await nav('منصة إحسان', 'https://ehsan.sa', 2, null, 'footer');
  await knex('navigation_items').where('location', 'footer').update({ open_new_tab: true });
}

module.exports = { seedDemo };
