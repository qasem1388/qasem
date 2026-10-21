import { ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MediaList } from "@/components/media/media-list";
import { MediaTabs } from "@/components/media/media-tabs";
import { Gallery } from "@/components/shared/gallery";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getNews, getPhotos } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { formatDate, localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/media">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/media", title: dict.pages.media.title, description: dict.pages.media.subtitle });
}

export default async function MediaPage({ params }: PageProps<"/[locale]/media">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("media");
  const [posts, photos] = await Promise.all([getNews(), getPhotos()]);
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHeader
        title={dict.pages.media.title}
        subtitle={dict.pages.media.subtitle}
        crumbs={trail(locale, { label: dict.pages.media.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <MediaTabs active="media" locale={locale} dict={dict} />

      {featured && (
        <section className="pt-14 sm:pt-16">
          <div className="container-page">
            <article className="group rounded-brand-lg bg-primary relative grid grid-cols-1 overflow-hidden text-white lg:grid-cols-2">
              <Image
                src={featured.image}
                alt=""
                width={960}
                sizes="(min-width: 1024px) 50vw, 100vw"
                height={600}
                priority
                className="aspect-[16/10] h-full w-full object-cover"
              />
              <div className="flex flex-col justify-center p-8 sm:p-12">
                <span className="bg-secondary text-primary w-fit rounded-full px-3 py-1 text-xs font-semibold">
                  {dict.newsKinds[featured.kind]}
                </span>
                <h2 className="mt-5 text-2xl leading-snug font-bold sm:text-3xl">
                  <Link
                    href={localizeHref(`/media/news/${featured.slug}`, locale)}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {tr(featured.title, locale)}
                  </Link>
                </h2>
                <p className="mt-4 leading-8 text-white/75">{tr(featured.excerpt, locale)}</p>
                <p className="mt-6 flex items-center gap-2 text-sm text-white/60">
                  <Calendar className="size-4" aria-hidden />
                  <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt, locale)}</time>
                </p>
                <span className="text-secondary mt-6 inline-flex items-center gap-2 font-semibold" aria-hidden>
                  {dict.common.readMore}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="py-14 sm:py-16">
        <div className="container-page">
          <MediaList posts={rest.slice(0, 6)} locale={locale} dict={dict} />
        </div>
      </section>

      <section aria-labelledby="photos-preview" className="bg-surface py-14 sm:py-16">
        <div className="container-page">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="photos-preview" className="text-primary text-2xl font-bold sm:text-3xl">
              {dict.pages.photos.title}
            </h2>
            <ButtonLink href={localizeHref("/media/photos", locale)} variant="outline" size="sm">
              {dict.media.all}
            </ButtonLink>
          </div>
          <Gallery
            items={photos.slice(0, 3).map((p) => ({ src: p.src, caption: tr(p.caption, locale), meta: tr(p.album, locale) }))}
            labels={{ close: dict.media.close, prev: dict.media.prev, next: dict.media.next, open: dict.media.open }}
          />
        </div>
      </section>
    </>
  );
}
