import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { localizeHref, tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export function AboutSection({ locale, home }: SectionProps) {
  const { about } = home;
  return (
    <section id="about" aria-labelledby="about-title" className="py-20 sm:py-24 lg:py-28">
      <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="relative order-2 lg:order-1" data-reveal>
          <div className="rounded-brand-lg bg-secondary-100 absolute -top-4 size-28 ltr:-left-4 rtl:-right-4" aria-hidden />
          <div className="rounded-brand-lg shadow-primary/10 relative overflow-hidden shadow-xl">
            <Image
              src={about.image}
              alt=""
              width={800}
              sizes="(min-width: 1024px) 50vw, 100vw"
              height={640}
              className="aspect-[5/4] h-auto w-full object-cover"
            />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <SectionHeading id="about-title" align="start" eyebrow={tr(about.eyebrow, locale)} title={tr(about.title, locale)} />
          <p className="text-muted mt-6 leading-8" data-reveal>
            {tr(about.body, locale)}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" data-reveal>
            {about.points.map((p) => (
              <li key={p.en} className="text-primary flex items-start gap-3 text-[0.95rem] font-medium">
                <span className="bg-secondary text-primary mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                {tr(p, locale)}
              </li>
            ))}
          </ul>
          <div className="mt-10" data-reveal>
            <ButtonLink href={localizeHref(about.cta.href, locale)} variant="secondary">
              {tr(about.cta.label, locale)}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
