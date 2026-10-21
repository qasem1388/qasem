import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

/** Returns minutes to wait when login attempts for this email or IP exceed the limit, else 0. */
export async function loginBlockedFor(email: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.findMany({
      where: { email, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.loginAttempt.findMany({
      where: { ip, success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  const over = [
    byEmail.length >= MAX_PER_EMAIL ? byEmail[byEmail.length - MAX_PER_EMAIL] : null,
    byIp.length >= MAX_PER_IP ? byIp[byIp.length - MAX_PER_IP] : null,
  ]
    .filter(Boolean)
    .map((a) => a!.createdAt.getTime() + WINDOW_MS - Date.now());
  return over.length ? Math.max(1, Math.ceil(Math.max(...over) / 60000)) : 0;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await db.loginAttempt.create({ data: { email, ip, success } });
  if (success) await db.loginAttempt.deleteMany({ where: { email, success: false } });
  // Keep the table small.
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * WINDOW_MS) } } });
}
