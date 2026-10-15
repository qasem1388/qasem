import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return { name: s.storeName, short_name: s.logoText, start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#111312", lang: "ar", dir: "rtl" };
}
