import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";

// Rendered per request so it always reflects the live database (cheap queries).
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  if (settings.seo.indexable === false) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
