import clsx, { type ClassValue } from "clsx";
import type { Locale } from "@/i18n/config";
import type { Localized } from "@/types/content";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Picks the string for the active locale, falling back to Arabic. */
export function tr(value: Localized | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] || value.ar;
}

/**
 * Prefixes internal paths with the active locale. Anchors, absolute URLs and
 * mailto/tel links are returned unchanged.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/")) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function whatsappUrl(number: string, text?: string) {
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number.replace(/\D/g, "")}${q}`;
}
