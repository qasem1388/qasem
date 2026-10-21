import { CompanyEditor } from "@/components/admin/settings-editors";
import { PageTitle } from "@/components/admin/ui";
import { getSiteSettings } from "@/lib/content";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "بيانات المنشأة" };

export default async function CompanyPage() {
  await requireUser("settings.manage");
  const s = await getSiteSettings();
  return (
    <>
      <PageTitle
        title="بيانات المنشأة"
        description="السجل التجاري والرقم الضريبي وبيانات التواصل والعنوان وحسابات التواصل الاجتماعي."
      />
      <CompanyEditor initial={{ legal: s.legal, contact: s.contact, social: s.social }} />
    </>
  );
}
