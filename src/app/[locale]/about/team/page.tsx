import { LeaderMessage, OrgChart, Section, TeamGrid } from "@/components/about/blocks";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { getAboutPage, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/team">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/about/team", title: dict.pages.team.title, description: dict.pages.team.subtitle });
}

export default async function TeamPage({ params }: PageProps<"/[locale]/about/team">) {
  const { locale, dict } = await pageContext(params);
  const [about, settings] = await Promise.all([getAboutPage(), getSiteSettings()]);
  return (
    <>
      <PageHeader
        title={dict.pages.team.title}
        subtitle={dict.pages.team.subtitle}
        crumbs={trail(locale, { label: dict.pages.about.title, href: "/about" }, { label: dict.pages.team.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="pt-16 sm:pt-20">
        <div className="container-page max-w-5xl">
          <LeaderMessage
            title={tr(about.leaderMessage.role, locale)}
            name={tr(about.leaderMessage.name, locale)}
            role={tr(settings.name, locale)}
            body={tr(about.leaderMessage.body, locale)}
          />
        </div>
      </section>
      <Section id="team" title={dict.about.teamTitle}>
        <TeamGrid members={about.team} locale={locale} />
      </Section>
      <Section id="structure" tone="surface" title={dict.about.orgTitle}>
        <div className="overflow-x-auto">
          <OrgChart root={about.orgChart} locale={locale} />
        </div>
      </Section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
