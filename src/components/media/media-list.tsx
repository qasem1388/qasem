import { NewsCard } from "@/components/cards/news-card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatDate, localizeHref, tr } from "@/lib/utils";
import type { NewsPost } from "@/types/content";

export function MediaList({ posts, locale, dict }: { posts: NewsPost[]; locale: Locale; dict: Dictionary }) {
  if (!posts.length) {
    return <p className="rounded-brand-lg bg-surface text-muted p-10 text-center">{dict.media.empty}</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, i) => (
        <li key={post.slug} data-reveal style={{ "--reveal-delay": `${(i % 3) * 80}ms` } as React.CSSProperties}>
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
  );
}
