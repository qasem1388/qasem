"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/admin/fields";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { dummyVerify, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getSession } from "@/server/auth/session";
import { loginBlockedFor, recordLoginAttempt } from "@/server/auth/throttle";
import { requestInfo } from "@/server/request";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(256),
  next: z.string().optional(),
});

/** Only same-site admin paths are accepted as post-login destinations. */
function safeNext(next?: string) {
  return next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
}

const GENERIC_ERROR = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };
  const { email, password, next } = parsed.data;
  const { ip } = await requestInfo();

  const wait = await loginBlockedFor(email, ip);
  if (wait) {
    await audit("auth.login_blocked", { details: { email } });
    return { ok: false, message: `تم إيقاف المحاولات مؤقتًا بسبب كثرة المحاولات الفاشلة. حاول بعد ${wait} دقيقة.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : await dummyVerify(password);

  if (!user || !valid || !user.active) {
    await recordLoginAttempt(email, ip, false);
    await audit("auth.login_failed", { userId: user?.id, details: { email } });
    return { ok: false, message: user && valid && !user.active ? "هذا الحساب موقوف. تواصل مع مدير النظام." : GENERIC_ERROR };
  }

  await recordLoginAttempt(email, ip, true);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit("auth.login", { userId: user.id });
  redirect(safeNext(next));
}

export async function logout() {
  const session = await getSession();
  await destroySession();
  if (session) await audit("auth.logout", { userId: session.user.id });
  redirect("/admin/login");
}
