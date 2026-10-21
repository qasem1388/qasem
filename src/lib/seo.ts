import type { Metadata } from "next";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import { getSiteSettings } from "./content";
import { siteUrl } from "./site-url";

/**
 * Per-page metadata with canonical URL, hreflang alternates and Open Graph.
 * `path` is the locale-less path, e.g. "/services/logistics".
 */
export async function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
}: {
  locale: Locale;
  path: string;
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
}): Promise<Metadata> {
  const settings = await getSiteSettings();
  const share = image && !image.endsWith(".svg") ? image : settings.seo.shareImage;
  const clean = path === "/" ? "" : path;
  const languages = Object.fromEntries(locales.map((l) => [l, `/${l}${clean}`]));
  return {
    title,
    description,
    alternates: { canonical: `/${locale}${clean}`, languages: { ...languages, "x-default": `/ar${clean}` } },
    openGraph: {
      type,
      title,
      description,
      url: `${siteUrl()}/${locale}${clean}`,
      locale: localeMeta[locale].ogLocale,
      siteName: settings.name[locale],
      ...(share ? { images: [{ url: share }] } : {}),
    },
  };
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
