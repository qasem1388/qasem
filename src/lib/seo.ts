import type { Metadata } from "next";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import { siteUrl } from "./site-url";

/**
 * Per-page metadata with canonical URL, hreflang alternates and Open Graph.
 * `path` is the locale-less path, e.g. "/services/logistics".
 */
export function pageMetadata({
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
}): Metadata {
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
      ...(image && !image.endsWith(".svg") ? { images: [{ url: image }] } : {}),
    },
  };
}

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
