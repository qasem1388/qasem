/**
 * Public base URL used for canonical links, sitemap and Open Graph.
 * SITE_URL is read at runtime (one Docker image can serve any domain);
 * NEXT_PUBLIC_SITE_URL is still honoured for older setups but is fixed at build time.
 */
export function siteUrl() {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
