import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectsGrid } from "@/components/cards/projects-grid";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { RichContent } from "@/components/shared/rich-content";
import { Icon } from "@/components/ui/icon";
import { getProjects, getSector, getSectors } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";
import { toProjectCards } from "@/lib/view-models";

export async function generateStaticParams() {
  const sectors = await getSectors();
  return sectors.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/sectors/[slug]">) {
  const { locale } = await pageContext(params);
  const { slug } = await params;
  const sector = await getSector(slug);
  if (!sector) return {};
  return pageMetadata({
    locale,
    path: `/sectors/${slug}`,
    title: tr(sector.name, locale),
    description: tr(sector.summary, locale),
  });
}

export default async function SectorPage({ params }: PageProps<"/[locale]/sectors/[slug]">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("sectors");
  const { slug } = await params;
  const [sector, sectors] = await Promise.all([getSector(slug), getSectors()]);
  if (!sector) notFound();
  const projects = await getProjects({ sectorId: sector.id });
  const name = tr(sector.name, locale);

  return (
    <>
      <PageHeader
        title={name}
        subtitle={tr(sector.summary, locale)}
        crumbs={trail(locale, { label: dict.pages.sectors.title, href: "/sectors" }, { label: name })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <span className="rounded-brand-lg bg-primary text-secondary inline-flex size-16 items-center justify-center">
            <Icon name={sector.icon} className="size-8" />
          </span>
          <div className="mt-8">{sector.body && <RichContent value={tr(sector.body, locale)} />}</div>
          {sector.challenges && (
            <>
              <h2 className="text-primary mt-12 text-2xl font-bold">{dict.sectors.challenges}</h2>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {sector.challenges.map((c) => (
                  <li key={c.en} className="rounded-brand-lg bg-surface text-primary flex items-center gap-3 p-5 font-medium">
                    <CircleCheck className="text-secondary-700 size-5 shrink-0" aria-hidden />
                    {tr(c, locale)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <nav
          aria-label={dict.pages.sectors.title}
          className="rounded-brand-lg border-primary/8 border bg-white p-6 lg:self-start"
        >
          <h2 className="text-primary font-bold">{dict.pages.sectors.title}</h2>
          <ul className="mt-4 space-y-1">
            {sectors.map((s) => (
              <li key={s.id}>
                <Link
                  href={localizeHref(`/sectors/${s.slug}`, locale)}
                  aria-current={s.id === sector.id ? "page" : undefined}
                  className="text-ink/80 hover:bg-primary-50 hover:text-primary aria-[current=page]:bg-primary flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm aria-[current=page]:text-white"
                >
                  {tr(s.name, locale)}
                  <ArrowRight className="size-4 shrink-0 opacity-50 rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <section aria-labelledby="sector-projects" className="bg-surface py-16 sm:py-20">
        <div className="container-page">
          <h2 id="sector-projects" className="text-primary text-2xl font-bold sm:text-3xl">
            {dict.sectors.projects}
          </h2>
          {projects.length ? (
            <ProjectsGrid
              projects={toProjectCards(projects, sectors, locale, dict)}
              showFilters={false}
              filterLabel={dict.sectors.projects}
              labels={{ all: dict.common.all, completed: dict.common.completed, ongoing: dict.common.ongoing }}
            />
          ) : (
            <p className="rounded-brand-lg text-muted mt-8 bg-white p-8 text-center">{dict.sectors.noProjects}</p>
          )}
        </div>
      </section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
