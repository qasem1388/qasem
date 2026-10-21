import { z } from "zod";
import { iconNames } from "@/components/ui/icon";

/** Bilingual text; `max` caps each language. Arabic is required unless `optional`. */
export const localized = (max = 300, opts: { optional?: boolean } = {}) =>
  z.object({
    ar: opts.optional ? z.string().trim().max(max) : z.string().trim().min(1, "النص العربي مطلوب.").max(max),
    en: z.string().trim().max(max),
  });

export const hexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "لون غير صالح.");

/** Image source: uploaded/local path or an https URL. */
export const imageSrc = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^\/(?!\/)[\w\-./%]*$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v), "مسار الصورة غير صالح.");

/** Link target: internal path, in-page anchor, https URL, mailto: or tel:. */
export const href = z
  .string()
  .trim()
  .min(1, "الرابط مطلوب.")
  .max(500)
  .refine(
    (v) =>
      /^\/(?!\/)[^\s"'<>]*$/.test(v) ||
      /^#[\w-]+$/.test(v) ||
      /^https?:\/\/[^\s"'<>]+$/.test(v) ||
      /^(mailto|tel):[^\s"'<>]+$/.test(v),
    "رابط غير صالح.",
  );

export const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https:\/\/[^\s"'<>]+$/.test(v), "يجب أن يبدأ الرابط بـ https://");

export const iconName = z.enum(iconNames as [string, ...string[]]);

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "الرابط قصير جدًا.")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.");

/** Formats zod issues as { "path.to.field": message } for forms. */
export function issuesToErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const key = i.path.join(".");
    out[key] ??=
      i.message.startsWith("Invalid") || i.message.startsWith("Too") || i.message.startsWith("Expected")
        ? "قيمة غير صالحة."
        : i.message;
  }
  return out;
}
