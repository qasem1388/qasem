export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeMeta: Record<Locale, { dir: "rtl" | "ltr"; label: string; ogLocale: string }> = {
  ar: { dir: "rtl", label: "العربية", ogLocale: "ar_SA" },
  en: { dir: "ltr", label: "English", ogLocale: "en_US" },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
