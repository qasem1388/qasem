import { MediaTabs } from "@/components/media/media-tabs";
import { VideoCard } from "@/components/media/video-card";
import { PageHeader } from "@/components/shared/page-header";
import { getSiteSettings, getVideos } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/media/videos">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/media/videos", title: dict.pages.videos.title, description: dict.pages.videos.subtitle });
}

export default async function VideosPage({ params }: PageProps<"/[locale]/media/videos">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("media");
  const [videos, settings] = await Promise.all([getVideos(), getSiteSettings()]);
  const channel = settings.social.find((s) => s.platform === "youtube")?.url;
  return (
    <>
      <PageHeader
        title={dict.pages.videos.title}
        subtitle={dict.pages.videos.subtitle}
        crumbs={trail(locale, { label: dict.pages.media.title, href: "/media" }, { label: dict.pages.videos.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <MediaTabs active="videos" locale={locale} dict={dict} />
      <section className="py-14 sm:py-16">
        <div className="container-page">
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {videos.map((v) => (
              <li key={v.id} data-reveal>
                <VideoCard
                  title={tr(v.title, locale)}
                  poster={v.poster}
                  youtubeId={v.youtubeId}
                  duration={v.duration}
                  channelUrl={channel}
                  labels={{ play: dict.media.play, watchOnChannel: dict.media.watchOnChannel }}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
