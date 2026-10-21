"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/admin/fields";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { getSession, requireUser } from "@/server/auth/session";

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(user.passwordHash, current))) {
    return { ok: false, message: "يرجى مراجعة الحقول.", errors: { current: "كلمة المرور الحالية غير صحيحة." } };
  }
  const weak = passwordProblem(next, user.email);
  if (weak) return { ok: false, message: "يرجى مراجعة الحقول.", errors: { password: weak } };
  if (next !== confirm) return { ok: false, message: "يرجى مراجعة الحقول.", errors: { confirm: "كلمتا المرور غير متطابقتين." } };
  if (next === current)
    return { ok: false, message: "يرجى مراجعة الحقول.", errors: { password: "اختر كلمة مرور مختلفة عن الحالية." } };

  const session = await getSession();
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  // Sign out every other device; keep the current session.
  await db.session.deleteMany({ where: { userId: me.id, NOT: { id: session?.id } } });
  await audit("auth.password_changed", { userId: me.id });
  revalidatePath("/admin/account");
  return { ok: true, message: "تم تغيير كلمة المرور وإنهاء الجلسات على الأجهزة الأخرى." };
}

export async function revokeOtherSessions(): Promise<void> {
  const me = await requireUser();
  const session = await getSession();
  const { count } = await db.session.deleteMany({ where: { userId: me.id, NOT: { id: session?.id } } });
  await audit("auth.sessions_revoked", { userId: me.id, details: { count } });
  revalidatePath("/admin/account");
}
