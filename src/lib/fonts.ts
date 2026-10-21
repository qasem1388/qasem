import { Almarai, Cairo, IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";

/**
 * Arabic-first font families selectable from the admin panel. All are
 * self-hosted at build time by next/font; only the default one is preloaded,
 * the others download only when selected.
 */
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
  preload: false,
});
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap", preload: false });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
  preload: false,
});

export const fontVariables = [plex.variable, tajawal.variable, cairo.variable, almarai.variable].join(" ");
