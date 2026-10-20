import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
              <article className="group rounded-brand-lg border-primary/8 hover:shadow-primary/10 relative flex h-full flex-col overflow-hidden border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-2xl">
                <div
                  className="bg-primary absolute -top-16 size-40 scale-0 rounded-full transition-transform duration-500 ease-out group-hover:scale-[5] ltr:-right-16 rtl:-left-16"
                  aria-hidden
                />
                <span className="rounded-brand bg-secondary-50 text-secondary-700 group-hover:bg-secondary group-hover:text-primary relative inline-flex size-14 items-center justify-center transition-colors duration-300">
                  <Icon name={s.icon} className="size-7" />
                </span>
                <h3 className="text-primary relative mt-6 text-xl font-bold transition-colors duration-300 group-hover:text-white">
                  {tr(s.title, locale)}
                </h3>
                <p className="text-muted relative mt-3 flex-1 leading-7 transition-colors duration-300 group-hover:text-white/75">
                  {tr(s.summary, locale)}
                </p>
                <Link
                  href={localizeHref(`/services/${s.slug}`, locale)}
                  className="text-primary group-hover:text-secondary relative mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-300 after:absolute after:inset-0 after:content-['']"
                >
                  {dict.common.readMore}
                  <span className="sr-only">: {tr(s.title, locale)}</span>
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                    aria-hidden
                  />
                </Link>
              </article>
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
