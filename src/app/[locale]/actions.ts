"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { storePrivateFile } from "@/server/files";
import { notifySubmission } from "@/server/notify";
import { rateLimit } from "@/server/rate-limit";
import { requestInfo } from "@/server/request";
import { isLocale, type Locale } from "@/i18n/config";
import { ATTACHMENT_RULES, CV_RULES, validateUpload } from "@/lib/uploads";
import { applicationSchema, contactSchema, formValues, quoteSchema, toFieldErrors, type FormState } from "@/lib/validation";

async function clientIp() {
  return (await requestInfo()).ip;
}

async function clientKey(scope: string) {
  return `${scope}:${await clientIp()}`;
}

/** Reference numbers are random; retry on the (unlikely) collision. */
async function uniqueReference(prefix: string, exists: (ref: string) => Promise<unknown>) {
  for (let i = 0; i < 5; i++) {
    const ref = referenceNumber(prefix);
    if (!(await exists(ref))) return ref;
  }
  throw new Error("Could not allocate a reference number");
}

/** Language of the page the form was sent from (used for the confirmation email). */
function localeOf(formData: FormData): Locale {
  const v = String(formData.get("locale") ?? "");
  return isLocale(v) ? v : "ar";
}

/** Bots fill hidden fields; real users never see the honeypot. */
function isSpam(formData: FormData) {
  return String(formData.get("website") ?? "").length > 0;
}

function referenceNumber(prefix = "RQ") {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: "success", reference: referenceNumber("CM") };
  if (!(await rateLimit(await clientKey("contact"), 5, 10 * 60_000))) {
    return { status: "error", fieldErrors: {}, code: "rate_limited", values: formValues(formData) };
  }
  const parsed = contactSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), code: "invalid", values: formValues(formData) };
  }

  const locale = localeOf(formData);
  const reference = await uniqueReference("CM", (r) =>
    db.contactMessage.findUnique({ where: { reference: r }, select: { id: true } }),
  );
  const msg = await db.contactMessage.create({ data: { ...parsed.data, reference, locale, ip: await clientIp() } });
  notifySubmission({
    kind: "contact",
    id: msg.id,
    reference,
    locale,
    name: msg.name,
    email: msg.email,
    fields: [
      ["الاسم", msg.name],
      ["الجوال", msg.phone],
      ["البريد", msg.email],
      ["الرسالة", msg.message],
    ],
  });
  return { status: "success", reference };
}

export async function submitQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: "success", reference: referenceNumber() };
  if (!(await rateLimit(await clientKey("quote"), 5, 10 * 60_000))) {
    return { status: "error", fieldErrors: {}, code: "rate_limited", values: formValues(formData) };
  }
  const parsed = quoteSchema.safeParse(formValues(formData));
  const attachment = await validateUpload(formData.get("attachment"), ATTACHMENT_RULES);
  if (!parsed.success || attachment === "invalid") {
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (attachment === "invalid") fieldErrors.attachment = "file";
    return { status: "error", fieldErrors, code: "invalid", values: formValues(formData) };
  }

  const service = await db.service.findFirst({
    where: { slug: parsed.data.service, published: true },
    select: { slug: true, title: true },
  });
  if (!service) return { status: "error", fieldErrors: { service: "service" }, code: "invalid", values: formValues(formData) };

  const locale = localeOf(formData);
  const file = attachment ? await storePrivateFile(attachment, "attachments") : null;
  const reference = await uniqueReference("RQ", (r) =>
    db.quoteRequest.findUnique({ where: { reference: r }, select: { id: true } }),
  );
  const { name, company, phone, email, details } = parsed.data;
  const quote = await db.quoteRequest.create({
    data: {
      name,
      company: company || null,
      phone,
      email,
      details,
      serviceSlug: service.slug,
      reference,
      locale,
      attachmentId: file?.id,
      ip: await clientIp(),
    },
  });
  notifySubmission({
    kind: "quote",
    id: quote.id,
    reference,
    locale,
    name: quote.name,
    email: quote.email,
    fields: [
      ["الاسم", quote.name],
      ["الجهة", quote.company ?? ""],
      ["الجوال", quote.phone],
      ["البريد", quote.email],
      ["الخدمة", (service.title as { ar: string }).ar],
      ["الاحتياج", quote.details],
      ["مرفق", file ? file.originalName : ""],
    ],
  });
  return { status: "success", reference };
}

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: "success", reference: referenceNumber("JA") };
  if (!(await rateLimit(await clientKey("apply"), 3, 10 * 60_000))) {
    return { status: "error", fieldErrors: {}, code: "rate_limited", values: formValues(formData) };
  }
  const parsed = applicationSchema.safeParse(formValues(formData));
  const cv = await validateUpload(formData.get("cv"), CV_RULES);
  if (!parsed.success || cv === null || cv === "invalid") {
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (cv === null) fieldErrors.cv = "fileRequired";
    if (cv === "invalid") fieldErrors.cv = "file";
    return { status: "error", fieldErrors, code: "invalid", values: formValues(formData) };
  }

  const { job: jobSlug, ...data } = parsed.data;
  const job = jobSlug ? await db.job.findFirst({ where: { slug: jobSlug, open: true }, select: { id: true } }) : null;
  const file = await storePrivateFile(cv, "cv");
  const reference = await uniqueReference("JA", (r) =>
    db.jobApplication.findUnique({ where: { reference: r }, select: { id: true } }),
  );
  const application = await db.jobApplication.create({
    data: {
      reference,
      jobId: job?.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      city: data.city || null,
      experience: data.experience || null,
      linkedin: data.linkedin || null,
      coverLetter: data.coverLetter || null,
      cvId: file.id,
      locale: localeOf(formData),
      ip: await clientIp(),
    },
    include: { job: { select: { title: true } } },
  });
  notifySubmission({
    kind: "application",
    id: application.id,
    reference,
    locale: localeOf(formData),
    name: application.name,
    email: application.email,
    fields: [
      ["الوظيفة", application.job ? (application.job.title as { ar: string }).ar : "طلب عام"],
      ["الاسم", application.name],
      ["الجوال", application.phone],
      ["البريد", application.email],
      ["المدينة", application.city ?? ""],
      ["سنوات الخبرة", application.experience ?? ""],
    ],
  });
  return { status: "success", reference };
}
