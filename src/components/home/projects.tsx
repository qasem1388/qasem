import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProjects, getSectors } from "@/lib/content";
import { localizeHref, tr } from "@/lib/utils";
import { ProjectsGrid, type ProjectCard } from "./projects-grid";
import type { SectionProps } from "./types";

export async function ProjectsSection({ locale, dict, home }: SectionProps) {
  const [projects, sectors] = await Promise.all([getProjects({ featured: true }), getSectors()]);
  const { projects: copy } = home;

  const cards: ProjectCard[] = projects.map((p) => ({
    slug: p.slug,
    href: localizeHref(`/projects/${p.slug}`, locale),
    title: tr(p.title, locale),
    summary: tr(p.summary, locale),
    sector: tr(sectors.find((s) => s.id === p.sectorId)?.name, locale),
    status: p.status,
    statusLabel: p.status === "completed" ? dict.common.completed : dict.common.ongoing,
    location: tr(p.location, locale),
    year: p.year,
    image: p.image,
  }));

  return (
    <section id="projects" aria-labelledby="projects-title" className="bg-surface py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="projects-title"
          eyebrow={tr(copy.eyebrow, locale)}
          title={tr(copy.title, locale)}
          subtitle={tr(copy.subtitle, locale)}
        />
        <ProjectsGrid
          projects={cards}
          filterLabel={tr(copy.title, locale)}
          labels={{ all: dict.common.all, completed: dict.common.completed, ongoing: dict.common.ongoing }}
        />
        <div className="mt-12 text-center" data-reveal>
          <ButtonLink href={localizeHref(copy.cta.href, locale)} variant="secondary">
            {tr(copy.cta.label, locale)}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
