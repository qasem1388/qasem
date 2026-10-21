import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { getJobs, getNews, getProjects, getSectors, getServices } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/sitemap">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/sitemap", title: dict.pages.sitemap.title, description: dict.pages.sitemap.subtitle });
}

export default async function SitemapPage({ params }: PageProps<"/[locale]/sitemap">) {
  const { locale, dict } = await pageContext(params);
  const [services, projects, sectors, news, jobs] = await Promise.all([
    getServices(),
    getProjects(),
    getSectors(),
    getNews(),
    getJobs(),
  ]);
  const p = dict.pages;

  const groups: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: dict.sitemap.pages,
      links: [
        { label: dict.breadcrumbHome, href: "/" },
        { label: p.about.title, href: "/about" },
        { label: p.team.title, href: "/about/team" },
        { label: p.certifications.title, href: "/about/certifications" },
        { label: p.services.title, href: "/services" },
        { label: p.projects.title, href: "/projects" },
        { label: p.sectors.title, href: "/sectors" },
        { label: p.clients.title, href: "/clients" },
        { label: p.careers.title, href: "/careers" },
        { label: p.quote.title, href: "/quote" },
        { label: p.contact.title, href: "/contact" },
      ],
    },
    { title: dict.sitemap.services, links: services.map((s) => ({ label: tr(s.title, locale), href: `/services/${s.slug}` })) },
    { title: dict.sitemap.projects, links: projects.map((x) => ({ label: tr(x.title, locale), href: `/projects/${x.slug}` })) },
    { title: dict.sitemap.sectors, links: sectors.map((s) => ({ label: tr(s.name, locale), href: `/sectors/${s.slug}` })) },
    {
      title: dict.sitemap.media,
      links: [
        { label: p.media.title, href: "/media" },
        { label: p.news.title, href: "/media/news" },
        { label: p.articles.title, href: "/media/articles" },
        { label: p.announcements.title, href: "/media/announcements" },
        { label: p.events.title, href: "/media/events" },
        { label: p.photos.title, href: "/media/photos" },
        { label: p.videos.title, href: "/media/videos" },
        ...news.map((n) => ({ label: tr(n.title, locale), href: `/media/news/${n.slug}` })),
      ],
    },
    { title: dict.sitemap.careers, links: jobs.map((j) => ({ label: tr(j.title, locale), href: `/careers/${j.slug}` })) },
    {
      title: dict.sitemap.legal,
      links: [
        { label: p.faq.title, href: "/faq" },
        { label: dict.sitemapLinks.privacy, href: "/privacy" },
        { label: dict.sitemapLinks.terms, href: "/terms" },
        { label: dict.sitemapLinks.cookies, href: "/cookies" },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title={p.sitemap.title}
        subtitle={p.sitemap.subtitle}
        crumbs={trail(locale, { label: p.sitemap.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="py-14 sm:py-16">
        <div className="container-page columns-1 gap-8 sm:columns-2 lg:columns-3">
          {groups.map((g) => (
            <nav
              key={g.title}
              aria-label={g.title}
              className="rounded-brand-lg border-primary/8 mb-8 break-inside-avoid border bg-white p-6"
            >
              <h2 className="text-primary mb-4 text-lg font-bold">{g.title}</h2>
              <ul className="space-y-2.5 text-sm">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={localizeHref(l.href, locale)} className="text-ink/80 hover:text-secondary-700 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </section>
    </>
  );
}
