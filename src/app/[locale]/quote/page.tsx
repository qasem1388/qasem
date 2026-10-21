import { Phone } from "lucide-react";
import { QuoteForm } from "@/components/forms/quote-form";
import { PageHeader } from "@/components/shared/page-header";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { getServices, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { tr, whatsappUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/quote">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/quote", title: dict.pages.quote.title, description: dict.pages.quote.subtitle });
}

export default async function QuotePage({ params }: PageProps<"/[locale]/quote">) {
  const { locale, dict } = await pageContext(params);
  const [services, settings] = await Promise.all([getServices(), getSiteSettings()]);
  return (
    <>
      <PageHeader
        title={dict.pages.quote.title}
        subtitle={dict.pages.quote.subtitle}
        crumbs={trail(locale, { label: dict.pages.quote.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <div className="container-page grid grid-cols-1 gap-10 py-16 sm:py-20 lg:grid-cols-3">
        <div className="rounded-brand-lg border-primary/8 shadow-primary/5 border bg-white p-6 shadow-xl sm:p-8 lg:col-span-2">
          <QuoteForm dict={dict} withAttachment services={services.map((s) => ({ value: s.slug, label: tr(s.title, locale) }))} />
        </div>
        <aside className="space-y-6 lg:self-start">
          <section aria-labelledby="how-title" className="rounded-brand-lg bg-surface p-7">
            <h2 id="how-title" className="text-primary text-lg font-bold">
              {dict.quotePage.howItWorks}
            </h2>
            <ol className="mt-5 space-y-5">
              {dict.quotePage.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-4">
                  <span
                    className="bg-primary text-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-full font-bold"
                    dir="ltr"
                  >
                    {i + 1}
                  </span>
                  <span className="text-primary font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="call-title" className="rounded-brand-lg bg-primary p-7 text-white">
            <h2 id="call-title" className="text-lg font-bold">
              {dict.quotePage.callInstead}
            </h2>
            <p className="mt-2 text-sm text-white/70">{tr(settings.contact.workingHours, locale)}</p>
            <div className="mt-5 space-y-3">
              <a
                href={`tel:${settings.contact.phone}`}
                className="rounded-brand bg-secondary text-primary flex h-12 items-center justify-center gap-2 font-semibold"
              >
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{settings.contact.phoneDisplay}</span>
              </a>
              <a
                href={whatsappUrl(settings.contact.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-brand text-primary flex h-12 items-center justify-center gap-2 bg-[#25D366] font-semibold"
              >
                <WhatsAppIcon className="size-5" />
                {dict.contact.whatsapp}
              </a>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
