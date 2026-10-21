import { GeneralEditor } from "@/components/admin/settings-editors";
import { RefreshCacheButton } from "@/components/admin/refresh-cache";
import { Card, PageTitle } from "@/components/admin/ui";
import { getSiteSettings } from "@/lib/content";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "الإعدادات العامة" };

export default async function GeneralPage() {
  await requireUser("settings.manage");
  const s = await getSiteSettings();
  return (
    <>
      <PageTitle
        title="الإعدادات العامة"
        description="الأقسام الاختيارية، محركات البحث والتحليلات، صورة المشاركة، ووضع العرض التجريبي."
      />
      <GeneralEditor initial={{ demoMode: s.demoMode, pages: s.pages, seo: s.seo }} />
      <Card title="صيانة" className="mt-6">
        <p className="text-muted mb-4 text-sm leading-7">
          تُحدَّث الصفحات تلقائيًا عند الحفظ من اللوحة. استخدم هذا الزر فقط بعد استعادة نسخة احتياطية أو تعديل قاعدة البيانات
          مباشرة.
        </p>
        <RefreshCacheButton />
      </Card>
    </>
  );
}
