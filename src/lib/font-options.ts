/** Selectable font families (data only — loaders live in ./fonts.ts). */
export const fontOptions = {
  plex: { label: "IBM Plex Sans Arabic", cssVar: "--font-plex" },
  tajawal: { label: "Tajawal", cssVar: "--font-tajawal" },
  cairo: { label: "Cairo", cssVar: "--font-cairo" },
  almarai: { label: "Almarai", cssVar: "--font-almarai" },
} as const;

export type FontKey = keyof typeof fontOptions;
