import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requestInfo } from "./request";

/** Records an important administrative operation. Never throws: auditing must not break the action. */
export async function audit(
  action: string,
  opts: { userId?: string | null; entity?: string; entityId?: string; details?: Prisma.InputJsonValue } = {},
) {
  try {
    const { ip } = await requestInfo();
    await db.auditLog.create({
      data: { action, ip, userId: opts.userId ?? null, entity: opts.entity, entityId: opts.entityId, details: opts.details },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

export const auditLabels: Record<string, string> = {
  "auth.login": "تسجيل دخول",
  "auth.login_failed": "محاولة دخول فاشلة",
  "auth.login_blocked": "حظر مؤقت لمحاولات الدخول",
  "auth.logout": "تسجيل خروج",
  "auth.password_changed": "تغيير كلمة المرور",
  "auth.sessions_revoked": "إنهاء الجلسات الأخرى",
  "user.created": "إنشاء مستخدم",
  "user.updated": "تعديل مستخدم",
  "user.password_reset": "إعادة تعيين كلمة مرور مستخدم",
  "user.deleted": "حذف مستخدم",
  "user.created_cli": "إنشاء مدير من سطر الأوامر",
  "media.uploaded": "رفع وسائط",
  "media.deleted": "حذف وسائط",
  "settings.updated": "تعديل الإعدادات",
  "settings.reset": "استعادة الهوية الافتراضية",
  "homepage.updated": "تعديل الصفحة الرئيسية",
  "menu.updated": "تعديل القوائم",
  "branch.saved": "حفظ فرع",
  "branch.deleted": "حذف فرع",
  "page.created": "إنشاء صفحة",
  "page.updated": "تعديل صفحة",
  "page.deleted": "حذف صفحة",
  "content.created": "إضافة محتوى",
  "content.updated": "تعديل محتوى",
  "content.deleted": "حذف محتوى",
  "content.reordered": "إعادة ترتيب محتوى",
  "application.updated": "تحديث طلب توظيف",
  "application.deleted": "حذف طلب توظيف",
  "file.downloaded": "تنزيل ملف خاص",
};
