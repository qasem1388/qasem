import { notFound } from "next/navigation";
import { homeSections } from "@/components/home/registry";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getHomePage, getSiteSettings } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";
import { tr } from "@/lib/utils";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [home, settings] = await Promise.all([getHomePage(), getSiteSettings()]);
  const dict = getDictionary(locale);
  const base = siteUrl();

  const name = tr(settings.name, locale);
  const type = settings.seo.schemaType ?? "Organization";
  const isPlace = type !== "Organization" && type !== "Corporation";
  const { contact } = settings;
  const organization = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${base}/#organization`,
    name,
    alternateName: tr(settings.name, locale === "ar" ? "en" : "ar"),
    description: tr(settings.description, locale),
    url: `${base}/${locale}`,
    logo: `${base}${settings.logo.src ?? settings.logo.mark}`,
    image: settings.seo.shareImage ? `${base}${settings.seo.shareImage}` : `${base}/brand/og-default.jpg`,
    email: contact.email,
    telephone: contact.phone,
    ...(settings.legal.vatNumber ? { taxID: settings.legal.vatNumber } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: tr(contact.address, locale),
      addressLocality: tr(contact.city, locale),
      ...(contact.region ? { addressRegion: tr(contact.region, locale) } : {}),
      addressCountry: "SA",
    },
    ...(isPlace && contact.lat && contact.lng
      ? { geo: { "@type": "GeoCoordinates", latitude: contact.lat, longitude: contact.lng } }
      : {}),
    ...(isPlace ? { openingHours: tr(contact.workingHours, "en") } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: contact.phone,
      email: contact.email,
      contactType: "customer service",
      areaServed: "SA",
      availableLanguage: ["Arabic", "English"],
    },
    sameAs: settings.social.map((s) => s.url),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: `${base}/${locale}`,
    name,
    inLanguage: locale === "ar" ? "ar-SA" : "en",
    publisher: { "@id": `${base}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([organization, website]).replace(/</g, "\\u003c") }}
      />
      {home.sections
        .filter((s) => s.enabled)
        .map(({ key }) => {
          const Section = homeSections[key];
          return <Section key={key} locale={locale} dict={dict} home={home} settings={settings} />;
        })}
    </>
  );
}
