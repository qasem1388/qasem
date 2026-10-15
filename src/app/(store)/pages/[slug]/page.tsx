import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

type Page = { title: string; body: (s: Awaited<ReturnType<typeof getSettings>>) => string };

const PAGES: Record<string, Page> = {
  about: { title: "من نحن", body: (s) => `${s.storeName} متجر إلكتروني سعودي يقدّم منتجات أصلية مختارة بعناية بأسعار منافسة.\n\nنؤمن بأن تجربة التسوق يجب أن تكون سهلة وآمنة: دفع آمن عبر ميسر، تقسيط مع تمارا وتابي، دفع عند الاستلام، وتوصيل سريع خلال 2-5 أيام عمل لجميع مدن المملكة.` },
  shipping: { title: "الشحن والتوصيل", body: (s) => `• نوصل لجميع مدن ومناطق المملكة العربية السعودية خلال 2 إلى 5 أيام عمل.\n• شركاء الشحن: سمسا إكسبرس (${s.smsaPrice} ر.س) وأرامكس (${s.aramexPrice} ر.س).\n• الشحن مجاني للطلبات التي تتجاوز ${s.freeShippingThreshold} ر.س.\n• يصلك رقم التتبع برسالة فور شحن الطلب، ويمكنك تتبعه من صفحة "تتبع طلبك".\n• أيام العمل من الأحد إلى الخميس.` },
  returns: { title: "سياسة الاستبدال والاسترجاع", body: () => `• يحق لك استرجاع أو استبدال المنتج خلال 7 أيام من تاريخ الاستلام.\n• يجب أن يكون المنتج بحالته الأصلية وغير مستخدم ومع التغليف الأصلي.\n• في حال وجود عيب مصنعي أو خطأ في الطلب نتحمل كامل تكاليف الشحن.\n• يُعاد المبلغ لنفس وسيلة الدفع خلال 3-14 يوم عمل حسب البنك أو مزود التقسيط.\n• للطلب تواصل معنا عبر واتساب مع رقم الطلب.` },
  privacy: { title: "سياسة الخصوصية", body: (s) => `نحترم خصوصيتك ونلتزم بحماية بياناتك وفق نظام حماية البيانات الشخصية في المملكة.\n\n• نجمع فقط البيانات اللازمة لتنفيذ طلبك (الاسم، الجوال، العنوان، البريد).\n• لا نخزّن بيانات بطاقتك؛ تتم معالجة الدفع عبر بوابات مرخّصة (ميسر، تمارا، تابي).\n• نشارك بيانات التوصيل مع شركة الشحن فقط لغرض توصيل الطلب.\n• للاستفسار: ${s.email}` },
  terms: { title: "الشروط والأحكام", body: (s) => `باستخدامك متجر ${s.storeName} فإنك توافق على الشروط التالية:\n\n• جميع الأسعار بالريال السعودي وشاملة ضريبة القيمة المضافة.\n• يحق للمتجر إلغاء الطلب في حال عدم توفر المنتج مع إعادة المبلغ كاملاً.\n• تخضع خدمات التقسيط لشروط تمارا وتابي.\n• الرقم الضريبي: ${s.vatNumber} — السجل التجاري: ${s.crNumber}` },
  contact: { title: "تواصل معنا", body: (s) => `يسعدنا تواصلك معنا في أي وقت:\n\n• واتساب: +${s.whatsapp}\n• الهاتف: ${s.phone}\n• البريد: ${s.email}\n\nأوقات العمل: الأحد - الخميس، 9 صباحاً - 10 مساءً.` },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = PAGES[(await params).slug];
  return page ? { title: page.title, alternates: { canonical: `/pages/${(await params).slug}` } } : {};
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  const s = await getSettings();
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-black">{page.title}</h1>
      <div className="prose-ar card p-8 text-base">{page.body(s)}</div>
      {slug === "contact" && (
        <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener" className="btn mt-6 bg-[#25d366] text-white">راسلنا على واتساب</a>
      )}
    </div>
  );
}
