"use server";

import { revalidatePath } from "next/cache";
import type { SaveResult } from "@/components/admin/inputs";
import { allFields } from "@/lib/resources/definitions";
import { issuesToErrors } from "@/lib/schemas/common";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { delegateOf, getResource, schemaFor, toDb } from "@/server/resources";
import { revalidateSite } from "@/server/revalidate";

const INVALID = "يرجى مراجعة الحقول المميزة باللون الأحمر.";

/** Creates (id = null) or updates an item of any content type defined in lib/resources. */
export async function saveItem(key: string, id: string | null, json: string): Promise<SaveResult & { id?: string }> {
  const me = await requireUser("content.edit");
  const def = getResource(key);
  if (!def) return { ok: false, message: "نوع محتوى غير معروف." };

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, message: "بيانات غير صالحة." };
  }
  const parsed = schemaFor(def).safeParse(payload);
  if (!parsed.success) return { ok: false, message: INVALID, errors: issuesToErrors(parsed.error) };

  const model = delegateOf(def);
  if (id && !(await model.findUnique({ where: { id } }))) return { ok: false, message: "العنصر غير موجود." };
  const data = toDb(def, parsed.data as Record<string, unknown>);

  if (allFields(def).some((f) => f.type === "slug")) {
    const clash = await model.findFirst({ where: { slug: data.slug, ...(id ? { NOT: { id } } : {}) } });
    if (clash) return { ok: false, message: INVALID, errors: { slug: "هذا الرابط مستخدم لعنصر آخر." } };
  }

  let row;
  if (id) {
    row = await model.update({ where: { id }, data });
  } else {
    if (def.orderField) {
      const { _max } = await model.aggregate({ _max: { [def.orderField]: true } });
      data[def.orderField] = (_max[def.orderField] ?? -1) + 1;
    }
    row = await model.create({ data });
  }
  await audit(id ? "content.updated" : "content.created", { userId: me.id, entity: def.key, entityId: row.id });
  revalidateSite();
  revalidatePath(`/admin/content/${def.key}`);
  return { ok: true, message: "تم الحفظ ونشر التغييرات.", id: row.id };
}

export async function deleteItem(key: string, id: string): Promise<{ ok: boolean; message: string }> {
  const me = await requireUser("content.edit");
  const def = getResource(key);
  if (!def) return { ok: false, message: "نوع محتوى غير معروف." };
  try {
    await delegateOf(def).delete({ where: { id } });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2003") return { ok: false, message: "لا يمكن الحذف لوجود عناصر مرتبطة به. انقلها أو احذفها أولًا." };
    if (code === "P2025") return { ok: false, message: "العنصر غير موجود." };
    throw e;
  }
  await audit("content.deleted", { userId: me.id, entity: def.key, entityId: id });
  revalidateSite();
  revalidatePath(`/admin/content/${def.key}`);
  return { ok: true, message: "تم الحذف." };
}

export async function reorderItems(key: string, ids: string[]): Promise<{ ok: boolean; message: string }> {
  const me = await requireUser("content.edit");
  const def = getResource(key);
  if (!def?.orderField || !Array.isArray(ids) || ids.length > 500) return { ok: false, message: "طلب غير صالح." };
  const model = delegateOf(def);
  for (const [i, id] of ids.entries()) await model.update({ where: { id: String(id) }, data: { [def.orderField]: i } });
  await audit("content.reordered", { userId: me.id, entity: def.key });
  revalidateSite();
  return { ok: true, message: "تم حفظ الترتيب." };
}

/** Flips the publish or featured flag from the list view. */
export async function toggleItem(
  key: string,
  id: string,
  which: "__publish" | "__featured",
): Promise<{ ok: boolean; value?: boolean }> {
  const me = await requireUser("content.edit");
  const def = getResource(key);
  const field = which === "__publish" ? def?.publishField : which === "__featured" ? def?.featuredField : undefined;
  if (!def || !field) return { ok: false };
  const model = delegateOf(def);
  const row = await model.findUnique({ where: { id } });
  if (!row) return { ok: false };
  const value = !row[field];
  await model.update({ where: { id }, data: { [field]: value } });
  await audit("content.updated", { userId: me.id, entity: def.key, entityId: id, details: { [field]: value } });
  revalidateSite();
  return { ok: true, value };
}
