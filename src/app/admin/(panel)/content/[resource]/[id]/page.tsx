import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/admin/item-editor";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/server/auth/session";
import { delegateOf, fromDb, getResource, publicPath, relationOptions } from "@/server/resources";
import type { Localized } from "@/types/content";

export const metadata = { title: "تعديل محتوى" };

export default async function EditItem({ params, searchParams }: PageProps<"/admin/content/[resource]/[id]">) {
  await requireUser("content.edit");
  const { resource, id } = await params;
  const { created } = await searchParams;
  const def = getResource(resource);
  if (!def) notFound();
  const row = await delegateOf(def).findUnique({ where: { id } });
  if (!row) notFound();
  const relations = await relationOptions(def);
  const title = (row[def.list.title] as Localized)?.ar ?? def.singular;

  return (
    <>
      <PageTitle title={title} description={def.label} />
      {created && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تمت الإضافة بنجاح.
        </p>
      )}
      <ItemEditor
        def={def}
        id={row.id}
        initial={fromDb(def, row)}
        relations={relations}
        publicUrl={def.publishField && !row[def.publishField] ? undefined : publicPath(def, row)}
      />
    </>
  );
}
