import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/ui/icon";
import { getProjects, getSectors } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/sectors">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/sectors", title: dict.pages.sectors.title, description: dict.pages.sectors.subtitle });
}

export default async function SectorsPage({ params }: PageProps<"/[locale]/sectors">) {
  const { locale, dict } = await pageContext(params);
  const [sectors, projects] = await Promise.all([getSectors(), getProjects()]);
  return (
    <>
      <PageHeader
        title={dict.pages.sectors.title}
        subtitle={dict.pages.sectors.subtitle}
        crumbs={trail(locale, { label: dict.pages.sectors.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s, i) => {
              const count = projects.filter((p) => p.sectorId === s.id).length;
              return (
                <li key={s.id} data-reveal style={{ "--reveal-delay": `${(i % 3) * 80}ms` } as React.CSSProperties}>
                  <Link
                    href={localizeHref(`/sectors/${s.slug}`, locale)}
                    className="group rounded-brand-lg border-primary/8 hover:border-secondary hover:shadow-primary/10 flex h-full flex-col border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <span className="rounded-brand bg-primary text-secondary group-hover:bg-secondary group-hover:text-primary inline-flex size-14 items-center justify-center transition-colors">
                        <Icon name={s.icon} className="size-7" />
                      </span>
                      {count > 0 && (
                        <span className="bg-secondary-50 text-secondary-700 rounded-full px-3 py-1 text-xs font-semibold">
                          <span dir="ltr">{count}</span> {dict.pages.projects.title}
                        </span>
                      )}
                    </div>
                    <h2 className="text-primary mt-6 text-xl font-bold">{tr(s.name, locale)}</h2>
                    <p className="text-muted mt-2 flex-1 leading-7">{tr(s.summary, locale)}</p>
                    <span className="text-primary group-hover:text-secondary-700 mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                      {dict.common.readMore}
                      <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
