import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { FloatingActions } from "@/components/layout/floating-actions";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, type ResolvedNavItem } from "@/components/layout/site-header";
import { TopBar } from "@/components/layout/top-bar";
import { RevealObserver } from "@/components/ui/reveal-observer";
import { isLocale, localeMeta, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";
import { brandCssVariables } from "@/lib/theme";
import { localizeHref, tr, whatsappUrl } from "@/lib/utils";
import type { NavItem } from "@/types/content";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const settings = await getSiteSettings();
  const name = tr(settings.name, locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${name} | ${tr(settings.tagline, locale)}`, template: `%s | ${name}` },
    description: tr(settings.description, locale),
    applicationName: name,
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en", "x-default": "/ar" },
    },
    openGraph: {
      type: "website",
      siteName: name,
      locale: localeMeta[locale].ogLocale,
      title: name,
      description: tr(settings.description, locale),
    },
    icons: { icon: "/favicon.ico" },
  };
}

function resolveNav(items: NavItem[], locale: Locale): ResolvedNavItem[] {
  return items
    .filter((i) => i.visible)
    .map((i) => ({
      id: i.id,
      label: tr(i.label, locale),
      href: localizeHref(i.href, locale),
      children: i.children?.length ? resolveNav(i.children, locale) : undefined,
    }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const settings = await getSiteSettings();
  const dict = getDictionary(locale);
  const homeHref = localizeHref("/", locale);
  const logo = (
    <Logo
      href={homeHref}
      name={tr(settings.name, locale)}
      tagline={tr(settings.tagline, locale)}
      src={settings.logo.src}
      mark={settings.logo.mark}
    />
  );

  return (
    <html lang={locale} dir={localeMeta[locale].dir} className={plexArabic.variable} suppressHydrationWarning>
      <head>
        <style>{`:root{${brandCssVariables(settings.brand)}}`}</style>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="rounded-brand bg-secondary text-primary sr-only z-[60] px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {dict.skipToContent}
        </a>
        <TopBar settings={settings} locale={locale} dict={dict} />
        <SiteHeader
          logo={logo}
          items={resolveNav(settings.navigation, locale)}
          homeHref={homeHref}
          cta={{ label: tr(settings.headerCta.label, locale), href: localizeHref(settings.headerCta.href, locale) }}
          phone={settings.contact.phone}
          labels={{ ...dict.menu, call: dict.contact.call }}
          languageSwitcher={
            <LanguageSwitcher
              locale={locale}
              label={dict.language.switchTo}
              ariaLabel={dict.language.switchLabel}
              className="text-primary"
            />
          }
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter settings={settings} locale={locale} dict={dict} />
        <FloatingActions
          whatsappHref={whatsappUrl(settings.contact.whatsapp)}
          whatsappLabel={dict.whatsappFloat}
          backToTopLabel={dict.backToTop}
        />
        <RevealObserver />
      </body>
    </html>
  );
}
