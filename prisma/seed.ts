/* بيانات تجريبية لتشغيل المتجر مباشرة: تصنيفات، منتجات بألوان، بنرات، كوبونات، تقييمات، وطلبات */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const SEED_DIR = path.join(UPLOAD_DIR, "seed");

type Shape = "bottle" | "watch" | "bag" | "headphones" | "shirt" | "vase" | "shoe" | "phone";

function shapeSvg(shape: Shape, color: string, accent: string) {
  switch (shape) {
    case "bottle":
      return `<rect x="520" y="250" width="160" height="110" rx="20" fill="${accent}"/><rect x="380" y="350" width="440" height="560" rx="90" fill="${color}"/><rect x="430" y="420" width="70" height="400" rx="35" fill="#fff" opacity=".25"/><rect x="470" y="560" width="260" height="140" rx="16" fill="#fff" opacity=".85"/>`;
    case "watch":
      return `<rect x="510" y="150" width="180" height="900" rx="60" fill="${accent}"/><circle cx="600" cy="600" r="250" fill="${color}"/><circle cx="600" cy="600" r="205" fill="#fff" opacity=".92"/><rect x="592" y="460" width="16" height="150" rx="8" fill="#222"/><rect x="592" y="592" width="120" height="16" rx="8" fill="#222"/><circle cx="600" cy="600" r="16" fill="${color}"/>`;
    case "bag":
      return `<path d="M470 420 Q600 220 730 420" stroke="${accent}" stroke-width="40" fill="none"/><rect x="330" y="420" width="540" height="480" rx="60" fill="${color}"/><rect x="330" y="560" width="540" height="24" fill="#000" opacity=".12"/><rect x="560" y="540" width="80" height="60" rx="12" fill="${accent}"/>`;
    case "headphones":
      return `<path d="M380 640 Q380 300 600 300 Q820 300 820 640" stroke="${color}" stroke-width="60" fill="none" stroke-linecap="round"/><rect x="310" y="600" width="150" height="250" rx="70" fill="${color}"/><rect x="740" y="600" width="150" height="250" rx="70" fill="${color}"/><rect x="340" y="640" width="90" height="170" rx="45" fill="${accent}"/><rect x="770" y="640" width="90" height="170" rx="45" fill="${accent}"/>`;
    case "shirt":
      return `<path d="M430 300 L340 360 L260 520 L360 580 L410 500 L410 920 L790 920 L790 500 L840 580 L940 520 L860 360 L770 300 Q600 400 430 300 Z" fill="${color}"/><path d="M520 310 Q600 370 680 310" stroke="${accent}" stroke-width="18" fill="none"/>`;
    case "vase":
      return `<path d="M520 260 L680 260 L670 360 Q850 480 800 740 Q760 920 600 920 Q440 920 400 740 Q350 480 530 360 Z" fill="${color}"/><path d="M450 560 Q600 620 750 560" stroke="${accent}" stroke-width="22" fill="none"/>`;
    case "shoe":
      return `<path d="M260 760 L300 520 Q420 520 470 600 Q560 700 760 690 Q930 690 950 800 L950 850 L260 850 Z" fill="${color}"/><rect x="260" y="830" width="690" height="50" rx="20" fill="${accent}"/><path d="M500 640 L560 600 M540 670 L600 630 M580 690 L640 650" stroke="#fff" stroke-width="12"/>`;
    case "phone":
      return `<rect x="410" y="200" width="380" height="800" rx="60" fill="${color}"/><rect x="440" y="250" width="320" height="690" rx="30" fill="${accent}"/><circle cx="600" cy="970" r="0"/><rect x="560" y="222" width="80" height="14" rx="7" fill="#000" opacity=".4"/>`;
  }
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 200;
}

async function productImage(file: string, shape: Shape, color: string, accent: string, bg: [string, string]) {
  // المنتجات الفاتحة تحتاج خلفية أغمق لتظهر بوضوح
  if (isLight(color)) bg = ["#d9dde3", "#9aa3ad"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><defs><radialGradient id="g" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs><rect width="1200" height="1200" fill="url(#g)"/><ellipse cx="600" cy="1010" rx="360" ry="40" fill="#000" opacity=".12"/>${shapeSvg(shape, color, accent)}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(path.join(SEED_DIR, file));
  return `/uploads/seed/${file}`;
}

async function bannerImage(file: string, from: string, to: string, w = 1920, h = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.2}" cy="${h * 0.5}" r="${h * 0.45}" fill="#fff" opacity=".08"/><circle cx="${w * 0.12}" cy="${h * 0.3}" r="${h * 0.2}" fill="#fff" opacity=".1"/><rect x="${w * 0.08}" y="${h * 0.25}" width="${h * 0.5}" height="${h * 0.5}" rx="40" fill="#fff" opacity=".12" transform="rotate(12 ${w * 0.3} ${h * 0.5})"/></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(path.join(SEED_DIR, file));
  return `/uploads/seed/${file}`;
}

const BGS: [string, string][] = [["#ffffff", "#e8ebef"], ["#fdf7f0", "#efe2d0"], ["#f2f7f5", "#c0d9ce"], ["#f4f4f5", "#d4d4d8"]];

async function main() {
  await mkdir(SEED_DIR, { recursive: true });

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.coupon.deleteMany();

  const cats = [
    { slug: "عطور", name: "العطور", shape: "bottle" as Shape, color: "#7b4b2a", from: "#3b2416", to: "#a8763e", desc: "عطور فاخرة شرقية وغربية تدوم طويلاً" },
    { slug: "ساعات", name: "الساعات", shape: "watch" as Shape, color: "#1e2a4a", from: "#0f172a", to: "#334155", desc: "ساعات أنيقة رجالية ونسائية" },
    { slug: "حقائب", name: "الحقائب", shape: "bag" as Shape, color: "#c99a45", from: "#7c2d12", to: "#d97706", desc: "حقائب يد وظهر عصرية" },
    { slug: "الكترونيات", name: "الإلكترونيات", shape: "headphones" as Shape, color: "#111111", from: "#111827", to: "#2563eb", desc: "سماعات وإكسسوارات ذكية" },
    { slug: "ازياء", name: "الأزياء", shape: "shirt" as Shape, color: "#346759", from: "#14532d", to: "#468170", desc: "ملابس عصرية بخامات مريحة" },
    { slug: "المنزل", name: "المنزل والديكور", shape: "vase" as Shape, color: "#d6c3a5", from: "#78350f", to: "#d6c3a5", desc: "لمسات ديكور تضيف دفء لبيتك" },
  ];

  const categoryIds: Record<string, string> = {};
  for (const [i, c] of cats.entries()) {
    const image = await productImage(`cat-${i}.jpg`, c.shape, c.color, "#ffffff", BGS[i % BGS.length]);
    const bannerImageUrl = await bannerImage(`cat-banner-${i}.jpg`, c.from, c.to, 1920, 640);
    const row = await prisma.category.create({
      data: { slug: c.slug, name: c.name, description: c.desc, image, bannerImage: bannerImageUrl, sortOrder: i, seoTitle: `${c.name} أصلية بأفضل الأسعار في السعودية`, seoDescription: `تسوّق ${c.name} أونلاين: ${c.desc}. توصيل 2-5 أيام لكل المدن، الدفع عند الاستلام وتقسيط تمارا وتابي.` },
    });
    categoryIds[c.slug] = row.id;
  }

  type Seed = {
    name: string; cat: string; shape: Shape; price: number; compareAt?: number; brand: string; featured?: boolean; best?: boolean; sales: number;
    colors: [string, string, number][]; titles: Record<string, string>; short: string; desc: string; keywords: string;
  };

  const products: Seed[] = [
    { name: "عطر عود ملكي أو دو بارفيوم 100 مل", cat: "عطور", shape: "bottle", price: 289, compareAt: 390, brand: "دار العود", featured: true, best: true, sales: 412,
      colors: [["عنبري", "#7b4b2a", 25], ["أسود ملكي", "#1a1a1a", 12]],
      titles: { seo: "عطر عود ملكي 100 مل أو دو بارفيوم - ثبات يدوم 24 ساعة", marketing: "عطرك الذي يسبقك ويبقى بعدك طوال اليوم", emotional: "لحضورٍ لا يُنسى في كل مناسبة", short: "عود ملكي 100 مل", luxury: "Royal Oud — توقيع الفخامة الشرقية", ad: "عود ملكي بثبات 24 ساعة", social: "✨ العود اللي الكل بيسألك عنه", question: "تبحث عن عود يثبت من الصبح لآخر الليل؟" },
      short: "عطر عود شرقي فاخر بتركيز أو دو بارفيوم وثبات عالٍ يناسب المناسبات والاستخدام اليومي.",
      desc: "عطر عود ملكي مستوحى من أصالة العود الكمبودي ممزوجاً بلمسات الورد الطائفي والعنبر.\n\n• التركيز: أو دو بارفيوم\n• الحجم: 100 مل\n• الثبات: حتى 24 ساعة على الملابس\n• الفوحان: قوي إلى متوسط\n• يناسب: الرجال والنساء، المناسبات والاستخدام اليومي\n\nيأتي في علبة هدايا فاخرة، مثالي للإهداء.", keywords: "عطر عود، عود ملكي، عطور رجالية، عطر ثابت، oud perfume" },
    { name: "عطر مسك الورد للنساء 75 مل", cat: "عطور", shape: "bottle", price: 179, compareAt: 229, brand: "دار العود", sales: 198,
      colors: [["وردي", "#f472b6", 30], ["أبيض لؤلؤي", "#f5f5f4", 18]],
      titles: { seo: "عطر مسك الورد النسائي 75 مل - رائحة ناعمة وثبات طويل", marketing: "نعومة المسك ودفء الورد في زجاجة واحدة", emotional: "لأن أنوثتك تستحق عطراً يشبهها", short: "مسك الورد 75 مل", luxury: "Rose Musk — أناقة هادئة", ad: "مسك الورد بثبات عالٍ", social: "🌸 العطر اللي يخلي الكل يسألك وش حاطة", question: "وش أنعم عطر ممكن تهدينه لنفسك؟" },
      short: "عطر نسائي ناعم يجمع المسك الأبيض مع الورد الدمشقي.", desc: "مسك أبيض نقي مع قلب من الورد الدمشقي وقاعدة من الفانيلا.\n\n• الحجم: 75 مل\n• الثبات: 10-12 ساعة\n• مناسب للعمل والمناسبات", keywords: "عطر نسائي، مسك، عطر ورد، musk perfume" },
    { name: "ساعة كلاسيك ستانلس ستيل رجالية", cat: "ساعات", shape: "watch", price: 459, compareAt: 599, brand: "تايم لاين", featured: true, best: true, sales: 265,
      colors: [["فضي", "#c0c0c0", 15], ["ذهبي", "#c99a45", 10], ["أسود", "#111111", 8]],
      titles: { seo: "ساعة رجالية كلاسيك ستانلس ستيل مقاومة للماء 50 متر", marketing: "أناقة يومية تكمل إطلالتك في العمل والمناسبات", emotional: "لكل لحظة مهمة في يومك", short: "ساعة كلاسيك", luxury: "Classic Steel — حرفية خالدة", ad: "ساعة كلاسيك بضمان سنتين", social: "⌚ الساعة اللي تكمل الشماغ والثوب", question: "تبي ساعة تناسب الدوام والمناسبات؟" },
      short: "ساعة رجالية بتصميم كلاسيكي، زجاج سافاير مقاوم للخدش ومقاومة ماء 5 ATM.", desc: "• الهيكل: ستانلس ستيل 316L\n• الزجاج: سافاير مقاوم للخدش\n• مقاومة الماء: 50 متر\n• الحركة: كوارتز ياباني\n• قطر: 42 ملم\n• الضمان: سنتان", keywords: "ساعة رجالية، ساعة ستانلس، ساعات فخمة، men watch" },
    { name: "ساعة ذكية رياضية بشاشة AMOLED", cat: "ساعات", shape: "watch", price: 349, brand: "تايم لاين", sales: 140,
      colors: [["أسود", "#111111", 20], ["كحلي", "#1e2a4a", 14], ["وردي", "#f472b6", 9]],
      titles: { seo: "ساعة ذكية رياضية AMOLED تدعم العربية - قياس النبض والنوم", marketing: "تابع صحتك ونشاطك بلمحة على معصمك", emotional: "رفيقك اليومي نحو نسخة أفضل منك", short: "ساعة ذكية رياضية", luxury: "Smart Active — تقنية بلمسة أنيقة", ad: "ساعة ذكية تدعم العربي", social: "🏃‍♂️ خطواتك ونومك ونبضك في مكان واحد", question: "تبي ساعة تحفزك على المشي كل يوم؟" },
      short: "شاشة AMOLED، بطارية 10 أيام، أكثر من 100 وضع رياضي.", desc: "• شاشة AMOLED 1.43 إنش\n• بطارية حتى 10 أيام\n• قياس النبض والأكسجين وجودة النوم\n• إشعارات الجوال والمكالمات\n• تدعم اللغة العربية", keywords: "ساعة ذكية، smart watch، ساعة رياضية" },
    { name: "حقيبة يد جلد طبيعي نسائية", cat: "حقائب", shape: "bag", price: 399, compareAt: 520, brand: "لوكس", featured: true, sales: 176,
      colors: [["بيج", "#d6c3a5", 12], ["أسود", "#111111", 10], ["بني", "#7b4b2a", 7]],
      titles: { seo: "حقيبة يد نسائية جلد طبيعي بتصميم عصري وحزام قابل للفصل", marketing: "حقيبة واحدة تناسب الدوام والطلعات والمناسبات", emotional: "تفاصيل صغيرة تصنع إطلالة كبيرة", short: "حقيبة جلد نسائية", luxury: "Luxe Leather — أناقة لا تُقاوم", ad: "حقيبة جلد طبيعي 100%", social: "👜 الشنطة اللي تمشي مع كل لبس", question: "تدورين شنطة عملية وفخمة بنفس الوقت؟" },
      short: "جلد طبيعي 100% مع بطانة داخلية وجيوب منظمة.", desc: "• جلد بقري طبيعي\n• المقاس: 30×22×12 سم\n• حزام كتف قابل للفصل\n• 3 جيوب داخلية وسحاب آمن", keywords: "شنطة نسائية، حقيبة جلد، شنط فخمة" },
    { name: "حقيبة ظهر لابتوب مقاومة للماء", cat: "حقائب", shape: "bag", price: 189, brand: "لوكس", sales: 98,
      colors: [["رمادي", "#9ca3af", 22], ["أسود", "#111111", 30]],
      titles: { seo: "حقيبة ظهر لابتوب 15.6 إنش مقاومة للماء مع منفذ USB", marketing: "نظّم أغراضك واحمِ جهازك أينما ذهبت", emotional: "لكل يوم مليء بالإنجازات", short: "شنطة ظهر لابتوب", luxury: "Urban Pack — عملية بأناقة", ad: "شنطة لابتوب ضد الماء", social: "🎒 شنطة الدوام والجامعة والسفر", question: "جهازك يستاهل حماية أفضل؟" },
      short: "تتسع للابتوب حتى 15.6 إنش مع منفذ شحن USB.", desc: "• قماش مقاوم للماء\n• جيب مبطن للابتوب 15.6\"\n• منفذ USB خارجي\n• ظهر مريح بتهوية", keywords: "شنطة ظهر، حقيبة لابتوب، backpack" },
    { name: "سماعة رأس لاسلكية بعزل ضوضاء", cat: "الكترونيات", shape: "headphones", price: 299, compareAt: 449, brand: "ساوند برو", featured: true, best: true, sales: 330,
      colors: [["أسود", "#111111", 25], ["أبيض", "#f5f5f4", 15], ["كحلي", "#1e2a4a", 10]],
      titles: { seo: "سماعة رأس بلوتوث بعزل ضوضاء نشط ANC وبطارية 40 ساعة", marketing: "اعزل الضجيج واستمتع بصوت نقي طوال اليوم", emotional: "عالمك الخاص… بصوت أوضح", short: "سماعة ANC لاسلكية", luxury: "Sound Pro — هدوء فاخر", ad: "سماعة ANC بطارية 40 ساعة", social: "🎧 ودّع إزعاج المكتب والطيارة", question: "تبي هدوء تام وأنت تسمع أو تشتغل؟" },
      short: "عزل ضوضاء نشط، بطارية 40 ساعة، مايك واضح للمكالمات.", desc: "• عزل ضوضاء نشط ANC\n• بطارية حتى 40 ساعة\n• شحن سريع: 10 دقائق = 5 ساعات\n• بلوتوث 5.3\n• وسائد إسفنج ميموري مريحة", keywords: "سماعة بلوتوث، سماعة عزل، headphones ANC" },
    { name: "جوال ستاند وشاحن لاسلكي 3 في 1", cat: "الكترونيات", shape: "phone", price: 159, brand: "ساوند برو", sales: 87,
      colors: [["أسود", "#111111", 40], ["أبيض", "#f5f5f4", 25]],
      titles: { seo: "شاحن لاسلكي 3 في 1 للجوال والساعة والسماعة 15 واط", marketing: "اشحن أجهزتك الثلاثة من مكان واحد", emotional: "مكتب أنظف وأجهزة جاهزة دائماً", short: "شاحن 3 في 1", luxury: "Charge Hub — ترتيب ذكي", ad: "شاحن لاسلكي 3 في 1", social: "⚡ وداعاً لفوضى الأسلاك", question: "كم سلك على طاولتك الحين؟" },
      short: "يشحن الجوال والساعة والسماعة معاً بقوة 15 واط.", desc: "• شحن لاسلكي سريع 15W\n• متوافق مع أغلب الجوالات الحديثة\n• حماية من الحرارة والشحن الزائد", keywords: "شاحن لاسلكي، wireless charger" },
    { name: "تيشيرت قطن مصري بقصة مريحة", cat: "ازياء", shape: "shirt", price: 89, compareAt: 120, brand: "أوربن", best: true, sales: 520,
      colors: [["أبيض", "#ffffff", 50], ["أسود", "#111111", 45], ["زيتي", "#556b2f", 30], ["بيج", "#d6c3a5", 25]],
      titles: { seo: "تيشيرت رجالي قطن مصري 100% بقصة ريلاكس فيت", marketing: "قطن ناعم يدوم ويحافظ على شكله بعد كل غسلة", emotional: "راحتك تبدأ من أبسط التفاصيل", short: "تيشيرت قطن", luxury: "Essential Tee — بساطة راقية", ad: "تيشيرت قطن مصري 100%", social: "👕 القطعة الأساسية في كل دولاب", question: "تبي تيشيرت ما يتغير شكله بعد الغسيل؟" },
      short: "قطن مصري 100% بوزن 220 جرام، مريح للاستخدام اليومي.", desc: "• قطن مصري 100%\n• وزن القماش: 220 جرام\n• قصة مريحة\n• المقاسات: S - XXL", keywords: "تيشيرت قطن، ملابس رجالية، tshirt" },
    { name: "حذاء رياضي خفيف للمشي", cat: "ازياء", shape: "shoe", price: 249, compareAt: 329, brand: "أوربن", featured: true, sales: 154,
      colors: [["أبيض", "#f5f5f4", 20], ["أسود", "#111111", 18], ["رمادي", "#9ca3af", 12]],
      titles: { seo: "حذاء رياضي رجالي خفيف للمشي والجري بنعل مريح", marketing: "خفة في كل خطوة وراحة طوال اليوم", emotional: "كل مشوار يصير أسهل", short: "حذاء مشي خفيف", luxury: "Air Step — راحة بتصميم أنيق", ad: "حذاء مشي خفيف ومريح", social: "👟 جزمة المشي اللي ما تبي تشيلها", question: "رجولك تتعب من المشي الطويل؟" },
      short: "نعل فوم ماص للصدمات وقماش شبكي يسمح بالتهوية.", desc: "• وزن خفيف 280 جرام\n• نعل EVA ماص للصدمات\n• قماش شبكي مسامي", keywords: "حذاء رياضي، جزمة مشي، sneakers" },
    { name: "مزهرية سيراميك مطفية للديكور", cat: "المنزل", shape: "vase", price: 119, brand: "هوم آرت", sales: 64,
      colors: [["بيج", "#d6c3a5", 15], ["أبيض", "#f5f5f4", 15], ["زيتي", "#556b2f", 8]],
      titles: { seo: "مزهرية سيراميك مطفية بتصميم عصري لديكور المنزل", marketing: "قطعة بسيطة تغيّر إحساس المكان", emotional: "لمسة دافئة تحكي ذوقك", short: "مزهرية سيراميك", luxury: "Matte Vase — هدوء الألوان", ad: "مزهرية سيراميك عصرية", social: "🏺 القطعة اللي تكمل ركن القهوة", question: "ركن بيتك ناقصه لمسة؟" },
      short: "سيراميك مطفي يدوي الصنع بارتفاع 28 سم.", desc: "• سيراميك مطفي\n• الارتفاع: 28 سم\n• مناسبة للورد الطبيعي والمجفف", keywords: "مزهرية، ديكور منزل، vase" },
    { name: "مبخرة كهربائية حديثة بشحن USB", cat: "المنزل", shape: "vase", price: 139, compareAt: 179, brand: "هوم آرت", best: true, sales: 210,
      colors: [["أسود", "#111111", 30], ["ذهبي", "#c99a45", 20]],
      titles: { seo: "مبخرة كهربائية محمولة بشحن USB للعود والبخور", marketing: "بخّر بيتك وسيارتك بدون فحم ولا دخان مزعج", emotional: "ريحة البيت الحلوة… في أي مكان", short: "مبخرة كهربائية", luxury: "Bakhoor Pro — ضيافة عصرية", ad: "مبخرة كهربائية USB", social: "🔥 المبخرة اللي تحطها بالسيارة والمكتب", question: "تبي بخور بدون فحم وريحة دخان؟" },
      short: "تسخين سريع خلال 30 ثانية، بطارية تكفي أسبوع.", desc: "• شحن USB-C\n• تسخين خلال 30 ثانية\n• مناسبة للعود والبخور والمعمول\n• حجم مناسب للسيارة", keywords: "مبخرة كهربائية، مبخرة usb، بخور" },
  ];

  const created: { id: string; name: string; price: number; image: string; variantIds: string[] }[] = [];
  for (const [i, p] of products.entries()) {
    const slug = p.name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().replace(/\s+/g, "-");
    const variantImages: string[] = [];
    for (const [j, [, hex]] of p.colors.entries()) {
      variantImages.push(await productImage(`p${i}-v${j}.jpg`, p.shape, hex, hex === "#111111" ? "#c99a45" : "#111111", BGS[j % BGS.length]));
    }
    const extra = await productImage(`p${i}-x.jpg`, p.shape, p.colors[0][1], "#ffffff", BGS[(i + 2) % BGS.length]);
    const row = await prisma.product.create({
      data: {
        slug,
        name: p.name,
        titlesJson: JSON.stringify(p.titles),
        shortDescription: p.short,
        description: p.desc,
        imagesJson: JSON.stringify([...variantImages, extra]),
        price: p.price,
        compareAtPrice: p.compareAt,
        cost: Math.round(p.price * 0.45),
        sku: `SKU-${1000 + i}`,
        stock: p.colors.reduce((s, c) => s + c[2], 0),
        brand: p.brand,
        featured: p.featured ?? false,
        bestSeller: p.best ?? false,
        isNew: i % 3 === 0,
        salesCount: p.sales,
        seoTitle: p.titles.seo.slice(0, 60),
        seoDescription: `${p.short} توصيل 2-5 أيام لكل مدن المملكة، الدفع عند الاستلام وتقسيط تمارا وتابي.`,
        keywords: p.keywords,
        categoryId: categoryIds[p.cat],
        variants: { create: p.colors.map(([name, hex, stock], j) => ({ colorName: name, colorHex: hex, stock, sortOrder: j, imagesJson: JSON.stringify([variantImages[j]]) })) },
      },
      include: { variants: true },
    });
    created.push({ id: row.id, name: row.name, price: row.price, image: variantImages[0], variantIds: row.variants.map((v) => v.id) });
  }

  const heroData = [
    { title: "عطور فاخرة تليق بحضورك", subtitle: "خصم حتى 25%", link: "/category/عطور", from: "#1c1917", to: "#a8763e" },
    { title: "تقنية أذكى لحياة أسهل", subtitle: "وصل حديثاً", link: "/category/الكترونيات", from: "#0f172a", to: "#2563eb" },
    { title: "قسّمها على 4 دفعات بدون فوائد", subtitle: "مع تمارا وتابي", link: "/offers", from: "#14532d", to: "#468170" },
  ];
  for (const [i, h] of heroData.entries()) {
    await prisma.banner.create({ data: { position: "hero", title: h.title, subtitle: h.subtitle, link: h.link, image: await bannerImage(`hero-${i}.jpg`, h.from, h.to), sortOrder: i } });
  }
  const catBanners = [
    { title: "عالم الساعات", subtitle: "تشكيلة جديدة", link: "/category/ساعات", from: "#0f172a", to: "#475569" },
    { title: "حقائب لكل مناسبة", subtitle: "جلد طبيعي", link: "/category/حقائب", from: "#7c2d12", to: "#d97706" },
  ];
  for (const [i, b] of catBanners.entries()) {
    await prisma.banner.create({ data: { position: "category", title: b.title, subtitle: b.subtitle, link: b.link, buttonText: "اكتشف الآن", image: await bannerImage(`catb-${i}.jpg`, b.from, b.to, 1200, 750), sortOrder: i } });
  }
  await prisma.banner.create({ data: { position: "promo", title: "شحن مجاني فوق 299 ريال", subtitle: "لجميع مدن المملكة", link: "/offers", buttonText: "تسوق العروض", image: await bannerImage("promo-0.jpg", "#7f1d1d", "#f43f5e", 1920, 640) } });

  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "percent", value: 10, minOrder: 100 },
      { code: "SAVE50", type: "fixed", value: 50, minOrder: 400 },
      { code: "FREESHIP", type: "free_shipping", value: 0, minOrder: 0 },
    ],
  });

  const reviewers = [["أبو فهد", "الرياض"], ["نورة", "جدة"], ["سارة", "الدمام"], ["محمد", "مكة المكرمة"], ["ريم", "الخبر"], ["عبدالله", "أبها"]];
  const comments = ["المنتج ممتاز وجودته أعلى من توقعي، والتوصيل وصل خلال 3 أيام 👌", "تغليف فخم وخدمة عملاء سريعة على الواتساب", "جربت الدفع بتمارا وكان سهل جداً، أنصح فيه", "ثاني طلب لي من المتجر وما راح يكون الأخير", "السعر مناسب مقارنة بالجودة، شكراً لكم"];
  for (const [i, p] of created.entries()) {
    const n = 2 + (i % 3);
    const ratings: number[] = [];
    for (let k = 0; k < n; k++) {
      const [name, city] = reviewers[(i + k) % reviewers.length];
      const rating = k === 2 ? 4 : 5;
      ratings.push(rating);
      await prisma.review.create({ data: { productId: p.id, name, city, rating, comment: comments[(i + k) % comments.length], approved: true, verified: true } });
    }
    await prisma.product.update({ where: { id: p.id }, data: { ratingAvg: ratings.reduce((a, b) => a + b, 0) / ratings.length, ratingCount: ratings.length } });
  }

  const people = [["فهد العتيبي", "الرياض"], ["نوف القحطاني", "جدة"], ["خالد الشهري", "أبها"], ["منيرة الدوسري", "الدمام"], ["سلطان الحربي", "المدينة المنورة"], ["هيا الزهراني", "الطائف"]];
  const methods = ["moyasar", "tamara", "tabby", "cod"];
  const statuses = ["delivered", "shipped", "confirmed", "processing", "delivered", "confirmed"];
  for (let i = 0; i < 18; i++) {
    const [name, city] = people[i % people.length];
    const phone = `9665${String(10000000 + i * 7919).slice(0, 8)}`;
    const customer = await prisma.customer.upsert({ where: { phone }, create: { name, phone, city }, update: {} });
    const p = created[(i * 5) % created.length];
    const qty = 1 + (i % 2);
    const subtotal = p.price * qty;
    const shippingCost = subtotal >= 299 ? 0 : 25;
    const method = methods[i % methods.length];
    const codFee = method === "cod" ? 15 : 0;
    const total = subtotal + shippingCost + codFee;
    const createdAt = new Date(Date.now() - (i * 19 + 2) * 3600000);
    const status = statuses[i % statuses.length];
    await prisma.order.create({
      data: {
        number: 10001 + i,
        customerId: customer.id,
        status,
        paymentMethod: method,
        paymentStatus: method === "cod" && status !== "delivered" ? "unpaid" : "paid",
        shippingCompany: i % 2 ? "aramex" : "smsa",
        trackingNumber: ["shipped", "delivered"].includes(status) ? `TEST-${i % 2 ? "ARX" : "SMSA"}-${70000000 + i}` : "",
        subtotal, shippingCost, codFee, total, vat: Math.round((total * 15) / 115 * 100) / 100,
        name, phone, city, district: "حي النخيل", address: "شارع الأمير سلطان، مبنى 12",
        createdAt,
        history: JSON.stringify([{ at: createdAt.toISOString(), status: "confirmed", note: "تم إنشاء الطلب" }]),
        items: { create: [{ productId: p.id, variantId: p.variantIds[0], name: p.name, image: p.image, price: p.price, quantity: qty }] },
      },
    });
  }

  console.log(`✓ تم إنشاء ${cats.length} تصنيفات و ${created.length} منتجاً مع البنرات والكوبونات والطلبات التجريبية`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
