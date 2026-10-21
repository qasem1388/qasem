import { BranchesEditor } from "@/components/admin/branches-editor";
import { PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "الفروع" };

export default async function BranchesPage() {
  await requireUser("settings.manage");
  const rows = await db.branch.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageTitle title="الفروع" description="تظهر في صفحة «تواصل معنا» مع الخريطة وأزرار الاتجاهات." />
      <BranchesEditor
        initial={rows.map((b) => ({
          id: b.id,
          name: b.name as Localized,
          address: b.address as Localized,
          phone: b.phone,
          phoneDisplay: b.phoneDisplay,
          email: b.email,
          hours: b.hours as Localized,
          lat: b.lat,
          lng: b.lng,
          isMain: b.isMain,
        }))}
      />
    </>
  );
}
