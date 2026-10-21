"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SaveResult } from "@/components/admin/inputs";
import { getSiteSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { issuesToErrors } from "@/lib/schemas/common";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { testEmail } from "@/server/email-templates";
import { mailConfig, sendMail } from "@/server/mail";

const emails = z.array(z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح.")).max(10, "الحد الأقصى 10 عناوين.");
const schema = z.object({
  enabled: z.boolean(),
  recipients: z.object({ contact: emails, quote: emails, application: emails }),
  autoReply: z.object({ contact: z.boolean(), quote: z.boolean(), application: z.boolean() }),
});

export async function saveNotifications(json: string): Promise<SaveResult> {
  const me = await requireUser("settings.manage");
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { ok: false, message: "بيانات غير صالحة." };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    return { ok: false, message: "يرجى مراجعة الحقول المميزة باللون الأحمر.", errors: issuesToErrors(parsed.error) };
  await db.setting.upsert({
    where: { key: "notifications" },
    create: { key: "notifications", value: parsed.data },
    update: { value: parsed.data },
  });
  await audit("settings.updated", { userId: me.id, entity: "settings", entityId: "notifications" });
  return { ok: true, message: "تم حفظ إعدادات الإشعارات." };
}

export async function sendTest(to: string): Promise<{ ok: boolean; message: string }> {
  const me = await requireUser("settings.manage");
  if (!z.string().email().safeParse(to.trim()).success) return { ok: false, message: "أدخل بريدًا إلكترونيًا صحيحًا." };
  if (!mailConfig())
    return { ok: false, message: "لم يتم إعداد خادم البريد. أضف متغيرات SMTP في ملف البيئة ثم أعد تشغيل الموقع." };
  const site = await getSiteSettings();
  await sendMail({
    kind: "test",
    to,
    ...testEmail({ name: site.name.ar, primary: site.brand.primary, secondary: site.brand.secondary }),
  });
  const last = await db.emailLog.findFirst({ where: { kind: "test", to: to.trim() }, orderBy: { createdAt: "desc" } });
  await audit("settings.updated", {
    userId: me.id,
    entity: "settings",
    entityId: "notifications.test",
    details: { to, status: last?.status },
  });
  revalidatePath("/admin/settings/notifications");
  return last?.status === "SENT"
    ? { ok: true, message: `تم إرسال رسالة الاختبار إلى ${to}.` }
    : { ok: false, message: `تعذر الإرسال: ${last?.error ?? "خطأ غير معروف"}` };
}
