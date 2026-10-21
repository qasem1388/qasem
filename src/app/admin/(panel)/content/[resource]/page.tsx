import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemList, type ListRow } from "@/components/admin/item-list";
import { PageTitle } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { allFields } from "@/lib/resources/definitions";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { delegateOf, getResource, publicPath, relationOptions } from "@/server/resources";
import type { Localized } from "@/types/content";

const text = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === "string" ? v : ((v as Localized | null)?.ar ?? "");

export async function generateMetadata({ params }: PageProps<"/admin/content/[resource]">) {
  const def = getResource((await params).resource);
  return { title: def?.label ?? "المحتوى" };
}

export default async function ContentList({ params }: PageProps<"/admin/content/[resource]">) {
  const me = await requireUser("content.view");
  const def = getResource((await params).resource);
  if (!def) notFound();

  const orderBy = def.orderField ? { [def.orderField]: "asc" } : def.sort ? { [def.sort.field]: def.sort.dir } : undefined;
  const [rows, relations] = await Promise.all([delegateOf(def).findMany({ orderBy, take: 1000 }), relationOptions(def)]);
  const fields = allFields(def);
  const optionLabel = (name: string, value: unknown) => {
    const f = fields.find((x) => x.name === name);
    return f?.type === "select" ? (f.options.find((o) => o.value === value)?.label ?? String(value)) : String(value);
  };
  const relField = def.list.relation;

  const list: ListRow[] = rows.map((r) => ({
    id: r.id,
    title: text(r[def.list.title]),
    subtitle: def.list.subtitle ? text(r[def.list.subtitle]) : undefined,
    image: def.list.image ? ((r[def.list.image] as string) ?? "") : undefined,
    badges: (def.list.badges ?? []).map((b) => ({ label: optionLabel(b, r[b]) })),
    relation: relField ? relations[relField]?.find((o) => o.value === r[relField])?.label : undefined,
    published: def.publishField ? Boolean(r[def.publishField]) : undefined,
    featured: def.featuredField ? Boolean(r[def.featuredField]) : undefined,
    publicUrl: def.publishField && !r[def.publishField] ? undefined : publicPath(def, r),
  }));

  const canEdit = can(me.role, "content.edit");
  return (
    <>
      <PageTitle
        title={def.label}
        description={def.description}
        actions={
          canEdit && (
            <Link href={`/admin/content/${def.key}/new`} className={buttonClasses("secondary", "md")}>
              <Plus className="size-4" aria-hidden />
              إضافة {def.singular}
            </Link>
          )
        }
      />
      <ItemList
        resource={def.key}
        rows={list}
        orderable={!!def.orderField}
        hasPublish={!!def.publishField}
        hasFeatured={!!def.featuredField}
        publishLabel={def.publishField === "open" ? "متاحة" : "منشور"}
        canEdit={canEdit}
      />
    </>
  );
}
