import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export function WhyUsSection({ locale, home }: SectionProps) {
  const { whyUs } = home;
  return (
    <section
      aria-labelledby="why-title"
      className="bg-primary relative isolate overflow-hidden py-20 text-white sm:py-24 lg:py-28"
    >
      <div className="bg-pattern absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading
            id="why-title"
            tone="light"
            align="start"
            eyebrow={tr(whyUs.eyebrow, locale)}
            title={tr(whyUs.title, locale)}
          />
          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {whyUs.items.map((item, i) => (
              <li
                key={item.title.en}
                data-reveal
                style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
                className="rounded-brand-lg hover:border-secondary/40 border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]"
              >
                <span className="rounded-brand bg-secondary text-primary inline-flex size-12 items-center justify-center">
                  <Icon name={item.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{tr(item.title, locale)}</h3>
                <p className="mt-2 text-sm leading-7 text-white/70">{tr(item.body, locale)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative" data-reveal>
          <div className="border-secondary/30 absolute -inset-4 rounded-[calc(var(--brand-radius)*2.4)] border" aria-hidden />
          <div className="relative overflow-hidden rounded-[calc(var(--brand-radius)*2)]">
            <Image src={whyUs.image} alt="" width={800} height={880} className="aspect-[10/11] h-auto w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
