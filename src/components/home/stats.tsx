import { Icon } from "@/components/ui/icon";
import { tr } from "@/lib/utils";
import { Counter } from "./counter";
import type { SectionProps } from "./types";

export function StatsSection({ locale, dict, home }: SectionProps) {
  return (
    <section aria-labelledby="stats-title" className="bg-primary relative isolate overflow-hidden py-16 text-white sm:py-20">
      <div className="bg-pattern absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div
        className="from-accent/40 absolute inset-y-0 -z-10 w-1/2 bg-gradient-to-l to-transparent ltr:right-0 rtl:left-0 rtl:bg-gradient-to-r"
        aria-hidden
      />
      <div className="container-page">
        <h2 id="stats-title" className="sr-only">
          {dict.stats.title}
        </h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {home.stats.items.map((s, i) => (
            <li
              key={s.label.en}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
              className="flex flex-col items-center text-center lg:border-white/10 lg:not-last:border-e"
            >
              <span className="border-secondary/30 bg-secondary/10 text-secondary mb-4 inline-flex size-14 items-center justify-center rounded-full border">
                <Icon name={s.icon} className="size-6" />
              </span>
              <span className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </span>
              <span className="mt-2 text-sm text-white/70 sm:text-base">{tr(s.label, locale)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
