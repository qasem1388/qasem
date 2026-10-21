import { ServiceCard } from "@/components/cards/service-card";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { getServiceCategories, getServices } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/services">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/services", title: dict.pages.services.title, description: dict.pages.services.subtitle });
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/services">) {
  const { locale, dict } = await pageContext(params);
  const [services, categories] = await Promise.all([getServices(), getServiceCategories()]);
  const groups = categories
    .map((c) => ({ ...c, services: services.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.services.length > 0);

  return (
    <>
      <PageHeader
        title={dict.pages.services.title}
        subtitle={dict.pages.services.subtitle}
        crumbs={trail(locale, { label: dict.pages.services.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      >
        <nav aria-label={dict.services.categories} className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#cat-${g.id}`}
                  className="hover:border-secondary hover:bg-secondary hover:text-primary inline-flex h-10 items-center rounded-full border border-white/25 px-4 text-sm font-medium transition-colors"
                >
                  {tr(g.name, locale)}
                  <span className="ms-2 rounded-full bg-white/15 px-2 text-xs" dir="ltr">
                    {g.services.length}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      {groups.map((g, gi) => (
        <section
          key={g.id}
          id={`cat-${g.id}`}
          aria-labelledby={`cat-${g.id}-title`}
          className={gi % 2 ? "bg-surface py-16 sm:py-20" : "py-16 sm:py-20"}
        >
          <div className="container-page">
            <h2
              id={`cat-${g.id}-title`}
              className="text-primary flex items-center gap-3 text-2xl font-bold sm:text-3xl"
              data-reveal
            >
              <span className="bg-secondary h-8 w-1.5 rounded-full" aria-hidden />
              {tr(g.name, locale)}
            </h2>
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {g.services.map((s) => (
                <li key={s.slug} data-reveal>
                  <ServiceCard
                    href={localizeHref(`/services/${s.slug}`, locale)}
                    icon={s.icon}
                    title={tr(s.title, locale)}
                    summary={tr(s.summary, locale)}
                    readMore={dict.common.readMore}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
