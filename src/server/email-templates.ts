import "server-only";
import type { Locale } from "@/i18n/config";
import type { NotifyKind } from "@/content/defaults/notifications";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

type Brand = { name: string; primary: string; secondary: string };

/** Minimal, email-client-safe HTML shell (inline styles, table layout). */
function layout(brand: Brand, dir: "rtl" | "ltr", title: string, body: string) {
  const align = dir === "rtl" ? "right" : "left";
  return `<!doctype html><html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f5f7fa;font-family:Tahoma,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden" dir="${dir}">
<tr><td style="background:${brand.primary};padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold;text-align:${align}">${esc(brand.name)}</td></tr>
<tr><td style="height:4px;background:${brand.secondary}"></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.8;text-align:${align}">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

const kindTitle: Record<NotifyKind, { ar: string; en: string }> = {
  contact: { ar: "رسالة تواصل جديدة", en: "New contact message" },
  quote: { ar: "طلب عرض سعر جديد", en: "New quote request" },
  application: { ar: "طلب توظيف جديد", en: "New job application" },
};

/** Internal alert for the team (always Arabic, includes a link to the admin panel). */
export function teamAlert(brand: Brand, kind: NotifyKind, reference: string, fields: [string, string][], adminUrl: string) {
  const title = `${kindTitle[kind].ar} — ${reference}`;
  const rows = fields
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#64748b;width:140px;vertical-align:top">${esc(k)}</td><td style="padding:8px 0;white-space:pre-line">${esc(v)}</td></tr>`,
    )
    .join("");
  const html = layout(
    brand,
    "rtl",
    title,
    `<h1 style="margin:0 0 16px;font-size:20px;color:${brand.primary}">${esc(title)}</h1>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0">${rows}</table>
<p style="margin:24px 0 0"><a href="${esc(adminUrl)}" style="display:inline-block;background:${brand.primary};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px">عرض في لوحة التحكم</a></p>`,
  );
  const text = `${title}\n\n${fields
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n\n${adminUrl}`;
  return { subject: title, html, text };
}

const reply = {
  contact: {
    ar: { subject: "استلمنا رسالتك", body: "شكرًا لتواصلك معنا. استلمنا رسالتك وسيرد عليك فريقنا في أقرب وقت خلال ساعات العمل." },
    en: {
      subject: "We received your message",
      body: "Thank you for contacting us. We have received your message and our team will reply shortly during business hours.",
    },
  },
  quote: {
    ar: { subject: "استلمنا طلب عرض السعر", body: "شكرًا لاهتمامك. استلمنا طلبك وسيتواصل معك أحد مستشارينا خلال يوم عمل واحد." },
    en: {
      subject: "We received your quote request",
      body: "Thank you for your interest. We have received your request and one of our consultants will contact you within one business day.",
    },
  },
  application: {
    ar: {
      subject: "استلمنا طلب التوظيف",
      body: "شكرًا لاهتمامك بالانضمام إلى فريقنا. استلمنا طلبك وسنتواصل معك في حال توافق ملفك مع متطلبات الوظيفة.",
    },
    en: {
      subject: "We received your application",
      body: "Thank you for your interest in joining our team. We have received your application and will contact you if your profile matches the role.",
    },
  },
};

/** Confirmation sent to the person who submitted, in their language. */
export function autoReply(
  brand: Brand,
  kind: NotifyKind,
  locale: Locale,
  reference: string,
  name: string,
  contact: { phone: string; email: string },
) {
  const t = reply[kind][locale];
  const ar = locale === "ar";
  const greeting = ar ? `مرحبًا ${esc(name)}،` : `Hello ${esc(name)},`;
  const refLabel = ar ? "الرقم المرجعي" : "Reference number";
  const help = ar ? "للاستفسار تواصل معنا على" : "For any enquiry contact us at";
  const html = layout(
    brand,
    ar ? "rtl" : "ltr",
    t.subject,
    `<p style="margin:0 0 12px">${greeting}</p><p style="margin:0 0 16px">${esc(t.body)}</p>
<p style="margin:0 0 16px;padding:12px 16px;background:#f5f7fa;border-radius:8px">${refLabel}: <strong dir="ltr" style="font-family:monospace">${esc(reference)}</strong></p>
<p style="margin:0;color:#64748b;font-size:13px">${help} <span dir="ltr">${esc(contact.phone)}</span> — <a href="mailto:${esc(contact.email)}" style="color:${brand.primary}">${esc(contact.email)}</a></p>`,
  );
  const text = `${ar ? `مرحبًا ${name}،` : `Hello ${name},`}\n\n${t.body}\n\n${refLabel}: ${reference}\n\n${help} ${contact.phone} — ${contact.email}`;
  return { subject: `${t.subject} — ${reference}`, html, text };
}

export function testEmail(brand: Brand) {
  const subject = "رسالة اختبار من لوحة التحكم";
  return {
    subject,
    html: layout(
      brand,
      "rtl",
      subject,
      `<p style="margin:0">إعدادات البريد تعمل بشكل صحيح. ستصلك إشعارات النماذج على هذا العنوان.</p>`,
    ),
    text: "إعدادات البريد تعمل بشكل صحيح.",
  };
}
