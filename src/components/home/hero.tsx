import { ArrowRight, CircleCheck } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { localizeHref, tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export function HeroSection({ locale, home }: SectionProps) {
  const { hero, stats } = home;
  const badge = stats.items[2] ?? stats.items[0];

  return (
    <section aria-labelledby="hero-title" className="bg-primary relative isolate overflow-hidden text-white">
      <div className="bg-pattern absolute inset-0 -z-10 opacity-50" aria-hidden />
      <div
        className="bg-accent/40 absolute -top-40 -z-10 size-[36rem] rounded-full blur-3xl ltr:-right-40 rtl:-left-40"
        aria-hidden
      />
      <div
        className="bg-secondary/15 absolute -bottom-48 -z-10 size-[28rem] rounded-full blur-3xl ltr:-left-32 rtl:-right-32"
        aria-hidden
      />

      <div className="container-page grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="animate-fade-up">
          <p className="border-secondary/30 bg-secondary/10 text-secondary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <span className="bg-secondary size-1.5 rounded-full" aria-hidden />
            {tr(hero.eyebrow, locale)}
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-[2rem] leading-[1.3] font-bold text-balance sm:text-5xl sm:leading-[1.25] lg:text-[3.4rem]"
          >
            {tr(hero.title, locale)}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg">{tr(hero.subtitle, locale)}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hero.ctas.map((cta, i) => (
              <ButtonLink
                key={cta.href}
                href={localizeHref(cta.href, locale)}
                variant={cta.variant === "secondary" ? "light" : cta.variant}
                size="lg"
              >
                {tr(cta.label, locale)}
                {i === 0 && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}
              </ButtonLink>
            ))}
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-3 text-sm text-white/80 sm:grid-cols-3">
            {hero.highlights.map((h) => (
              <li key={h.en} className="flex items-center gap-2">
                <CircleCheck className="text-secondary size-4 shrink-0" aria-hidden />
                {tr(h, locale)}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-fade-up relative [animation-delay:150ms]">
          <div className="absolute -inset-3 rounded-[calc(var(--brand-radius)*2.2)] border border-white/10" aria-hidden />
          <div className="relative overflow-hidden rounded-[calc(var(--brand-radius)*2)] shadow-2xl ring-1 shadow-black/40 ring-white/10">
            <Image
              src={hero.image}
              alt=""
              width={960}
              height={760}
              priority
              className="aspect-[6/5] h-auto w-full object-cover"
            />
          </div>
          {badge && (
            <div className="rounded-brand text-primary absolute -bottom-6 flex items-center gap-3 bg-white p-4 shadow-xl ltr:left-4 sm:ltr:-left-6 rtl:right-4 sm:rtl:-right-6">
              <span className="rounded-brand bg-secondary-50 text-secondary-700 inline-flex size-12 items-center justify-center">
                <Icon name={badge.icon} className="size-6" />
              </span>
              <span>
                <span className="block text-2xl leading-none font-bold" dir="ltr">
                  {badge.value}
                  {badge.suffix}
                </span>
                <span className="text-muted mt-1 block text-sm">{tr(badge.label, locale)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
