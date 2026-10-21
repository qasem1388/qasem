import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Crumb } from "@/components/shared/breadcrumbs";
import { localizeHref } from "./utils";

/** Resolves and validates the locale route param for a page. */
export async function pageContext(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, dict: getDictionary(locale) };
}

/** Breadcrumb trail that always starts at the localized home page. */
export function trail(locale: Locale, ...items: { label: string; href?: string }[]): Crumb[] {
  return [
    { label: getDictionary(locale).breadcrumbHome, href: localizeHref("/", locale) },
    ...items.map((i) => ({ label: i.label, href: i.href ? localizeHref(i.href, locale) : undefined })),
  ];
}
