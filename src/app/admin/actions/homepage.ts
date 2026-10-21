"use server";

import type { SaveResult } from "@/components/admin/inputs";
import { db } from "@/lib/db";
import { issuesToErrors } from "@/lib/schemas/common";
import { homeSchema } from "@/lib/schemas/home";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { revalidateSite } from "@/server/revalidate";

export async function saveHomepage(json: string): Promise<SaveResult> {
  const me = await requireUser("content.edit");
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, message: "بيانات غير صالحة." };
  }
  const parsed = homeSchema.safeParse(payload);
  if (!parsed.success)
    return { ok: false, message: "يرجى مراجعة الحقول المميزة باللون الأحمر.", errors: issuesToErrors(parsed.error) };
  await db.setting.upsert({
    where: { key: "home" },
    create: { key: "home", value: parsed.data },
    update: { value: parsed.data },
  });
  await audit("homepage.updated", { userId: me.id, entity: "settings", entityId: "home" });
  revalidateSite();
  return { ok: true, message: "تم حفظ الصفحة الرئيسية ونشرها." };
}
