import { CertificationsGrid } from "@/components/about/blocks";
import { CtaBand } from "@/components/shared/cta-band";
import { PageHeader } from "@/components/shared/page-header";
import { getAboutPage, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/about/certifications">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({
    locale,
    path: "/about/certifications",
    title: dict.pages.certifications.title,
    description: dict.pages.certifications.subtitle,
  });
}

export default async function CertificationsPage({ params }: PageProps<"/[locale]/about/certifications">) {
  const { locale, dict } = await pageContext(params);
  const [about, settings] = await Promise.all([getAboutPage(), getSiteSettings()]);
  return (
    <>
      <PageHeader
        title={dict.pages.certifications.title}
        subtitle={dict.pages.certifications.subtitle}
        crumbs={trail(locale, { label: dict.pages.about.title, href: "/about" }, { label: dict.pages.certifications.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <CertificationsGrid items={about.certifications} locale={locale} issuedBy={dict.about.issuedBy} />
          <dl className="rounded-brand-lg bg-surface mt-12 grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <dt className="text-muted text-sm">{dict.footer.cr}</dt>
              <dd className="text-primary mt-1 text-lg font-bold">
                <span dir="ltr">{settings.legal.crNumber}</span>
              </dd>
            </div>
            {settings.legal.vatNumber && (
              <div>
                <dt className="text-muted text-sm">{dict.footer.vat}</dt>
                <dd className="text-primary mt-1 text-lg font-bold">
                  <span dir="ltr">{settings.legal.vatNumber}</span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>
      <CtaBand locale={locale} dict={dict} />
    </>
  );
}
