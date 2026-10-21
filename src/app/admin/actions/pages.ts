"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SaveResult } from "@/components/admin/inputs";
import { db } from "@/lib/db";
import { sanitizeRichText } from "@/lib/sanitize";
import { issuesToErrors } from "@/lib/schemas/common";
import { RESERVED_SLUGS, SYSTEM_PAGES, pageSchema } from "@/lib/schemas/page";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { revalidateSite } from "@/server/revalidate";

function parse(json: string) {
  try {
    return pageSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Creates (id = null) or updates a page. Body HTML is sanitised before storage. */
export async function savePage(id: string | null, json: string): Promise<SaveResult & { id?: string }> {
  const me = await requireUser("content.edit");
  const parsed = parse(json);
  if (!parsed) return { ok: false, message: "بيانات غير صالحة." };
  if (!parsed.success)
    return { ok: false, message: "يرجى مراجعة الحقول المميزة باللون الأحمر.", errors: issuesToErrors(parsed.error) };
  const data = parsed.data;

  const existing = id ? await db.page.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, message: "الصفحة غير موجودة." };
  const isSystem = !!existing && SYSTEM_PAGES.includes(existing.slug);
  if (isSystem) data.slug = existing!.slug;
  else if (RESERVED_SLUGS.includes(data.slug) || SYSTEM_PAGES.includes(data.slug)) {
    return {
      ok: false,
      message: "يرجى مراجعة الحقول المميزة باللون الأحمر.",
      errors: { slug: "هذا الرابط محجوز لصفحة أساسية في الموقع." },
    };
  }
  const clash = await db.page.findFirst({ where: { slug: data.slug, ...(id ? { NOT: { id } } : {}) } });
  if (clash)
    return { ok: false, message: "يرجى مراجعة الحقول المميزة باللون الأحمر.", errors: { slug: "يوجد صفحة أخرى بنفس الرابط." } };

  const values = {
    title: data.title,
    slug: data.slug,
    status: data.status,
    seoDescription: data.seoDescription,
    body: { ar: sanitizeRichText(data.body.ar), en: sanitizeRichText(data.body.en) },
  };
  const page = id ? await db.page.update({ where: { id }, data: values }) : await db.page.create({ data: values });
  await audit(id ? "page.updated" : "page.created", {
    userId: me.id,
    entity: "page",
    entityId: page.id,
    details: { slug: page.slug, status: page.status },
  });
  revalidateSite();
  revalidatePath("/admin/pages");
  return {
    ok: true,
    message: page.status === "PUBLISHED" ? "تم الحفظ ونشر الصفحة." : "تم الحفظ (الصفحة غير منشورة).",
    id: page.id,
  };
}

export async function deletePage(id: string): Promise<void> {
  const me = await requireUser("content.edit");
  const page = await db.page.findUnique({ where: { id } });
  if (!page || SYSTEM_PAGES.includes(page.slug)) redirect("/admin/pages");
  await db.page.delete({ where: { id } });
  await audit("page.deleted", { userId: me.id, entity: "page", entityId: id, details: { slug: page.slug } });
  revalidateSite();
  redirect("/admin/pages?deleted=1");
}
