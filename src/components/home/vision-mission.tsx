import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export function VisionMissionSection({ locale, home }: SectionProps) {
  const { visionMission } = home;
  return (
    <section aria-labelledby="vision-title" className="bg-surface py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading id="vision-title" eyebrow={tr(visionMission.eyebrow, locale)} title={tr(visionMission.title, locale)} />
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {visionMission.items.map((item, i) => (
            <article
              key={item.title.en}
              data-reveal
              style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}
              className="group rounded-brand-lg border-primary/5 hover:shadow-primary/10 relative overflow-hidden border bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <span
                className="bg-secondary absolute inset-x-0 top-0 h-1 scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ltr:origin-left rtl:origin-right"
                aria-hidden
              />
              <span className="rounded-brand bg-primary text-secondary group-hover:bg-secondary group-hover:text-primary inline-flex size-14 items-center justify-center transition-colors">
                <Icon name={item.icon} className="size-7" />
              </span>
              <h3 className="text-primary mt-6 text-xl font-bold">{tr(item.title, locale)}</h3>
              <p className="text-muted mt-3 leading-7">{tr(item.body, locale)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
