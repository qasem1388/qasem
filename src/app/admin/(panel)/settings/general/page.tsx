import { GeneralEditor } from "@/components/admin/settings-editors";
import { PageTitle } from "@/components/admin/ui";
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
    </>
  );
}
