import { CircleCheck } from "lucide-react";
import { QuoteForm } from "@/components/forms/quote-form";
import { SectionHeading } from "@/components/ui/section-heading";
import { getServices } from "@/lib/content";
import { tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function QuoteSection({ locale, dict, home }: SectionProps) {
  const services = await getServices();
  const { quote } = home;
  return (
    <section
      id="quote"
      aria-labelledby="quote-title"
      className="bg-primary relative isolate overflow-hidden py-20 text-white sm:py-24 lg:py-28"
    >
      <div className="bg-pattern absolute inset-0 -z-10 opacity-40" aria-hidden />
      <div
        className="bg-secondary/15 absolute -bottom-40 -z-10 size-[30rem] rounded-full blur-3xl ltr:-right-20 rtl:-left-20"
        aria-hidden
      />
      <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-16">
        <div className="lg:col-span-2">
          <SectionHeading
            id="quote-title"
            tone="light"
            align="start"
            eyebrow={tr(quote.eyebrow, locale)}
            title={tr(quote.title, locale)}
            subtitle={tr(quote.subtitle, locale)}
          />
          <ul className="mt-8 space-y-4" data-reveal>
            {quote.points.map((p) => (
              <li key={p.en} className="flex items-center gap-3 text-white/85">
                <CircleCheck className="text-secondary size-5 shrink-0" aria-hidden />
                {tr(p, locale)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-brand-lg text-ink bg-white p-6 shadow-2xl shadow-black/30 sm:p-8 lg:col-span-3" data-reveal>
          <QuoteForm dict={dict} services={services.map((s) => ({ value: s.slug, label: tr(s.title, locale) }))} />
        </div>
      </div>
    </section>
  );
}
