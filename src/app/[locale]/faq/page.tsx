import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getFaqs } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/faq", title: dict.pages.faq.title, description: dict.pages.faq.subtitle });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("faq");
  const faqs = await getFaqs();
  const groups = [...new Set(faqs.map((f) => tr(f.category, locale)))].map((name) => ({
    name,
    items: faqs.filter((f) => tr(f.category, locale) === name),
  }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: tr(f.question, locale),
      acceptedAnswer: { "@type": "Answer", text: tr(f.answer, locale) },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <PageHeader
        title={dict.pages.faq.title}
        subtitle={dict.pages.faq.subtitle}
        crumbs={trail(locale, { label: dict.pages.faq.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section className="py-16 sm:py-20">
        <div className="container-page max-w-4xl space-y-12">
          {groups.map((g) => (
            <div key={g.name}>
              <h2 className="text-primary mb-5 flex items-center gap-3 text-xl font-bold">
                <span className="bg-secondary h-6 w-1.5 rounded-full" aria-hidden />
                {g.name}
              </h2>
              <div className="space-y-3">
                {g.items.map((f) => (
                  <details
                    key={f.id}
                    className="group rounded-brand-lg border-primary/8 open:border-secondary/60 border bg-white open:shadow-md"
                  >
                    <summary className="text-primary flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold [&::-webkit-details-marker]:hidden">
                      {tr(f.question, locale)}
                      <ChevronDown
                        className="text-secondary-700 size-5 shrink-0 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="text-muted px-5 pb-5 leading-8">{tr(f.answer, locale)}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-brand-lg bg-surface flex flex-col items-center gap-4 p-8 text-center">
            <MessageCircleQuestion className="text-secondary-700 size-10" aria-hidden />
            <p className="text-primary text-lg font-bold">{dict.faq.searchHint}</p>
            <ButtonLink href={localizeHref("/contact", locale)} variant="secondary">
              {dict.faq.contactUs}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
