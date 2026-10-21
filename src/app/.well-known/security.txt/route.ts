import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 86400;

/** RFC 9116 security contact, built from the company email set in the admin panel. */
export async function GET() {
  const settings = await getSiteSettings();
  const base = siteUrl();
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: mailto:${settings.contact.email}`,
    `Expires: ${expires}`,
    "Preferred-Languages: ar, en",
    `Canonical: ${base}/.well-known/security.txt`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
