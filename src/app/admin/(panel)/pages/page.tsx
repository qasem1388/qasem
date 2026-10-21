import { Plus } from "lucide-react";
import Link from "next/link";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { SYSTEM_PAGES } from "@/lib/schemas/page";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "الصفحات" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium" });
const statusBadge = {
  PUBLISHED: <Badge tone="green">منشورة</Badge>,
  DRAFT: <Badge tone="gold">مسودة</Badge>,
  ARCHIVED: <Badge tone="gray">مؤرشفة</Badge>,
};

export default async function PagesList({ searchParams }: PageProps<"/admin/pages">) {
  await requireUser("content.edit");
  const { deleted } = await searchParams;
  const pages = await db.page.findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  return (
    <>
      <PageTitle
        title="الصفحات"
        description="صفحات المحتوى الحر مثل السياسات والصفحات التعريفية الإضافية. تظهر على الرابط /ar/اسم-الصفحة ويمكن إضافتها إلى القوائم."
        actions={
          <Link href="/admin/pages/new" className={buttonClasses("secondary", "md")}>
            <Plus className="size-4" aria-hidden />
            صفحة جديدة
          </Link>
        }
      />
      {deleted && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تم حذف الصفحة. تأكد من إزالة أي رابط إليها من القوائم.
        </p>
      )}
      <Table head={["العنوان", "الرابط", "الحالة", "آخر تعديل", ""]} empty={pages.length ? undefined : "لا توجد صفحات بعد."}>
        {pages.map((p) => (
          <tr key={p.id}>
            <Td className="text-primary font-semibold">
              {(p.title as Localized).ar}
              {SYSTEM_PAGES.includes(p.slug) && <span className="text-muted ms-2 text-xs font-normal">(أساسية)</span>}
            </Td>
            <Td>
              <code dir="ltr" className="text-muted text-xs">
                /{p.slug}
              </code>
            </Td>
            <Td>{statusBadge[p.status]}</Td>
            <Td className="text-muted">{fmt.format(p.updatedAt)}</Td>
            <Td>
              <Link href={`/admin/pages/${p.id}`} className="text-accent font-semibold hover:underline">
                تعديل
              </Link>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
