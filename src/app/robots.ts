import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  if (settings.seo.indexable === false) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
