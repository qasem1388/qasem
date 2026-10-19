import { z } from "zod";

/**
 * Client-side validation mirroring `src-tauri/src/domain`. Messages are error
 * codes, translated through `validation.<code>`. The backend re-validates
 * everything; these rules exist for instant feedback.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalPattern = (re: RegExp, code: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || re.test(v), code);

export const isValidVatNumber = (v: string) => /^3\d{13}3$/.test(v);
export const isValidPhone = (v: string) => {
  const compact = v.replace(/[\s-]/g, "");
  const national = compact.replace(/^(\+966|00966)/, "0");
  return /^0[1-9]\d{8}$/.test(national);
};

export const companySchema = z.object({
  nameAr: z.string().trim().min(1, "required").max(150, "too_long"),
  nameEn: optionalText(150),
  vatNumber: optionalPattern(/^3\d{13}3$/, "invalid_vat_number"),
  crNumber: optionalPattern(/^\d{10}$/, "invalid_cr_number"),
  phone: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || isValidPhone(v), "invalid_phone"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(v), "invalid_email"),
  city: z.string().trim().min(1, "required").max(80, "too_long"),
  district: optionalText(80),
  street: optionalText(120),
  buildingNumber: optionalPattern(/^\d{4}$/, "invalid_building_number"),
  postalCode: optionalPattern(/^\d{5}$/, "invalid_postal_code"),
  fiscalYearStartMonth: z.number().int().min(1, "invalid_month").max(12, "invalid_month"),
  calendarDisplay: z.enum(["gregorian", "hijri", "both"]),
});

export const PASSWORD_MIN = 10;

export const adminSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "required")
      .regex(/^[A-Za-z][A-Za-z0-9._-]{2,31}$/, "invalid_username"),
    fullName: z.string().trim().min(1, "required").max(100, "too_long"),
    password: z.string(),
    passwordConfirm: z.string(),
  })
  .superRefine((v, ctx) => {
    const code = passwordProblem(v.password, v.username.trim());
    if (code) ctx.addIssue({ code: "custom", path: ["password"], message: code });
    if (v.password !== v.passwordConfirm)
      ctx.addIssue({ code: "custom", path: ["passwordConfirm"], message: "password_mismatch" });
  });

/** Same policy as `domain::user::validate_password`. */
export function passwordProblem(password: string, username: string): string | null {
  const len = [...password].length;
  if (len === 0) return "required";
  if (len < PASSWORD_MIN) return "password_too_short";
  if (len > 128) return "too_long";
  if (!/\p{L}/u.test(password) || !/[0-9]/.test(password)) return "password_weak";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "password_contains_username";
  return null;
}

/** 0–4 indicator for the strength meter (UX only; policy is `passwordProblem`). */
export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if ([...password].length >= PASSWORD_MIN) score++;
  if ([...password].length >= 14) score++;
  if (/\p{L}/u.test(password) && /[0-9]/.test(password)) score++;
  if (/[^\p{L}0-9]/u.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score++;
  return Math.min(score, 4);
}

/** Flattens a zod error into `{ field: code }` (first error per field). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}
