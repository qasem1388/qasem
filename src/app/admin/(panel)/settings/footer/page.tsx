import { FooterEditor } from "@/components/admin/settings-editors";
import { PageTitle } from "@/components/admin/ui";
import { getSiteSettings } from "@/lib/content";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "التذييل" };

export default async function FooterPage() {
  await requireUser("settings.manage");
  const s = await getSiteSettings();
  return (
    <>
      <PageTitle title="التذييل" description="النبذة وأعمدة الروابط ونص حقوق النشر في أسفل جميع صفحات الموقع." />
      <FooterEditor initial={s.footer} />
    </>
  );
}
