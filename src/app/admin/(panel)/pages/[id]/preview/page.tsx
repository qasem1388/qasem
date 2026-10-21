import { notFound } from "next/navigation";
import { RichContent } from "@/components/shared/rich-content";
import { Badge } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "معاينة صفحة" };

/** Preview of the saved version, including drafts that aren't public yet. */
export default async function PreviewPage({ params }: PageProps<"/admin/pages/[id]/preview">) {
  await requireUser("content.view");
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  const title = page.title as Localized;
  const body = page.body as Localized;
  return (
    <div className="space-y-8">
      <p className="rounded-brand bg-secondary-50 text-secondary-700 p-3 text-sm">
        معاينة النسخة المحفوظة — الحالة:{" "}
        <Badge tone={page.status === "PUBLISHED" ? "green" : "gold"}>
          {page.status === "PUBLISHED" ? "منشورة" : page.status === "DRAFT" ? "مسودة" : "مؤرشفة"}
        </Badge>
      </p>
      {(["ar", "en"] as const).map((l) => (
        <article key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} className="rounded-brand-lg bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-primary mb-6 text-3xl font-bold">{title[l] || "—"}</h1>
          {body[l] ? <RichContent value={body[l]} /> : <p className="text-muted">لا يوجد محتوى بهذه اللغة.</p>}
        </article>
      ))}
    </div>
  );
}
