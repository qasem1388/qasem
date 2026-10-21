"use client";

import { ExternalLink, Pencil, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteItem, reorderItems, toggleItem } from "@/app/admin/actions/content";
import { cn } from "@/lib/utils";
import { SortableList } from "./inputs";

export type ListRow = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  badges: { label: string }[];
  relation?: string;
  published?: boolean;
  featured?: boolean;
  publicUrl?: string;
};

export function ItemList({
  resource,
  rows: initial,
  orderable,
  hasPublish,
  hasFeatured,
  publishLabel,
  canEdit,
}: {
  resource: string;
  rows: ListRow[];
  orderable: boolean;
  hasPublish: boolean;
  hasFeatured: boolean;
  publishLabel: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [, start] = useTransition();
  const filtered = q.trim()
    ? rows.filter((r) => `${r.title} ${r.subtitle ?? ""} ${r.relation ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    : rows;

  const toggle = (r: ListRow, field: "published" | "featured") =>
    start(async () => {
      const res = await toggleItem(resource, r.id, field === "published" ? "__publish" : "__featured");
      if (res.ok) setRows((p) => p.map((x) => (x.id === r.id ? { ...x, [field]: res.value } : x)));
    });

  const remove = (r: ListRow) => {
    if (!confirm(`حذف «${r.title}» نهائيًا؟`)) return;
    start(async () => {
      const res = await deleteItem(resource, r.id);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) setRows((p) => p.filter((x) => x.id !== r.id));
    });
  };

  const reorder = (next: ListRow[]) => {
    setRows(next);
    start(async () => {
      const res = await reorderItems(
        resource,
        next.map((r) => r.id),
      );
      setMsg({ ok: res.ok, text: res.message });
    });
  };

  const row = (r: ListRow) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {r.image !== undefined && (
        <span className="bg-surface flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
          {r.image && <img src={r.image} alt="" className="max-h-full max-w-full object-cover" loading="lazy" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/admin/content/${resource}/${r.id}`} className="text-primary block truncate font-semibold hover:underline">
          {r.title || "—"}
        </Link>
        <p className="text-muted flex flex-wrap items-center gap-1.5 text-xs">
          {r.badges.map((b) => (
            <span key={b.label} className="bg-primary-50 text-primary rounded-full px-2 py-0.5 font-semibold">
              {b.label}
            </span>
          ))}
          {r.relation && (
            <span className="bg-secondary-50 text-secondary-700 rounded-full px-2 py-0.5 font-semibold">{r.relation}</span>
          )}
          <span className="truncate">{r.subtitle}</span>
        </p>
      </div>
      <div className="border-primary/5 flex w-full shrink-0 items-center justify-end gap-1 border-t pt-2 sm:w-auto sm:border-0 sm:pt-0">
        {hasFeatured && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggle(r, "featured")}
            aria-pressed={!!r.featured}
            aria-label={`مميز: ${r.title}`}
            title="مميز (يظهر في الرئيسية)"
            className={cn("rounded-md p-1.5", r.featured ? "text-secondary" : "hover:text-secondary text-slate-300")}
          >
            <Star className={cn("size-5", r.featured && "fill-current")} aria-hidden />
          </button>
        )}
        {hasPublish && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => toggle(r, "published")}
            aria-pressed={!!r.published}
            aria-label={`${publishLabel}: ${r.title}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              r.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
            )}
          >
            {r.published ? publishLabel : "مخفي"}
          </button>
        )}
        {r.publicUrl && (
          <a
            href={r.publicUrl}
            target="_blank"
            aria-label={`عرض «${r.title}» في الموقع`}
            className="text-muted hover:bg-primary-50 hover:text-primary rounded-md p-1.5"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
        {canEdit && (
          <>
            <Link
              href={`/admin/content/${resource}/${r.id}`}
              aria-label={`تعديل «${r.title}»`}
              className="text-muted hover:bg-primary-50 hover:text-primary rounded-md p-1.5"
            >
              <Pencil className="size-4" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => remove(r)}
              aria-label={`حذف «${r.title}»`}
              className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">بحث</span>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 ltr:left-3 rtl:right-3"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث…"
            className="rounded-brand border-primary/15 focus:border-primary h-10 w-full border bg-white text-sm focus:outline-none ltr:pl-9 rtl:pr-9"
          />
        </label>
        <span className="text-muted text-sm">{filtered.length} عنصر</span>
        {orderable && canEdit && !q && (
          <span className="text-muted text-xs">اسحب العناصر أو استخدم الأسهم لتغيير ترتيب ظهورها في الموقع.</span>
        )}
      </div>
      {msg && (
        <p
          role="status"
          className={cn("rounded-brand p-3 text-sm", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}
        >
          {msg.text}
        </p>
      )}
      {filtered.length === 0 ? (
        <p className="rounded-brand-lg text-muted bg-white p-10 text-center">لا توجد عناصر.</p>
      ) : orderable && canEdit && !q ? (
        <SortableList items={rows} getKey={(r) => r.id} itemLabel={(r) => r.title} onChange={reorder} render={row} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-brand border-primary/10 border bg-white p-2">
              {row(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
