import { z } from "zod";

/** Saudi mobile (05xxxxxxxx / +9665xxxxxxxx) or a generic international number. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(?:\+?9665\d{8}|05\d{8}|\+?\d{8,15})$/, "phone"));

const name = z.string().trim().min(2, "name").max(120, "name");
const email = z.string().trim().toLowerCase().email("email").max(160, "email");

export const contactSchema = z.object({
  name,
  phone,
  email,
  message: z.string().trim().min(10, "message").max(3000, "message"),
});

export const quoteSchema = z.object({
  name,
  company: z.string().trim().max(160).optional().default(""),
  phone,
  email,
  service: z.string().trim().min(1, "service").max(80, "service"),
  details: z.string().trim().min(10, "message").max(5000, "message"),
});

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "url")
  .optional()
  .default("");

export const applicationSchema = z.object({
  job: z.string().trim().max(80).optional().default(""),
  name,
  phone,
  email,
  city: z.string().trim().max(80).optional().default(""),
  experience: z.string().trim().max(20).optional().default(""),
  linkedin: optionalUrl,
  coverLetter: z.string().trim().max(3000).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

export type FieldErrorCode = "name" | "phone" | "email" | "message" | "service" | "file" | "fileRequired" | "url";

export type FormState =
  | { status: "idle" }
  | { status: "success"; reference?: string }
  | {
      status: "error";
      fieldErrors: Partial<Record<string, FieldErrorCode>>;
      code?: "rate_limited" | "invalid";
      /** Submitted values echoed back so the form keeps user input after a failed submit. */
      values?: Record<string, string>;
    };

const knownCodes = new Set<string>(["name", "phone", "email", "message", "service", "file", "fileRequired", "url"]);
const fieldDefaults: Record<string, FieldErrorCode> = {
  name: "name",
  phone: "phone",
  email: "email",
  service: "service",
  linkedin: "url",
};

/** Maps Zod issues to UI error codes; missing/mistyped fields fall back to a per-field code. */
export function toFieldErrors(error: z.ZodError) {
  const out: Partial<Record<string, FieldErrorCode>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (out[key]) continue;
    out[key] = knownCodes.has(issue.message) ? (issue.message as FieldErrorCode) : (fieldDefaults[key] ?? "message");
  }
  return out;
}

/** Text values of a submission (files and the honeypot are excluded). */
export function formValues(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData) {
    if (typeof v === "string" && k !== "website" && !k.startsWith("$")) out[k] = v.slice(0, 5000);
  }
  return out;
}
