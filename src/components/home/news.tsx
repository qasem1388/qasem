import { ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
              <article className="group rounded-brand-lg border-primary/8 hover:shadow-primary/10 relative flex h-full flex-col overflow-hidden border bg-white transition-shadow hover:shadow-xl">
                <div className="relative overflow-hidden">
                  <Image
                    src={post.image}
                    alt=""
                    width={640}
                    height={400}
                    className="aspect-[16/10] h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="bg-secondary text-primary absolute top-4 rounded-full px-3 py-1 text-xs font-semibold ltr:left-4 rtl:right-4">
                    {dict.newsKinds[post.kind]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-muted flex items-center gap-1.5 text-xs">
                    <Calendar className="size-3.5" aria-hidden />
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                  </p>
                  <h3 className="text-primary mt-3 text-lg leading-snug font-bold">
                    <Link
                      href={localizeHref(`/media/news/${post.slug}`, locale)}
                      className="group-hover:text-accent after:absolute after:inset-0 after:content-['']"
                    >
                      {tr(post.title, locale)}
                    </Link>
                  </h3>
                  <p className="text-muted mt-3 line-clamp-3 flex-1 text-sm leading-7">{tr(post.excerpt, locale)}</p>
                  <span className="text-secondary-700 mt-5 inline-flex items-center gap-2 text-sm font-semibold" aria-hidden>
                    {dict.common.readMore}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
