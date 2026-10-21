import { Building2, Calendar, CircleCheck, Layers, MapPin, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectsGrid } from "@/components/cards/projects-grid";
import { CtaBand } from "@/components/shared/cta-band";
import { Gallery } from "@/components/shared/gallery";
import { PageHeader } from "@/components/shared/page-header";
import { Prose } from "@/components/shared/prose";
import { getProject, getProjects, getSectors } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";
import { toProjectCards } from "@/lib/view-models";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { locale } = await pageContext(params);
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return pageMetadata({
    locale,
    path: `/projects/${slug}`,
    title: tr(project.title, locale),
    description: tr(project.summary, locale),
    image: project.image,
  });
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { locale, dict } = await pageContext(params);
  const { slug } = await params;
  const [project, all, sectors] = await Promise.all([getProject(slug), getProjects(), getSectors()]);
  if (!project) notFound();

  const title = tr(project.title, locale);
  const sector = sectors.find((s) => s.id === project.sectorId);
  const related = all
    .filter((p) => p.slug !== project.slug)
    .sort((a) => (a.sectorId === project.sectorId ? -1 : 1))
    .slice(0, 3);
  const facts = [
    { icon: Building2, label: dict.projects.client, value: tr(project.client, locale) },
    { icon: MapPin, label: dict.projects.location, value: tr(project.location, locale) },
    { icon: Calendar, label: dict.projects.year, value: String(project.year) },
    {
      icon: Tag,
      label: dict.projects.status,
      value: project.status === "completed" ? dict.common.completed : dict.common.ongoing,
    },
    {
      icon: Layers,
      label: dict.projects.sector,
      value: tr(sector?.name, locale),
      href: sector ? localizeHref(`/sectors/${sector.slug}`, locale) : undefined,
    },
  ];

  return (
    <>
      <PageHeader
        title={title}
        subtitle={tr(project.summary, locale)}
        crumbs={trail(locale, { label: dict.pages.projects.title, href: "/projects" }, { label: title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <Image
            src={project.image}
            alt=""
            width={960}
            height={640}
            priority
            className="rounded-brand-lg aspect-[3/2] h-auto w-full object-cover shadow-lg"
          />
          <div className="mt-10">
            <Prose text={tr(project.body, locale)} />
          </div>
          <h2 className="text-primary mt-12 text-2xl font-bold">{dict.projects.scope}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {project.scope.map((s) => (
              <li key={s.en} className="rounded-brand bg-surface text-primary flex items-center gap-3 px-4 py-3 font-medium">
                <CircleCheck className="text-secondary-700 size-5 shrink-0" aria-hidden />
                {tr(s, locale)}
              </li>
            ))}
          </ul>
          <h2 className="text-primary mt-12 mb-6 text-2xl font-bold">{dict.projects.gallery}</h2>
          <Gallery
            items={project.gallery.map((src, i) => ({ src, caption: `${title} — ${i + 1}` }))}
            labels={{ close: dict.media.close, prev: dict.media.prev, next: dict.media.next, open: dict.media.open }}
          />
        </article>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ul className="divide-primary/8 rounded-brand-lg border-primary/8 divide-y border bg-white">
            {facts.map(({ icon: I, ...f }) => (
              <li key={f.label} className="flex items-center gap-4 p-5">
                <span className="rounded-brand bg-primary-50 text-primary inline-flex size-11 shrink-0 items-center justify-center">
                  <I className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-muted text-sm">{f.label}</p>
                  <p className="text-primary font-semibold">
                    {f.href ? (
                      <Link href={f.href} className="decoration-secondary hover:text-accent underline underline-offset-4">
                        {f.value}
                      </Link>
                    ) : (
                      f.value
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section aria-labelledby="related-title" className="bg-surface py-16 sm:py-20">
        <div className="container-page">
          <h2 id="related-title" className="text-primary text-2xl font-bold sm:text-3xl">
            {dict.projects.related}
          </h2>
          <ProjectsGrid
            projects={toProjectCards(related, sectors, locale, dict)}
            showFilters={false}
            filterLabel={dict.projects.related}
            labels={{ all: dict.common.all, completed: dict.common.completed, ongoing: dict.common.ongoing }}
          />
        </div>
      </section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
