import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { HomePage, SiteSettings } from "@/types/content";

export type SectionProps = {
  locale: Locale;
  dict: Dictionary;
  home: HomePage;
  settings: SiteSettings;
};
