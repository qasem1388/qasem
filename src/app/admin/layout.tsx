import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1f3a" };

/** Separate root layout: the admin panel is Arabic/RTL and shares no chrome with the public site. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ar" dir="rtl" className={fontVariables}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
