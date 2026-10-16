import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings, noIndex, siteUrl, verificationCode } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const google = verificationCode(s.googleVerification);
  const bing = verificationCode(s.bingVerification);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${s.storeName} | ${s.tagline}`, template: `%s | ${s.storeName}` },
    description: s.tagline,
    applicationName: s.storeName,
    alternates: { canonical: "/" },
    openGraph: { type: "website", locale: "ar_SA", siteName: s.storeName },
    twitter: { card: "summary_large_image" },
    robots: noIndex() ? { index: false, follow: false } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    formatDetection: { telephone: false },
    verification: { google: google || undefined, other: bing ? { "msvalidate.01": bing } : undefined },
  };
}

export const viewport: Viewport = { themeColor: "#111312", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
