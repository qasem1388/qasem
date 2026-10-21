"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/admin/fields";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { deleteStoredFile } from "@/server/files";

const schema = z.object({
  status: z.enum(["NEW", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED"]),
  notes: z.string().trim().max(5000),
});

export async function updateApplication(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser("inbox.manage");
  const parsed = schema.safeParse({ status: formData.get("status"), notes: formData.get("notes") ?? "" });
  if (!parsed.success) return { ok: false, message: "بيانات غير صالحة." };
  const app = await db.jobApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, message: "الطلب غير موجود." };
  await db.jobApplication.update({ where: { id }, data: { status: parsed.data.status, notes: parsed.data.notes || null } });
  await audit("application.updated", {
    userId: me.id,
    entity: "application",
    entityId: id,
    details: { reference: app.reference, from: app.status, to: parsed.data.status },
  });
  revalidatePath("/admin/applications");
  return { ok: true, message: "تم حفظ التحديث." };
}

export async function deleteApplication(id: string): Promise<void> {
  const me = await requireUser("inbox.manage");
  const app = await db.jobApplication.findUnique({ where: { id } });
  if (app) {
    await db.jobApplication.delete({ where: { id } });
    await deleteStoredFile(app.cvId);
    await audit("application.deleted", {
      userId: me.id,
      entity: "application",
      entityId: id,
      details: { reference: app.reference },
    });
  }
  revalidatePath("/admin/applications");
  redirect("/admin/applications?deleted=1");
}
