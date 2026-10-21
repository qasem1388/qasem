import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1f3a" };

/** Separate root layout: the admin panel is Arabic/RTL and shares no chrome with the public site. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
