import type { OptionalPage } from "@/types/content";

/** Optional public sections that can be switched off from «الإعدادات العامة». */
export const defaultPageToggles: Record<OptionalPage, boolean> = {
  sectors: true,
  media: true,
  clients: true,
  careers: true,
  faq: true,
};

/** Which optional section a site path belongs to (by its first segment). */
export function optionalPageOf(path: string): OptionalPage | undefined {
  const first = path.replace(/^\/(ar|en)(?=\/|$)/, "").split(/[/?#]/)[1] as OptionalPage;
  return first && first in defaultPageToggles ? first : undefined;
}

/** False when the link points into a section disabled in the general settings. */
export function isPathEnabled(path: string, pages: Record<OptionalPage, boolean>) {
  const key = optionalPageOf(path);
  return !key || pages[key] !== false;
}
