"use server";

import type { z } from "zod";
import type { SaveResult } from "@/components/admin/inputs";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/content";
import { issuesToErrors } from "@/lib/schemas/common";
import { companySchema, footerSchema, generalSchema, identitySchema, menuSchema } from "@/lib/schemas/settings";
import { audit } from "@/server/audit";
import type { Permission } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { revalidateSite } from "@/server/revalidate";
import type { SiteSettings } from "@/types/content";

const INVALID = "يرجى مراجعة الحقول المميزة باللون الأحمر.";

/** Validates a JSON payload and merges it into the "site" settings document. */
async function updateSite<S extends z.ZodTypeAny>(
  json: string,
  schema: S,
  section: string,
  permission: Permission = "settings.manage",
  apply: (site: SiteSettings, data: z.infer<S>) => SiteSettings = (site, data) => ({ ...site, ...(data as object) }),
): Promise<SaveResult> {
  const me = await requireUser(permission);
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, message: "بيانات غير صالحة." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: INVALID, errors: issuesToErrors(parsed.error) };

  const site = await getSiteSettings();
  const value = apply(site, parsed.data) as unknown as Prisma.InputJsonValue;
  await db.setting.update({ where: { key: "site" }, data: { value } });
  await audit(section === "menu" ? "menu.updated" : "settings.updated", { userId: me.id, entity: "settings", entityId: section });
  revalidateSite();
  return { ok: true, message: "تم الحفظ ونشر التغييرات على الموقع." };
}

export async function saveIdentity(json: string) {
  return updateSite(json, identitySchema, "identity");
}

export async function saveCompany(json: string) {
  return updateSite(json, companySchema, "company");
}

export async function saveFooter(json: string) {
  return updateSite(json, footerSchema, "footer", "settings.manage", (site, footer) => ({ ...site, footer }));
}

export async function saveGeneral(json: string) {
  return updateSite(json, generalSchema, "general");
}

export async function saveMenu(json: string) {
  return updateSite(json, menuSchema, "menu");
}
