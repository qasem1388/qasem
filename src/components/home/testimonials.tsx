import { Quote, Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTestimonials } from "@/lib/content";
import { tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function TestimonialsSection({ locale, home }: SectionProps) {
  const items = await getTestimonials();
  return (
    <section aria-labelledby="testimonials-title" className="bg-surface py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="testimonials-title"
          eyebrow={tr(home.testimonials.eyebrow, locale)}
          title={tr(home.testimonials.title, locale)}
        />
        <ul className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <li key={t.id} data-reveal style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}>
              <figure className="rounded-brand-lg ring-primary/5 relative flex h-full flex-col bg-white p-8 shadow-sm ring-1">
                <Quote className="text-secondary/25 absolute top-6 size-10 ltr:right-6 rtl:left-6 rtl:-scale-x-100" aria-hidden />
                <div className="text-secondary flex gap-0.5" role="img" aria-label={`${t.rating}/5`}>
                  {Array.from({ length: t.rating }, (_, k) => (
                    <Star key={k} className="size-4 fill-current" aria-hidden />
                  ))}
                </div>
                <blockquote className="text-ink/80 mt-5 flex-1 leading-8">
                  {locale === "ar" ? `«${tr(t.quote, locale)}»` : `“${tr(t.quote, locale)}”`}
                </blockquote>
                <figcaption className="border-primary/5 mt-6 flex items-center gap-3 border-t pt-5">
                  <span
                    className="bg-primary text-secondary inline-flex size-11 items-center justify-center rounded-full text-sm font-bold"
                    aria-hidden
                  >
                    {tr(t.author, locale).charAt(0)}
                  </span>
                  <span>
                    <span className="text-primary block font-bold">{tr(t.author, locale)}</span>
                    <span className="text-muted block text-sm">{tr(t.role, locale)}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
