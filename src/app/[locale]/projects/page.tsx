import { ProjectsGrid } from "@/components/cards/projects-grid";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { getProjects, getSectors } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/utils";
import { toProjectCards } from "@/lib/view-models";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/projects", title: dict.pages.projects.title, description: dict.pages.projects.subtitle });
}

export default async function ProjectsPage({ params }: PageProps<"/[locale]/projects">) {
  const { locale, dict } = await pageContext(params);
  const [projects, sectors] = await Promise.all([getProjects(), getSectors()]);
  const usedSectors = sectors.filter((s) => projects.some((p) => p.sectorId === s.id));

  return (
    <>
      <PageHeader
        title={dict.pages.projects.title}
        subtitle={dict.pages.projects.subtitle}
        crumbs={trail(locale, { label: dict.pages.projects.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="bg-surface pt-6 pb-16 sm:pb-20">
        <div className="container-page">
          <ProjectsGrid
            projects={toProjectCards(projects, sectors, locale, dict)}
            filterLabel={dict.projects.filterStatus}
            labels={{ all: dict.common.all, completed: dict.common.completed, ongoing: dict.common.ongoing }}
            sectors={usedSectors.map((s) => ({ id: s.id, label: tr(s.name, locale) }))}
            sectorLabels={{ label: dict.projects.filterSector, all: dict.projects.allSectors }}
            emptyLabel={dict.projects.empty}
          />
        </div>
      </section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
