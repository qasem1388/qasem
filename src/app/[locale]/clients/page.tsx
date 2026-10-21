import { ClientsSection } from "@/components/home/clients";
import { TestimonialsSection } from "@/components/home/testimonials";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { getHomePage, getSectors, getSiteSettings, getSuccessStories } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/clients">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/clients", title: dict.pages.clients.title, description: dict.pages.clients.subtitle });
}

export default async function ClientsPage({ params }: PageProps<"/[locale]/clients">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("clients");
  const [home, settings, stories, sectors] = await Promise.all([
    getHomePage(),
    getSiteSettings(),
    getSuccessStories(),
    getSectors(),
  ]);
  const sectionProps = { locale, dict, home, settings };

  return (
    <>
      <PageHeader
        title={dict.pages.clients.title}
        subtitle={dict.pages.clients.subtitle}
        crumbs={trail(locale, { label: dict.pages.clients.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <ClientsSection {...sectionProps} />

      <section id="stories" aria-labelledby="stories-title" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="stories-title" eyebrow={dict.clients.stories} title={dict.clients.stories} />
          <ul className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {stories.map((s) => (
              <li key={s.id} data-reveal>
                <article className="rounded-brand-lg border-primary/8 flex h-full flex-col overflow-hidden border bg-white">
                  <div className="bg-primary p-7 text-white">
                    <p className="text-secondary text-xs font-semibold">
                      {tr(sectors.find((x) => x.id === s.sectorId)?.name, locale)}
                    </p>
                    <h3 className="mt-2 text-lg leading-snug font-bold">{tr(s.title, locale)}</h3>
                    <p className="mt-5 flex items-baseline gap-2">
                      <span className="text-secondary text-4xl font-bold" dir="ltr">
                        {s.metric.value}
                      </span>
                      <span className="text-sm text-white/70">{tr(s.metric.label, locale)}</span>
                    </p>
                  </div>
                  <dl className="flex-1 space-y-4 p-7 text-sm leading-7">
                    {(
                      [
                        [dict.clients.challenge, s.challenge],
                        [dict.clients.solution, s.solution],
                        [dict.clients.result, s.result],
                      ] as const
                    ).map(([label, text]) => (
                      <div key={label}>
                        <dt className="text-primary font-bold">{label}</dt>
                        <dd className="text-muted">{tr(text, locale)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TestimonialsSection {...sectionProps} />
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
