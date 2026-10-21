import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProjects, getSectors } from "@/lib/content";
import { localizeHref, tr } from "@/lib/utils";
import { ProjectsGrid } from "@/components/cards/projects-grid";
import { toProjectCards } from "@/lib/view-models";
import type { SectionProps } from "./types";

export async function ProjectsSection({ locale, dict, home }: SectionProps) {
  const [projects, sectors] = await Promise.all([getProjects({ featured: true }), getSectors()]);
  const { projects: copy } = home;

  const cards = toProjectCards(projects, sectors, locale, dict);

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
