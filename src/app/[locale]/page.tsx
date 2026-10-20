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

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: tr(settings.name, locale),
    description: tr(settings.description, locale),
    url: `${base}/${locale}`,
    logo: `${base}${settings.logo.src ?? settings.logo.mark}`,
    email: settings.contact.email,
    telephone: settings.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: tr(settings.contact.address, locale),
      addressCountry: "SA",
    },
    sameAs: settings.social.map((s) => s.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
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
