import { MenuEditor, type LinkOption } from "@/components/admin/menu-editor";
import { PageTitle } from "@/components/admin/ui";
import { getDictionary } from "@/i18n/dictionaries";
import { db } from "@/lib/db";
import { getServices, getSiteSettings } from "@/lib/content";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "القوائم" };

export default async function MenusPage() {
  await requireUser("settings.manage");
  const [settings, services, pages] = await Promise.all([
    getSiteSettings(),
    getServices(),
    db.page.findMany({ where: { status: "PUBLISHED" }, orderBy: { updatedAt: "desc" } }),
  ]);
  const p = getDictionary("ar").pages;
  const options: LinkOption[] = [
    { href: "/", label: "الرئيسية" },
    ...(
      [
        ["about", "/about"],
        ["team", "/about/team"],
        ["certifications", "/about/certifications"],
        ["services", "/services"],
        ["projects", "/projects"],
        ["sectors", "/sectors"],
        ["media", "/media"],
        ["news", "/media/news"],
        ["articles", "/media/articles"],
        ["announcements", "/media/announcements"],
        ["events", "/media/events"],
        ["photos", "/media/photos"],
        ["videos", "/media/videos"],
        ["clients", "/clients"],
        ["careers", "/careers"],
        ["quote", "/quote"],
        ["contact", "/contact"],
        ["faq", "/faq"],
        ["sitemap", "/sitemap"],
      ] as const
    ).map(([k, href]) => ({ href, label: p[k].title })),
    ...pages.map((pg) => ({ href: `/${pg.slug}`, label: `صفحة: ${(pg.title as Localized).ar}` })),
    ...services.map((s) => ({ href: `/services/${s.slug}`, label: `خدمة: ${s.title.ar}` })),
  ];
  return (
    <>
      <PageTitle
        title="القوائم"
        description="روابط القائمة الرئيسية في أعلى الموقع وترتيبها والقوائم المنسدلة. روابط التذييل تُدار من صفحة «التذييل»."
      />
      <MenuEditor initial={{ navigation: settings.navigation, headerCta: settings.headerCta }} options={options} />
    </>
  );
}
