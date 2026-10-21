import { notFound } from "next/navigation";
import { ItemEditor } from "@/components/admin/item-editor";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/server/auth/session";
import { getResource, relationOptions } from "@/server/resources";

export const metadata = { title: "إضافة محتوى" };

export default async function NewItem({ params }: PageProps<"/admin/content/[resource]/new">) {
  await requireUser("content.edit");
  const def = getResource((await params).resource);
  if (!def) notFound();
  const relations = await relationOptions(def);
  const initial: Record<string, unknown> = { ...def.defaults };
  for (const [k, v] of Object.entries(initial)) if (v === "" && /At$/.test(k)) initial[k] = new Date().toISOString().slice(0, 10);
  // Preselect the first option of required relations so the form is valid by default.
  for (const [k, opts] of Object.entries(relations)) if (!initial[k] && opts[0]) initial[k] = opts[0].value;

  return (
    <>
      <PageTitle title={`إضافة ${def.singular}`} description={def.label} />
      <ItemEditor def={def} id={null} initial={initial} relations={relations} />
    </>
  );
}
