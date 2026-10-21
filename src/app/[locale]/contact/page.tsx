import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { BranchMap } from "@/components/shared/branch-map";
import { PageHeader } from "@/components/shared/page-header";
import { SocialIcon, WhatsAppIcon, socialLabels } from "@/components/ui/brand-icons";
import { getBranches, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { tr, whatsappUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/contact", title: dict.pages.contact.title, description: dict.pages.contact.subtitle });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale, dict } = await pageContext(params);
  const [settings, branches] = await Promise.all([getSiteSettings(), getBranches()]);
  const { contact } = settings;

  const cards = [
    { icon: Phone, label: dict.contact.phone, value: contact.phoneDisplay, href: `tel:${contact.phone}`, ltr: true },
    {
      icon: WhatsAppIcon,
      label: dict.contact.whatsapp,
      value: `+${contact.whatsapp}`,
      href: whatsappUrl(contact.whatsapp),
      ltr: true,
      external: true,
    },
    { icon: Mail, label: dict.contact.email, value: contact.email, href: `mailto:${contact.email}` },
    {
      icon: MapPin,
      label: dict.contact.nationalAddress,
      value: tr(contact.address, locale),
      href: contact.mapUrl,
      external: true,
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: tr(settings.name, locale),
    url: `${siteUrl()}/${locale}`,
    telephone: contact.phone,
    email: contact.email,
    address: { "@type": "PostalAddress", streetAddress: tr(contact.address, locale), addressCountry: "SA" },
    department: branches.map((b) => ({
      "@type": "LocalBusiness",
      name: tr(b.name, locale),
      telephone: b.phone,
      address: { "@type": "PostalAddress", streetAddress: tr(b.address, locale), addressCountry: "SA" },
      geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <PageHeader
        title={dict.pages.contact.title}
        subtitle={dict.pages.contact.subtitle}
        crumbs={trail(locale, { label: dict.pages.contact.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />

      <section className="py-14 sm:py-16">
        <div className="container-page">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: I, ...c }) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group rounded-brand-lg border-primary/8 hover:border-secondary flex h-full flex-col items-center border bg-white p-6 text-center transition-all hover:shadow-md"
                >
                  <span className="bg-primary text-secondary group-hover:bg-secondary group-hover:text-primary inline-flex size-14 items-center justify-center rounded-full transition-colors">
                    <I className="size-6" aria-hidden />
                  </span>
                  <span className="text-muted mt-4 text-sm">{c.label}</span>
                  <span className="text-primary mt-1 font-semibold break-words">
                    {c.ltr ? <span dir="ltr">{c.value}</span> : c.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-muted mt-6 flex items-center justify-center gap-2 text-sm">
            <Clock className="text-secondary-700 size-4" aria-hidden />
            {dict.contact.hours}: {tr(contact.workingHours, locale)}
          </p>
        </div>
      </section>

      <section aria-labelledby="form-title" className="bg-surface py-14 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="rounded-brand-lg shadow-primary/5 bg-white p-6 shadow-xl sm:p-8 lg:col-span-3">
            <h2 id="form-title" className="text-primary mb-6 text-2xl font-bold">
              {dict.contact.formTitle}
            </h2>
            <ContactForm dict={dict} />
          </div>
          <div className="lg:col-span-2">
            <h2 className="sr-only">{dict.contact.mapTitle}</h2>
            <BranchMap
              title={dict.contact.mapTitle}
              openLabel={dict.contact.map}
              branches={branches.map((b) => ({ id: b.id, name: tr(b.name, locale), lat: b.lat, lng: b.lng }))}
            />
            <div className="rounded-brand-lg mt-6 bg-white p-6">
              <h2 className="text-primary font-bold">{dict.contact.socialTitle}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {settings.social.map((s) => (
                  <li key={s.platform}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-primary/15 text-primary hover:border-secondary hover:bg-secondary inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors"
                    >
                      <SocialIcon platform={s.platform} className="size-4" />
                      {socialLabels[s.platform]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="branches-title" className="py-14 sm:py-16">
        <div className="container-page">
          <h2 id="branches-title" className="text-primary text-2xl font-bold sm:text-3xl">
            {dict.contact.branches}
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {branches.map((b) => (
              <li key={b.id} className="rounded-brand-lg border-primary/8 relative flex flex-col border bg-white p-6">
                {b.isMain && (
                  <span className="bg-secondary text-primary absolute top-5 rounded-full px-3 py-1 text-xs font-semibold ltr:right-5 rtl:left-5">
                    {dict.contact.mainBranch}
                  </span>
                )}
                <h3 className="text-primary text-lg font-bold">{tr(b.name, locale)}</h3>
                <ul className="text-ink/80 mt-4 flex-1 space-y-3 text-sm">
                  <li className="flex gap-2">
                    <MapPin className="text-secondary-700 mt-0.5 size-4 shrink-0" aria-hidden />
                    {tr(b.address, locale)}
                  </li>
                  <li className="flex gap-2">
                    <Phone className="text-secondary-700 size-4 shrink-0" aria-hidden />
                    <a href={`tel:${b.phone}`} className="hover:text-primary" dir="ltr">
                      {b.phoneDisplay}
                    </a>
                  </li>
                  <li className="flex gap-2">
                    <Mail className="text-secondary-700 size-4 shrink-0" aria-hidden />
                    <a href={`mailto:${b.email}`} className="hover:text-primary">
                      {b.email}
                    </a>
                  </li>
                  <li className="flex gap-2">
                    <Clock className="text-secondary-700 size-4 shrink-0" aria-hidden />
                    {tr(b.hours, locale)}
                  </li>
                </ul>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-brand border-primary/15 text-primary hover:border-primary hover:bg-primary-50 mt-5 inline-flex h-10 items-center justify-center gap-2 border text-sm font-semibold"
                >
                  <Navigation className="size-4" aria-hidden />
                  {dict.contact.directions}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
