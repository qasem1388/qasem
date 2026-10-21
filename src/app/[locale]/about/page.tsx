import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import {
  CertificationsGrid,
  IconCardGrid,
  LeaderMessage,
  OrgChart,
  Section,
  TeamGrid,
  Timeline,
} from "@/components/about/blocks";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { Prose } from "@/components/shared/prose";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAboutPage, getHomePage, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/about", title: dict.pages.about.title, description: dict.pages.about.subtitle });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale, dict } = await pageContext(params);
  const [about, home, settings] = await Promise.all([getAboutPage(), getHomePage(), getSiteSettings()]);
  const t = dict.about;

  return (
    <>
      <PageHeader
        title={dict.pages.about.title}
        subtitle={dict.pages.about.subtitle}
        crumbs={trail(locale, { label: dict.pages.about.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />

      <section id="overview" aria-labelledby="overview-title" className="py-16 sm:py-20">
        <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading id="overview-title" align="start" eyebrow={t.overview} title={tr(settings.name, locale)} />
            <div className="mt-6" data-reveal>
              <Prose text={tr(about.intro, locale)} />
            </div>
          </div>
          <div className="relative" data-reveal>
            <div className="rounded-brand-lg bg-secondary-100 absolute -bottom-4 size-28 ltr:-right-4 rtl:-left-4" aria-hidden />
            <Image
              src={about.image}
              alt=""
              width={800}
              height={640}
              className="rounded-brand-lg relative aspect-[5/4] h-auto w-full object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      <Section
        id="vision"
        tone="surface"
        eyebrow={tr(home.visionMission.eyebrow, locale)}
        title={tr(home.visionMission.title, locale)}
      >
        <IconCardGrid items={home.visionMission.items.slice(0, 2)} locale={locale} columns={2} />
      </Section>

      <Section id="values" title={t.valuesTitle}>
        <IconCardGrid items={about.values} locale={locale} />
      </Section>

      <Section id="goals" tone="surface" title={t.goalsTitle}>
        <ul className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {about.goals.map((g, i) => (
            <li key={g.en} className="rounded-brand-lg flex items-start gap-4 bg-white p-6" data-reveal>
              <span
                className="bg-secondary text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full font-bold"
                dir="ltr"
              >
                {i + 1}
              </span>
              <span className="text-primary pt-1 leading-7 font-medium">{tr(g, locale)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="history" title={t.historyTitle}>
        <Timeline items={about.history} locale={locale} />
      </Section>

      <section id="leader" aria-label={t.leaderTitle} className="pb-16 sm:pb-20">
        <div className="container-page max-w-5xl">
          <LeaderMessage
            title={tr(about.leaderMessage.role, locale)}
            name={tr(about.leaderMessage.name, locale)}
            role={tr(settings.name, locale)}
            body={tr(about.leaderMessage.body, locale)}
          />
        </div>
      </section>

      <Section id="team" tone="surface" title={t.teamTitle}>
        <TeamGrid members={about.team.slice(0, 3)} locale={locale} />
        <div className="mt-10 text-center">
          <ButtonLink href={localizeHref("/about/team", locale)} variant="outline">
            {t.viewTeam}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </ButtonLink>
        </div>
      </Section>

      <Section id="structure" title={t.orgTitle}>
        <div className="overflow-x-auto">
          <OrgChart root={about.orgChart} locale={locale} />
        </div>
      </Section>

      <Section id="certifications" tone="surface" title={t.certsTitle}>
        <CertificationsGrid items={about.certifications.slice(0, 3)} locale={locale} issuedBy={t.issuedBy} />
        <div className="mt-10 text-center">
          <ButtonLink href={localizeHref("/about/certifications", locale)} variant="outline">
            <Check className="size-4" aria-hidden />
            {t.viewCerts}
          </ButtonLink>
        </div>
      </Section>

      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
