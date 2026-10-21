import { ArrowRight, CircleCheck, FileText, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/shared/gallery";
import { PageHeader } from "@/components/shared/page-header";
import { Prose } from "@/components/shared/prose";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getService, getServiceCategories, getServices, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { localizeHref, tr, whatsappUrl } from "@/lib/utils";

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { locale } = await pageContext(params);
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};
  return pageMetadata({
    locale,
    path: `/services/${slug}`,
    title: tr(service.title, locale),
    description: tr(service.summary, locale),
    image: service.image,
  });
}

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { locale, dict } = await pageContext(params);
  const { slug } = await params;
  const [service, all, categories, settings] = await Promise.all([
    getService(slug),
    getServices(),
    getServiceCategories(),
    getSiteSettings(),
  ]);
  if (!service) notFound();

  const title = tr(service.title, locale);
  const category = categories.find((c) => c.id === service.categoryId);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description: tr(service.summary, locale),
    serviceType: tr(category?.name, locale),
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    provider: { "@type": "Organization", name: tr(settings.name, locale), url: `${siteUrl()}/${locale}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <PageHeader
        title={title}
        subtitle={tr(service.summary, locale)}
        crumbs={trail(locale, { label: dict.pages.services.title, href: "/services" }, { label: title })}
        breadcrumbLabel={dict.breadcrumbHome}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`${localizeHref("/quote", locale)}?service=${service.slug}`} variant="primary">
            <FileText className="size-4" aria-hidden />
            {dict.cta.quote}
          </ButtonLink>
          <ButtonLink href={localizeHref("/contact", locale)} variant="ghost">
            {dict.services.inquiry}
          </ButtonLink>
        </div>
      </PageHeader>

      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <Image
            src={service.image}
            alt=""
            width={960}
            height={630}
            priority
            className="rounded-brand-lg aspect-[16/9] h-auto w-full object-cover shadow-lg"
          />
          <div className="mt-10">
            <Prose text={tr(service.body, locale)} />
          </div>

          <h2 className="text-primary mt-14 text-2xl font-bold">{dict.services.features}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((f) => (
              <li key={f.title.en} className="rounded-brand-lg border-primary/8 flex gap-4 border bg-white p-5">
                <CircleCheck className="text-secondary-700 mt-0.5 size-6 shrink-0" aria-hidden />
                <div>
                  <h3 className="text-primary font-bold">{tr(f.title, locale)}</h3>
                  <p className="text-muted mt-1 text-sm leading-6">{tr(f.body, locale)}</p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="text-primary mt-14 mb-6 text-2xl font-bold">{dict.services.gallery}</h2>
          <Gallery
            items={service.gallery.map((src, i) => ({ src, caption: `${title} — ${i + 1}` }))}
            labels={{ close: dict.media.close, prev: dict.media.prev, next: dict.media.next, open: dict.media.open }}
          />
        </article>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-brand-lg bg-primary p-7 text-white">
            <span className="rounded-brand bg-secondary text-primary inline-flex size-12 items-center justify-center">
              <Icon name={service.icon} className="size-6" />
            </span>
            <h2 className="mt-5 text-xl font-bold">{dict.services.askTitle}</h2>
            <p className="mt-2 text-sm leading-7 text-white/75">{dict.services.askBody}</p>
            <div className="mt-6 space-y-3">
              <ButtonLink href={`${localizeHref("/quote", locale)}?service=${service.slug}`} variant="primary" className="w-full">
                {dict.cta.quote}
              </ButtonLink>
              <a
                href={whatsappUrl(settings.contact.whatsapp, title)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-brand text-primary flex h-12 items-center justify-center gap-2 bg-[#25D366] font-semibold"
              >
                <WhatsAppIcon className="size-5" />
                {dict.contact.whatsapp}
              </a>
              <a
                href={`tel:${settings.contact.phone}`}
                className="rounded-brand flex h-12 items-center justify-center gap-2 border border-white/30 font-semibold"
              >
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{settings.contact.phoneDisplay}</span>
              </a>
            </div>
          </div>

          <nav aria-label={dict.services.related} className="rounded-brand-lg border-primary/8 border bg-white p-6">
            <h2 className="text-primary font-bold">{dict.pages.services.title}</h2>
            <ul className="mt-4 space-y-1">
              {all.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={localizeHref(`/services/${s.slug}`, locale)}
                    aria-current={s.slug === service.slug ? "page" : undefined}
                    className="text-ink/80 hover:bg-primary-50 hover:text-primary aria-[current=page]:bg-primary flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors aria-[current=page]:text-white"
                  >
                    {tr(s.title, locale)}
                    <ArrowRight className="size-4 shrink-0 opacity-50 rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
