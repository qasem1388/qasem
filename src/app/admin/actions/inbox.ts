"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/admin/fields";
import { db } from "@/lib/db";
import { messageStatuses, quoteStatuses } from "@/lib/inbox-status";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { deleteStoredFile } from "@/server/files";

const form = (statuses: string[]) =>
  z.object({ status: z.enum(statuses as [string, ...string[]]), notes: z.string().trim().max(5000) });
const read = (fd: FormData) => ({ status: fd.get("status"), notes: fd.get("notes") ?? "" });

export async function updateMessage(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser("inbox.manage");
  const parsed = form(Object.keys(messageStatuses)).safeParse(read(fd));
  if (!parsed.success) return { ok: false, message: "بيانات غير صالحة." };
  const row = await db.contactMessage.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "الرسالة غير موجودة." };
  await db.contactMessage.update({
    where: { id },
    data: { status: parsed.data.status as keyof typeof messageStatuses, notes: parsed.data.notes || null },
  });
  await audit("inbox.updated", {
    userId: me.id,
    entity: "message",
    entityId: id,
    details: { reference: row.reference, from: row.status, to: parsed.data.status },
  });
  revalidatePath("/admin/messages");
  return { ok: true, message: "تم حفظ التحديث." };
}

export async function deleteMessage(id: string): Promise<void> {
  const me = await requireUser("inbox.manage");
  const row = await db.contactMessage.findUnique({ where: { id } });
  if (row) {
    await db.contactMessage.delete({ where: { id } });
    await audit("inbox.deleted", { userId: me.id, entity: "message", entityId: id, details: { reference: row.reference } });
  }
  revalidatePath("/admin/messages");
  redirect("/admin/messages?deleted=1");
}

export async function updateQuote(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser("inbox.manage");
  const parsed = form(Object.keys(quoteStatuses)).safeParse(read(fd));
  if (!parsed.success) return { ok: false, message: "بيانات غير صالحة." };
  const row = await db.quoteRequest.findUnique({ where: { id } });
  if (!row) return { ok: false, message: "الطلب غير موجود." };
  await db.quoteRequest.update({
    where: { id },
    data: { status: parsed.data.status as keyof typeof quoteStatuses, notes: parsed.data.notes || null },
  });
  await audit("inbox.updated", {
    userId: me.id,
    entity: "quote",
    entityId: id,
    details: { reference: row.reference, from: row.status, to: parsed.data.status },
  });
  revalidatePath("/admin/quotes");
  return { ok: true, message: "تم حفظ التحديث." };
}

export async function deleteQuote(id: string): Promise<void> {
  const me = await requireUser("inbox.manage");
  const row = await db.quoteRequest.findUnique({ where: { id } });
  if (row) {
    await db.quoteRequest.delete({ where: { id } });
    await deleteStoredFile(row.attachmentId);
    await audit("inbox.deleted", { userId: me.id, entity: "quote", entityId: id, details: { reference: row.reference } });
  }
  revalidatePath("/admin/quotes");
  redirect("/admin/quotes?deleted=1");
}
