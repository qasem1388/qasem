"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/admin/fields";
import { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { hashPassword, passwordProblem } from "@/server/auth/password";
import { requireUser } from "@/server/auth/session";

const roles = z.enum([Role.ADMIN, Role.EDITOR, Role.VIEWER]);
const base = {
  name: z.string().trim().min(2, "الاسم قصير جدًا.").max(100),
  role: roles,
};

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message]));
}

/** True when the change would leave the system without any active administrator. */
async function wouldRemoveLastAdmin(userId: string) {
  const admins = await db.user.count({ where: { role: "ADMIN", active: true, NOT: { id: userId } } });
  return admins === 0;
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser("users.manage");
  const parsed = z
    .object({ ...base, email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صحيح.").max(160), password: z.string() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "يرجى مراجعة الحقول.", errors: fieldErrors(parsed.error) };
  const { name, email, role, password } = parsed.data;

  const weak = passwordProblem(password, email);
  if (weak) return { ok: false, message: "يرجى مراجعة الحقول.", errors: { password: weak } };
  if (await db.user.findUnique({ where: { email } })) {
    return { ok: false, message: "يرجى مراجعة الحقول.", errors: { email: "يوجد مستخدم بهذا البريد مسبقًا." } };
  }

  const user = await db.user.create({ data: { name, email, role, passwordHash: await hashPassword(password) } });
  await audit("user.created", { userId: me.id, entity: "user", entityId: user.id, details: { email, role } });
  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function updateUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser("users.manage");
  const parsed = z.object(base).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "يرجى مراجعة الحقول.", errors: fieldErrors(parsed.error) };
  const active = formData.get("active") === "on";
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "المستخدم غير موجود." };

  if (userId === me.id && (parsed.data.role !== target.role || !active)) {
    return { ok: false, message: "لا يمكنك تغيير دورك أو إيقاف حسابك بنفسك." };
  }
  if (target.role === "ADMIN" && (parsed.data.role !== "ADMIN" || !active) && (await wouldRemoveLastAdmin(userId))) {
    return { ok: false, message: "يجب أن يبقى مدير رئيسي نشط واحد على الأقل." };
  }

  await db.user.update({ where: { id: userId }, data: { ...parsed.data, active } });
  if (!active) await db.session.deleteMany({ where: { userId } });
  await audit("user.updated", {
    userId: me.id,
    entity: "user",
    entityId: userId,
    details: { from: { role: target.role, active: target.active }, to: { role: parsed.data.role, active } },
  });
  revalidatePath("/admin/users");
  return { ok: true, message: "تم حفظ التغييرات." };
}

export async function resetUserPassword(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser("users.manage");
  const password = String(formData.get("password") ?? "");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "المستخدم غير موجود." };
  const weak = passwordProblem(password, target.email);
  if (weak) return { ok: false, message: weak, errors: { password: weak } };

  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId } });
  await audit("user.password_reset", { userId: me.id, entity: "user", entityId: userId });
  return { ok: true, message: "تم تعيين كلمة المرور الجديدة وإنهاء جلسات المستخدم." };
}

export async function deleteUser(userId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser("users.manage");
  if (formData.get("confirm") !== "on") return { ok: false, message: "يرجى تأكيد الحذف أولًا." };
  if (userId === me.id) return { ok: false, message: "لا يمكنك حذف حسابك." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "المستخدم غير موجود." };
  if (target.role === "ADMIN" && (await wouldRemoveLastAdmin(userId))) {
    return { ok: false, message: "لا يمكن حذف آخر مدير رئيسي." };
  }
  await db.user.delete({ where: { id: userId } });
  await audit("user.deleted", { userId: me.id, entity: "user", entityId: userId, details: { email: target.email } });
  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}
