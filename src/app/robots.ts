import type { MetadataRoute } from "next";
import { noIndex, siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (noIndex()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/cart", "/order", "/search?"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
