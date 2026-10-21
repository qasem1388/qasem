import type { MetadataRoute } from "next";
import { isPathEnabled } from "@/content/defaults/pages";
import { locales } from "@/i18n/config";
import { getSiteSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

/** Regenerated hourly and whenever content changes (see revalidateSite). */
export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/about",
  "/about/team",
  "/about/certifications",
  "/services",
  "/projects",
  "/sectors",
  "/media",
  "/media/news",
  "/media/articles",
  "/media/announcements",
  "/media/events",
  "/media/photos",
  "/media/videos",
  "/clients",
  "/careers",
  "/quote",
  "/contact",
  "/faq",
  "/sitemap",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  if (settings.seo.indexable === false) return [];
  const base = siteUrl();
  const now = new Date();

  const [services, projects, sectors, news, jobs, pages] = await Promise.all([
    db.service.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.project.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.sector.findMany({ where: { published: true }, select: { slug: true } }),
    db.newsPost.findMany({ where: { published: true, publishedAt: { lte: now } }, select: { slug: true, updatedAt: true } }),
    db.job.findMany({ where: { open: true }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

  const entries: { path: string; lastModified?: Date; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    ...STATIC_PATHS.map((path) => ({
      path,
      priority: path === "/" ? 1 : 0.7,
      changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    })),
    ...services.map((s) => ({
      path: `/services/${s.slug}`,
      lastModified: s.updatedAt,
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...projects.map((p) => ({
      path: `/projects/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    ...sectors.map((s) => ({ path: `/sectors/${s.slug}`, priority: 0.6, changeFrequency: "monthly" as const })),
    ...news.map((n) => ({
      path: `/media/news/${n.slug}`,
      lastModified: n.updatedAt,
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    ...jobs.map((j) => ({
      path: `/careers/${j.slug}`,
      lastModified: j.updatedAt,
      priority: 0.5,
      changeFrequency: "weekly" as const,
    })),
    ...pages.map((p) => ({ path: `/${p.slug}`, lastModified: p.updatedAt, priority: 0.3, changeFrequency: "monthly" as const })),
  ];

  return entries
    .filter((e) => isPathEnabled(e.path, settings.pages))
    .flatMap((e) => {
      const suffix = e.path === "/" ? "" : e.path;
      const languages = Object.fromEntries([
        ...locales.map((l) => [l, `${base}/${l}${suffix}`]),
        ["x-default", `${base}/ar${suffix}`],
      ]);
      return locales.map((l) => ({
        url: `${base}/${l}${suffix}`,
        lastModified: e.lastModified ?? now,
        changeFrequency: e.changeFrequency,
        priority: e.priority,
        alternates: { languages },
      }));
    });
}
