import { MediaTabs } from "@/components/media/media-tabs";
import { Gallery } from "@/components/shared/gallery";
import { PageHeader } from "@/components/shared/page-header";
import { getPhotos } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/media/photos">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/media/photos", title: dict.pages.photos.title, description: dict.pages.photos.subtitle });
}

export default async function PhotosPage({ params }: PageProps<"/[locale]/media/photos">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("media");
  const photos = await getPhotos();
  return (
    <>
      <PageHeader
        title={dict.pages.photos.title}
        subtitle={dict.pages.photos.subtitle}
        crumbs={trail(locale, { label: dict.pages.media.title, href: "/media" }, { label: dict.pages.photos.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <MediaTabs active="photos" locale={locale} dict={dict} />
      <section className="py-14 sm:py-16">
        <div className="container-page">
          <Gallery
            items={photos.map((p) => ({ src: p.src, caption: tr(p.caption, locale), meta: tr(p.album, locale) }))}
            labels={{ close: dict.media.close, prev: dict.media.prev, next: dict.media.next, open: dict.media.open }}
          />
        </div>
      </section>
    </>
  );
}
