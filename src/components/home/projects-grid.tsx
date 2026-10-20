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
}: {
  projects: ProjectCard[];
  labels: Record<Filter, string>;
  filterLabel: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = projects.filter((p) => filter === "all" || p.status === filter);

  return (
    <>
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
