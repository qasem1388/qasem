import type { SiteSettings } from "@/types/content";

export const GA4_ID = /^G-[A-Z0-9]{4,12}$/;
export const PLAUSIBLE_DOMAIN = /^(?=.{3,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/;

export const CONSENT_COOKIE = "cookie_consent";
export type ConsentChoice = "granted" | "denied";

export type AnalyticsConfig = { ga4Id?: string; plausibleDomain?: string };

/**
 * Returns only the analytics IDs that pass strict validation. Values are
 * validated on save too; re-checking here keeps a hand-edited DB row from
 * ever reaching a script URL.
 */
export function analyticsConfig(settings: SiteSettings): AnalyticsConfig | null {
  const a = settings.seo.analytics ?? {};
  const ga4Id = a.ga4Id && GA4_ID.test(a.ga4Id) ? a.ga4Id : undefined;
  const plausibleDomain = a.plausibleDomain && PLAUSIBLE_DOMAIN.test(a.plausibleDomain) ? a.plausibleDomain : undefined;
  return ga4Id || plausibleDomain ? { ga4Id, plausibleDomain } : null;
}
