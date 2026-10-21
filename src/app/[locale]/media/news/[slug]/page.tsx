import { staticParams } from "@/lib/static-params";
import { Calendar, CalendarClock, Link2, MapPin } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MediaList } from "@/components/media/media-list";
import { PageHeader } from "@/components/shared/page-header";
import { RichContent } from "@/components/shared/rich-content";
import { SocialIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { getNews, getNewsPost, getSiteSettings } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { formatDate, tr } from "@/lib/utils";

const sectionOf = { news: "news", article: "articles", announcement: "announcements", event: "events" } as const;

export function generateStaticParams() {
  return staticParams(async () => (await getNews()).map((p) => ({ slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/media/news/[slug]">) {
  const { locale } = await pageContext(params);
  const { slug } = await params;
  const post = await getNewsPost(slug);
  if (!post) return {};
  return pageMetadata({
    locale,
    path: `/media/news/${slug}`,
    title: tr(post.title, locale),
    description: tr(post.excerpt, locale),
    image: post.image,
    type: "article",
  });
}

export default async function NewsPostPage({ params }: PageProps<"/[locale]/media/news/[slug]">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("media");
  const { slug } = await params;
  const [post, all, settings] = await Promise.all([getNewsPost(slug), getNews(), getSiteSettings()]);
  if (!post) notFound();

  const title = tr(post.title, locale);
  const url = `${siteUrl()}/${locale}/media/news/${post.slug}`;
  const section = sectionOf[post.kind];
  const related = all
    .filter((p) => p.slug !== post.slug && p.kind === post.kind)
    .concat(all.filter((p) => p.slug !== post.slug && p.kind !== post.kind))
    .slice(0, 3);

  const schema =
    post.kind === "event" && post.eventDate
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: title,
          description: tr(post.excerpt, locale),
          startDate: post.eventDate,
          location: { "@type": "Place", name: tr(post.eventLocation, locale), address: tr(post.eventLocation, locale) },
          organizer: { "@type": "Organization", name: tr(settings.name, locale) },
        }
      : {
          "@context": "https://schema.org",
          "@type": post.kind === "article" ? "Article" : "NewsArticle",
          headline: title,
          description: tr(post.excerpt, locale),
          datePublished: post.publishedAt,
          inLanguage: locale,
          mainEntityOfPage: url,
          publisher: { "@type": "Organization", name: tr(settings.name, locale) },
        };

  const share = [
    {
      label: "X",
      href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: <SocialIcon platform="x" className="size-4" />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: <SocialIcon platform="linkedin" className="size-4" />,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      icon: <WhatsAppIcon className="size-4" />,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <PageHeader
        title={title}
        crumbs={trail(
          locale,
          { label: dict.pages.media.title, href: "/media" },
          { label: dict.pages[section].title, href: `/media/${section}` },
          { label: title },
        )}
        breadcrumbLabel={dict.breadcrumbHome}
      >
        <p className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
          <span className="bg-secondary text-primary rounded-full px-3 py-1 text-xs font-semibold">
            {dict.newsKinds[post.kind]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden />
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          </span>
        </p>
      </PageHeader>

      <article className="container-page max-w-4xl py-14 sm:py-16">
        <Image
          src={post.image}
          alt=""
          width={1200}
          sizes="(min-width: 1280px) 1200px, 100vw"
          height={675}
          priority
          className="rounded-brand-lg aspect-video h-auto w-full object-cover shadow-lg"
        />

        {post.kind === "event" && post.eventDate && (
          <ul className="rounded-brand-lg bg-secondary-50 mt-8 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <li className="flex items-center gap-3">
              <CalendarClock className="text-secondary-700 size-6" aria-hidden />
              <div>
                <p className="text-muted text-sm">{dict.media.eventDate}</p>
                <p className="text-primary font-bold">
                  <time dateTime={post.eventDate}>{formatDate(post.eventDate, locale)}</time>
                </p>
              </div>
            </li>
            {post.eventLocation && (
              <li className="flex items-center gap-3">
                <MapPin className="text-secondary-700 size-6" aria-hidden />
                <div>
                  <p className="text-muted text-sm">{dict.media.eventLocation}</p>
                  <p className="text-primary font-bold">{tr(post.eventLocation, locale)}</p>
                </div>
              </li>
            )}
          </ul>
        )}

        <p className="text-primary mt-10 text-lg leading-9 font-medium">{tr(post.excerpt, locale)}</p>
        <div className="mt-6">
          <RichContent value={tr(post.body, locale)} />
        </div>

        <div className="border-primary/8 mt-12 flex flex-wrap items-center gap-3 border-t pt-6">
          <span className="text-primary inline-flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4" aria-hidden />
            {dict.media.share}
          </span>
          {share.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${dict.media.share}: ${s.label}`}
              className="border-primary/15 text-primary hover:border-secondary hover:bg-secondary inline-flex size-10 items-center justify-center rounded-full border transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-posts" className="bg-surface py-14 sm:py-16">
          <div className="container-page">
            <h2 id="related-posts" className="text-primary mb-8 text-2xl font-bold sm:text-3xl">
              {dict.media.related}
            </h2>
            <MediaList posts={related} locale={locale} dict={dict} />
          </div>
        </section>
      )}
    </>
  );
}
