import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, SearchX } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useI18n } from "@/shared/i18n";

export interface Column<T> {
  key: string;
  header: string;
  /** Value used for sorting, searching and filtering. */
  value: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "start" | "end" | "center";
  /** When set, a filter dropdown is shown for this column. */
  filterOptions?: Array<{ value: string; label: string }>;
  className?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  pageSize?: number;
  searchable?: boolean;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
  toolbar?: ReactNode;
  caption?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

const collator = new Intl.Collator("ar", { numeric: true, sensitivity: "base" });

/** Pure helper (exported for tests): search, filter, sort. */
export function applyTableState<T>(
  rows: T[],
  columns: Column<T>[],
  query: string,
  filters: Record<string, string>,
  sort: SortState,
): T[] {
  const q = query.trim().toLowerCase();
  let out = rows.filter((row) => {
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      const col = columns.find((c) => c.key === key);
      if (col && String(col.value(row) ?? "") !== val) return false;
    }
    if (!q) return true;
    return columns.some((c) => String(c.value(row) ?? "").toLowerCase().includes(q));
  });
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      const factor = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = col.value(a);
        const vb = col.value(b);
        if (va === vb) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
        return collator.compare(String(va), String(vb)) * factor;
      });
    }
  }
  return out;
}

const alignClass = { start: "text-start", end: "text-end", center: "text-center" } as const;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  pageSize = 10,
  searchable = true,
  initialSort,
  emptyMessage,
  toolbar,
  caption,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const visible = useMemo(() => applyTableState(rows, columns, query, filters, sort), [rows, columns, query, filters, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(current * pageSize, current * pageSize + pageSize);
  const filterable = columns.filter((c) => c.filterOptions);

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  };

  return (
    <div className="flex flex-col">
      {(searchable || filterable.length > 0 || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {searchable && (
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-subtle" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={t("common.search")}
                aria-label={t("common.search")}
                className="h-9 w-full rounded-lg border border-border-strong bg-surface ps-9 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
              />
            </div>
          )}
          {filterable.map((c) => (
            <select
              key={c.key}
              aria-label={c.header}
              value={filters[c.key] ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, [c.key]: e.target.value }));
                setPage(0);
              }}
              className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">
                {c.header}: {t("common.all")}
              </option>
              {c.filterOptions!.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          {toolbar && <div className="ms-auto flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-surface-2 text-xs text-muted">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("border-b border-border px-4 py-2.5 font-medium whitespace-nowrap", alignClass[c.align ?? "start"])}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn("inline-flex items-center gap-1 hover:text-text", active && "text-text")}
                      >
                        {c.header}
                        <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden="true" />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-b-0 hover:bg-surface-2">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", alignClass[c.align ?? "start"], c.className)}>
                    {c.render ? c.render(row) : (c.value(row) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted">
            <SearchX className="size-8 text-subtle" aria-hidden="true" />
            <p className="text-sm">{emptyMessage ?? t("common.noResults")}</p>
          </div>
        )}
      </div>

      {visible.length > pageSize && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted">
          <span>
            {t("common.showing", {
              from: current * pageSize + 1,
              to: Math.min(visible.length, (current + 1) * pageSize),
              total: visible.length,
            })}
          </span>
          <div className="flex items-center gap-1">
            {/* In RTL the "previous" arrow points right. */}
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-surface-3 disabled:opacity-40"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              aria-label={t("common.previousPage")}
            >
              <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
            <span className="num px-2">
              {current + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-surface-3 disabled:opacity-40"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              aria-label={t("common.nextPage")}
            >
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
