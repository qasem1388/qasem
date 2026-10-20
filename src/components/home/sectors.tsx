import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSectors } from "@/lib/content";
import { localizeHref, tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function SectorsSection({ locale, home }: SectionProps) {
  const sectors = await getSectors();
  const { sectors: copy } = home;
  return (
    <section id="sectors" aria-labelledby="sectors-title" className="py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="sectors-title"
          eyebrow={tr(copy.eyebrow, locale)}
          title={tr(copy.title, locale)}
          subtitle={tr(copy.subtitle, locale)}
        />
        <ul className="mt-14 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {sectors.map((s, i) => (
            <li key={s.id} data-reveal style={{ "--reveal-delay": `${(i % 4) * 70}ms` } as React.CSSProperties}>
              <Link
                href={localizeHref(`/sectors/${s.slug}`, locale)}
                className="group rounded-brand-lg border-primary/8 hover:border-secondary hover:shadow-secondary/10 flex h-full flex-col border bg-white p-6 transition-all duration-300 hover:shadow-lg"
              >
                <span className="rounded-brand bg-primary-50 text-primary group-hover:bg-primary group-hover:text-secondary inline-flex size-12 items-center justify-center transition-colors">
                  <Icon name={s.icon} className="size-6" />
                </span>
                <h3 className="text-primary mt-5 font-bold">{tr(s.name, locale)}</h3>
                <p className="text-muted mt-2 text-sm leading-6">{tr(s.summary, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
