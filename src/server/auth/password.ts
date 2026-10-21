import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with OWASP-recommended minimum parameters
 * (19 MiB memory, 2 iterations, 1 degree of parallelism).
 * No "server-only" import so CLI scripts can reuse it.
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash of a random string, used to keep timing constant when the user doesn't exist. */
let dummyHash: Promise<string> | undefined;
export function dummyVerify(password: string) {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  return dummyHash.then((h) => verifyPassword(h, password));
}

const COMMON = ["password", "123456", "qwerty", "admin", "letmein", "welcome", "riyada"];

/** Returns an Arabic error message, or null when the password is acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < 12) return "يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل.";
  if (password.length > 128) return "كلمة المرور طويلة جدًا (الحد الأقصى 128 حرفًا).";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "يجب أن تحتوي كلمة المرور على حروف وأرقام.";
  const lower = password.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) return "كلمة المرور سهلة التخمين، اختر كلمة أقوى.";
  if (email && lower.includes(email.split("@")[0].toLowerCase())) return "لا تستخدم بريدك الإلكتروني ضمن كلمة المرور.";
  return null;
}
