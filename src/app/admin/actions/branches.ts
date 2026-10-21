"use server";

import { z } from "zod";
import type { SaveResult } from "@/components/admin/inputs";
import { db } from "@/lib/db";
import { issuesToErrors } from "@/lib/schemas/common";
import { branchSchema } from "@/lib/schemas/settings";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { revalidateSite } from "@/server/revalidate";

const listSchema = z
  .array(branchSchema.extend({ id: z.string().max(40).optional() }))
  .max(30)
  .refine((l) => l.filter((b) => b.isMain).length <= 1, "يمكن تحديد مقر رئيسي واحد فقط.");

/** Saves the full branch list: updates existing rows, creates new ones, deletes removed ones. */
export async function saveBranches(json: string): Promise<SaveResult> {
  const me = await requireUser("settings.manage");
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, message: "بيانات غير صالحة." };
  }
  const parsed = listSchema.safeParse(payload);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues.find((i) => i.path.length === 0)?.message ?? "يرجى مراجعة الحقول المميزة باللون الأحمر.",
      errors: issuesToErrors(parsed.error),
    };

  const list = parsed.data;
  await db.$transaction(async (tx) => {
    const keep = list.map((b) => b.id).filter(Boolean) as string[];
    const removed = await tx.branch.deleteMany({ where: { id: { notIn: keep } } });
    for (const [order, { id, ...data }] of list.entries()) {
      if (id && (await tx.branch.findUnique({ where: { id } })))
        await tx.branch.update({ where: { id }, data: { ...data, order } });
      else await tx.branch.create({ data: { ...data, order } });
    }
    if (removed.count) await audit("branch.deleted", { userId: me.id, entity: "branch", details: { count: removed.count } });
  });
  await audit("branch.saved", { userId: me.id, entity: "branch", details: { count: list.length } });
  revalidateSite();
  return { ok: true, message: "تم حفظ الفروع ونشرها على الموقع." };
}
