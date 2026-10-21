import { Download, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Status tabs (with counts), free-text search and CSV export for an inbox list. */
export function InboxToolbar({
  base,
  statuses,
  counts,
  status,
  q,
  exportType,
  extra,
}: {
  base: string;
  statuses: Record<string, { label: string }>;
  counts: Record<string, number>;
  status?: string;
  q?: string;
  exportType: "messages" | "quotes" | "applications";
  extra?: Record<string, string | undefined>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const params = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(extra ?? {})) if (v) p.set(k, v);
    return p.toString();
  };
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-2">
          {[undefined, ...Object.keys(statuses)].map((s) => (
            <Link
              key={s ?? "all"}
              href={`${base}?${params(s)}`}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                s === status ? "bg-primary text-white" : "text-ink/75 ring-primary/10 hover:bg-primary-50 bg-white ring-1",
              )}
            >
              {s ? statuses[s].label : "الكل"} ({s ? (counts[s] ?? 0) : total})
            </Link>
          ))}
        </nav>
        <a
          href={`/admin/export/${exportType}?${params(status)}`}
          className="rounded-brand border-primary/15 text-primary hover:bg-primary-50 inline-flex h-9 items-center gap-1.5 border bg-white px-3 text-sm font-semibold"
        >
          <Download className="size-4" aria-hidden />
          تصدير CSV
        </a>
      </div>
      <form role="search" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {Object.entries(extra ?? {}).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <label className="relative flex-1">
          <span className="sr-only">بحث</span>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 ltr:left-3 rtl:right-3"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ابحث بالاسم أو البريد أو الجوال أو الرقم المرجعي…"
            className="rounded-brand border-primary/15 focus:border-primary h-10 w-full border bg-white text-sm focus:outline-none ltr:pl-9 rtl:pr-9"
          />
        </label>
        <button type="submit" className="rounded-brand bg-primary h-10 px-4 text-sm font-semibold text-white">
          بحث
        </button>
      </form>
    </div>
  );
}

export function searchWhere(q: string | undefined) {
  const term = q?.trim();
  if (!term) return {};
  const c = { contains: term, mode: "insensitive" as const };
  return { OR: [{ name: c }, { email: c }, { phone: c }, { reference: c }] };
}

export const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
