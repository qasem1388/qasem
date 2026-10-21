import { IdentityEditor } from "@/components/admin/identity-editor";
import { PageTitle } from "@/components/admin/ui";
import { getSiteSettings } from "@/lib/content";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "الهوية التجارية" };

export default async function IdentityPage() {
  await requireUser("settings.manage");
  const s = await getSiteSettings();
  return (
    <>
      <PageTitle
        title="الهوية التجارية"
        description="اسم الشركة والشعارات والألوان والخطوط. تنعكس على الموقع كاملًا بعد الحفظ."
      />
      <IdentityEditor initial={{ name: s.name, tagline: s.tagline, description: s.description, logo: s.logo, brand: s.brand }} />
    </>
  );
}
