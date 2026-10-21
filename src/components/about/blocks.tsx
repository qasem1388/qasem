import { Quote } from "lucide-react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Prose } from "@/components/shared/prose";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Locale } from "@/i18n/config";
import { tr } from "@/lib/utils";
import type { Certification, Localized, Milestone, OrgUnit, TeamMember } from "@/types/content";

type IconItem = { icon: IconName; title: Localized; body: Localized };

export function IconCardGrid({ items, locale, columns = 3 }: { items: IconItem[]; locale: Locale; columns?: 2 | 3 | 4 }) {
  return (
    <ul
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : columns === 2 ? "mx-auto max-w-4xl" : "lg:grid-cols-3"}`}
    >
      {items.map((v, i) => (
        <li
          key={v.title.en}
          data-reveal
          style={{ "--reveal-delay": `${(i % columns) * 80}ms` } as React.CSSProperties}
          className="rounded-brand-lg border-primary/8 hover:shadow-primary/5 border bg-white p-7 transition-shadow hover:shadow-lg"
        >
          <span className="rounded-brand bg-primary text-secondary inline-flex size-12 items-center justify-center">
            <Icon name={v.icon} className="size-6" />
          </span>
          <h3 className="text-primary mt-5 text-lg font-bold">{tr(v.title, locale)}</h3>
          <p className="text-muted mt-2 leading-7">{tr(v.body, locale)}</p>
        </li>
      ))}
    </ul>
  );
}

export function Timeline({ items, locale }: { items: Milestone[]; locale: Locale }) {
  return (
    <ol className="border-secondary/40 relative mx-auto max-w-3xl border-s-2 ps-8">
      {items.map((m) => (
        <li key={m.year} className="relative pb-10 last:pb-0" data-reveal>
          <span
            className="bg-secondary absolute -start-[2.55rem] top-1 inline-flex size-5 items-center justify-center rounded-full border-4 border-white shadow"
            aria-hidden
          />
          <p className="text-secondary-700 text-sm font-bold">
            <span dir="ltr">{m.year}</span>
          </p>
          <h3 className="text-primary mt-1 text-lg font-bold">{tr(m.title, locale)}</h3>
          <p className="text-muted mt-1.5 leading-7">{tr(m.body, locale)}</p>
        </li>
      ))}
    </ol>
  );
}

export function LeaderMessage({ title, name, role, body }: { title: string; name: string; role: string; body: string }) {
  return (
    <figure className="rounded-brand-lg bg-primary relative overflow-hidden p-8 text-white sm:p-12" data-reveal>
      <div className="bg-pattern absolute inset-0 opacity-30" aria-hidden />
      <Quote className="text-secondary/20 absolute top-8 size-16 ltr:right-8 rtl:left-8 rtl:-scale-x-100" aria-hidden />
      <div className="relative">
        <p className="text-secondary text-sm font-semibold">{title}</p>
        <blockquote className="mt-5">
          <Prose text={body} className="text-white/85 [&_p]:text-white/85" />
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-4 border-t border-white/10 pt-6">
          <span
            className="bg-secondary text-primary inline-flex size-12 items-center justify-center rounded-full text-lg font-bold"
            aria-hidden
          >
            {name.charAt(0)}
          </span>
          <span>
            <span className="block font-bold">{name}</span>
            <span className="block text-sm text-white/60">{role}</span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

export function TeamGrid({ members, locale }: { members: TeamMember[]; locale: Locale }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m, i) => {
        const name = tr(m.name, locale);
        return (
          <li
            key={m.id}
            data-reveal
            style={{ "--reveal-delay": `${(i % 3) * 80}ms` } as React.CSSProperties}
            className="group rounded-brand-lg border-primary/8 overflow-hidden border bg-white text-center"
          >
            <div className="from-primary-100 to-primary-50 relative flex h-40 items-end justify-center bg-gradient-to-b">
              <span
                className="bg-primary text-secondary mb-[-2.5rem] inline-flex size-24 items-center justify-center rounded-full border-4 border-white text-3xl font-bold shadow-lg transition-transform group-hover:scale-105"
                aria-hidden
              >
                {name.replace(/^(م\.|أ\.|Eng\.|Mr\.|Ms\.)\s*/, "").charAt(0)}
              </span>
            </div>
            <div className="px-6 pt-14 pb-7">
              <h3 className="text-primary text-lg font-bold">{name}</h3>
              <p className="text-secondary-700 mt-1 text-sm font-semibold">{tr(m.role, locale)}</p>
              <p className="text-muted mt-3 text-sm leading-6">{tr(m.bio, locale)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OrgNode({ unit, locale, depth }: { unit: OrgUnit; locale: Locale; depth: number }) {
  const tone =
    depth === 0
      ? "bg-primary text-white"
      : depth === 1
        ? "bg-secondary text-primary"
        : depth === 2
          ? "bg-white text-primary border border-primary/15"
          : "bg-surface text-ink/80";
  return (
    <li className="flex flex-col items-center">
      <span className={`rounded-brand px-5 py-3 text-center text-sm font-semibold shadow-sm ${tone}`}>
        {tr(unit.title, locale)}
      </span>
      {unit.children && (
        <>
          <span className="bg-primary/20 h-6 w-px" aria-hidden />
          <ul className="border-primary/20 flex flex-wrap justify-center gap-4 border-t pt-6">
            {unit.children.map((c) => (
              <OrgNode key={c.id} unit={c} locale={locale} depth={depth + 1} />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

export function OrgChart({ root, locale }: { root: OrgUnit; locale: Locale }) {
  return (
    <div className="rounded-brand-lg border-primary/8 border bg-white p-6 sm:p-10" data-reveal>
      <ul className="flex justify-center">
        <OrgNode unit={root} locale={locale} depth={0} />
      </ul>
    </div>
  );
}

export function CertificationsGrid({ items, locale, issuedBy }: { items: Certification[]; locale: Locale; issuedBy: string }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-brand-lg border-primary/8 flex gap-4 border bg-white p-6" data-reveal>
          <span className="border-secondary/50 bg-secondary-50 text-secondary-700 inline-flex size-14 shrink-0 items-center justify-center rounded-full border-2">
            <Icon name={c.icon} className="size-7" />
          </span>
          <div>
            <h3 className="text-primary font-bold">{tr(c.title, locale)}</h3>
            <p className="text-muted mt-1.5 text-sm">
              {issuedBy}: {tr(c.issuer, locale)}
            </p>
            <p className="text-secondary-700 mt-1 text-sm font-semibold">
              <span dir="ltr">{c.year}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Section({
  id,
  title,
  eyebrow,
  subtitle,
  tone = "white",
  children,
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  tone?: "white" | "surface";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={tone === "surface" ? "bg-surface py-16 sm:py-20" : "py-16 sm:py-20"}
    >
      <div className="container-page">
        <SectionHeading id={id ? `${id}-title` : undefined} eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
