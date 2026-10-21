import { ArrowRight } from "lucide-react";
import { NewsCard } from "@/components/cards/news-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLatestNews } from "@/lib/content";
import { formatDate, localizeHref, tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function NewsSection({ locale, dict, home }: SectionProps) {
  const posts = await getLatestNews(3);
  const { news: copy } = home;
  return (
    <section id="news" aria-labelledby="news-title" className="py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading id="news-title" align="start" eyebrow={tr(copy.eyebrow, locale)} title={tr(copy.title, locale)} />
          <ButtonLink href={localizeHref(copy.cta.href, locale)} variant="outline" className="shrink-0">
            {tr(copy.cta.label, locale)}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </ButtonLink>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.slug} data-reveal style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}>
              <NewsCard
                href={localizeHref(`/media/news/${post.slug}`, locale)}
                image={post.image}
                kindLabel={dict.newsKinds[post.kind]}
                date={post.publishedAt}
                dateLabel={formatDate(post.publishedAt, locale)}
                title={tr(post.title, locale)}
                excerpt={tr(post.excerpt, locale)}
                readMore={dict.common.readMore}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
