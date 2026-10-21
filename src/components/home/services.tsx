import { ServiceCard } from "@/components/cards/service-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getServices } from "@/lib/content";
import { localizeHref, tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function ServicesSection({ locale, dict, home }: SectionProps) {
  const services = await getServices({ featured: true });
  const { services: copy } = home;

  return (
    <section id="services" aria-labelledby="services-title" className="py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="services-title"
          eyebrow={tr(copy.eyebrow, locale)}
          title={tr(copy.title, locale)}
          subtitle={tr(copy.subtitle, locale)}
        />
        <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <li key={s.slug} data-reveal style={{ "--reveal-delay": `${(i % 3) * 90}ms` } as React.CSSProperties}>
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
        <div className="mt-12 text-center" data-reveal>
          <ButtonLink href={localizeHref(copy.cta.href, locale)} variant="outline">
            {tr(copy.cta.label, locale)}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
