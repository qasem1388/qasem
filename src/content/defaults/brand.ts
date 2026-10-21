import type { BrandTheme, SiteSettings } from "@/types/content";

/** Factory identity restored by «استعادة الهوية الافتراضية». */
export const defaultBrand: BrandTheme = {
  primary: "#0b1f3a",
  secondary: "#c8a24a",
  accent: "#1d4e89",
  surface: "#f5f7fa",
  text: "#0f172a",
  button: "#c8a24a",
  buttonText: "#0b1f3a",
  radius: 14,
  font: "plex",
  fontScale: 1,
};

export const defaultLogo: SiteSettings["logo"] = { mark: "/brand/logo-mark.svg" };
