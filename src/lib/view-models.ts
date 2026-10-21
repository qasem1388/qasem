import type { ProjectCard } from "@/components/cards/projects-grid";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Project, Sector } from "@/types/content";
import { localizeHref, tr } from "./utils";

export function toProjectCards(projects: Project[], sectors: Sector[], locale: Locale, dict: Dictionary): ProjectCard[] {
  return projects.map((p) => ({
    slug: p.slug,
    href: localizeHref(`/projects/${p.slug}`, locale),
    title: tr(p.title, locale),
    summary: tr(p.summary, locale),
    sector: tr(sectors.find((s) => s.id === p.sectorId)?.name, locale),
    sectorId: p.sectorId,
    status: p.status,
    statusLabel: p.status === "completed" ? dict.common.completed : dict.common.ongoing,
    location: tr(p.location, locale),
    year: p.year,
    image: p.image,
  }));
}
