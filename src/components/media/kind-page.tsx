import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { getNews } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import type { NewsKind } from "@/types/content";
import { MediaList } from "./media-list";
import { MediaTabs } from "./media-tabs";

type Section = "news" | "articles" | "announcements" | "events";

const kindOf: Record<Section, NewsKind> = { news: "news", articles: "article", announcements: "announcement", events: "event" };

export async function kindMetadata(params: Promise<{ locale: string }>, section: Section): Promise<Metadata> {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({
    locale,
    path: `/media/${section}`,
    title: dict.pages[section].title,
    description: dict.pages[section].subtitle,
  });
}

/** Listing page for one kind of media-center post. */
export async function KindPage({ params, section }: { params: Promise<{ locale: string }>; section: Section }) {
  const { locale, dict } = await pageContext(params);
  const posts = await getNews(kindOf[section]);
  return (
    <>
      <PageHeader
        title={dict.pages[section].title}
        subtitle={dict.pages[section].subtitle}
        crumbs={trail(locale, { label: dict.pages.media.title, href: "/media" }, { label: dict.pages[section].title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <MediaTabs active={section} locale={locale} dict={dict} />
      <section className="py-14 sm:py-16">
        <div className="container-page">
          <MediaList posts={posts} locale={locale} dict={dict} />
        </div>
      </section>
    </>
  );
}
