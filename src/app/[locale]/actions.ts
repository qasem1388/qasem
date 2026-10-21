"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { ATTACHMENT_RULES, CV_RULES, validateUpload } from "@/lib/uploads";
import { applicationSchema, contactSchema, formValues, quoteSchema, toFieldErrors, type FormState } from "@/lib/validation";

async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
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
  if (isSpam(formData)) return { status: "success" };
  if (!rateLimit(await clientKey("contact"), 5, 10 * 60_000)) {
    return { status: "error", fieldErrors: {}, code: "rate_limited", values: formValues(formData) };
  }
  const parsed = contactSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), code: "invalid", values: formValues(formData) };
  }

  // Phase 6: persist the message, notify by email and list it in /admin.
  return { status: "success" };
}

export async function submitQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: "success", reference: referenceNumber() };
  if (!rateLimit(await clientKey("quote"), 5, 10 * 60_000)) {
    return { status: "error", fieldErrors: {}, code: "rate_limited", values: formValues(formData) };
  }
  const parsed = quoteSchema.safeParse(formValues(formData));
  const attachment = await validateUpload(formData.get("attachment"), ATTACHMENT_RULES);
  if (!parsed.success || attachment === "invalid") {
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (attachment === "invalid") fieldErrors.attachment = "file";
    return { status: "error", fieldErrors, code: "invalid", values: formValues(formData) };
  }

  // Phase 6: store the request with this reference and its follow-up status.
  return { status: "success", reference: referenceNumber() };
}

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  if (isSpam(formData)) return { status: "success", reference: referenceNumber("JA") };
  if (!rateLimit(await clientKey("apply"), 3, 10 * 60_000)) {
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

  // Phase 6: store the CV privately and list the application in /admin.
  return { status: "success", reference: referenceNumber("JA") };
}
