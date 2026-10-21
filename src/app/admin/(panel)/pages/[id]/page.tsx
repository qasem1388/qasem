import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/page-editor";
import { PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { SYSTEM_PAGES } from "@/lib/schemas/page";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";
import { deletePage } from "../../../actions/pages";

export const metadata = { title: "تعديل صفحة" };

export default async function EditPage({ params, searchParams }: PageProps<"/admin/pages/[id]">) {
  await requireUser("content.edit");
  const { id } = await params;
  const { created } = await searchParams;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  const system = SYSTEM_PAGES.includes(page.slug);
  const empty = { ar: "", en: "" };

  return (
    <>
      <PageTitle
        title={(page.title as Localized).ar}
        description={system ? "صفحة أساسية: يمكن تعديل محتواها دون تغيير رابطها أو حذفها." : undefined}
        actions={
          !system && (
            <form action={deletePage.bind(null, page.id)}>
              <button
                type="submit"
                className="rounded-brand inline-flex h-10 items-center border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                حذف الصفحة
              </button>
            </form>
          )
        }
      />
      {created && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تم إنشاء الصفحة.
        </p>
      )}
      <PageEditor
        id={page.id}
        system={system}
        initial={{
          title: page.title as Localized,
          slug: page.slug,
          status: page.status,
          seoDescription: (page.seoDescription as Localized | null) ?? empty,
          body: page.body as Localized,
        }}
      />
    </>
  );
}
