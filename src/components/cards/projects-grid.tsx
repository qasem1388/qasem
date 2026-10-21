"use client";

import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ProjectCard = {
  slug: string;
  href: string;
  title: string;
  summary: string;
  sector: string;
  sectorId: string;
  status: "completed" | "ongoing";
  statusLabel: string;
  location: string;
  year: number;
  image: string;
};

type Filter = "all" | "completed" | "ongoing";

export function ProjectsGrid({
  projects,
  labels,
  filterLabel,
  sectors,
  sectorLabels,
  emptyLabel,
  showFilters = true,
}: {
  projects: ProjectCard[];
  labels: Record<Filter, string>;
  filterLabel: string;
  /** When provided, a sector filter is shown next to the status filter. */
  sectors?: { id: string; label: string }[];
  sectorLabels?: { label: string; all: string };
  emptyLabel?: string;
  showFilters?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sector, setSector] = useState("all");
  const visible = projects.filter(
    (p) => (filter === "all" || p.status === filter) && (sector === "all" || p.sectorId === sector),
  );

  return (
    <>
      {showFilters && (
        <div role="group" aria-label={filterLabel} className="mt-10 flex flex-wrap justify-center gap-2">
          {(Object.keys(labels) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "h-10 rounded-full px-5 text-sm font-medium transition-colors",
                filter === key ? "bg-primary text-white" : "bg-primary-50 text-primary hover:bg-primary-100",
              )}
            >
              {labels[key]}
            </button>
          ))}
        </div>
      )}

      {showFilters && sectors && sectorLabels && (
        <div className="mx-auto mt-4 flex max-w-xs items-center gap-3">
          <label htmlFor="sector-filter" className="text-primary shrink-0 text-sm font-medium">
            {sectorLabels.label}
          </label>
          <select
            id="sector-filter"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="border-primary/15 text-primary focus:border-primary focus:ring-secondary/40 h-10 w-full rounded-full border bg-white px-4 text-sm focus:ring-2 focus:outline-none"
          >
            <option value="all">{sectorLabels.all}</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {visible.length === 0 && emptyLabel && (
        <p className="rounded-brand-lg text-muted mt-10 bg-white p-10 text-center">{emptyLabel}</p>
      )}

      <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {visible.map((p) => (
          <li key={p.slug}>
            <article className="group rounded-brand-lg bg-primary shadow-primary/10 relative h-full overflow-hidden shadow-lg">
              <Image
                src={p.image}
                alt=""
                width={640}
                height={520}
                className="aspect-[4/3.4] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                className="from-primary/95 via-primary/40 absolute inset-0 bg-gradient-to-t via-45% to-transparent to-75%"
                aria-hidden
              />
              <span
                className={cn(
                  "absolute top-4 rounded-full px-3 py-1 text-xs font-semibold ltr:left-4 rtl:right-4",
                  p.status === "completed" ? "bg-secondary text-primary" : "text-primary bg-white/90",
                )}
              >
                {p.statusLabel}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-secondary text-xs font-medium">{p.sector}</p>
                <h3 className="mt-2 text-lg leading-snug font-bold">
                  <Link href={p.href} className="after:absolute after:inset-0 after:content-['']">
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-white/75">{p.summary}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {p.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" aria-hidden />
                    {p.year}
                  </span>
                </div>
              </div>
              <span
                className="text-primary absolute top-4 inline-flex size-10 scale-75 items-center justify-center rounded-full bg-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 ltr:right-4 rtl:left-4"
                aria-hidden
              >
                <ArrowUpRight className="size-5 rtl:-scale-x-100" />
              </span>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
