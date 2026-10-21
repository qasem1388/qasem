import { HomepageEditor } from "@/components/admin/homepage-editor";
import { PageTitle } from "@/components/admin/ui";
import { getHomePage } from "@/lib/content";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "الصفحة الرئيسية" };

export default async function HomepageAdmin() {
  await requireUser("content.edit");
  const home = await getHomePage();
  return (
    <>
      <PageTitle
        title="الصفحة الرئيسية"
        description="البانر والأزرار والإحصائيات وترتيب الأقسام وعناوينها. بطاقات الخدمات والمشاريع المعروضة تُدار من أقسام المحتوى بخيار «مميز»."
        actions={
          <a
            href="/ar"
            target="_blank"
            className="rounded-brand border-primary/15 text-primary inline-flex h-10 items-center border bg-white px-4 text-sm font-semibold"
          >
            معاينة الموقع
          </a>
        }
      />
      <HomepageEditor initial={home} />
    </>
  );
}
