import { ArrowRight, Phone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { localizeHref } from "@/lib/utils";

export function CtaBand({
  locale,
  dict,
  title,
  body,
  phone,
}: {
  locale: Locale;
  dict: Dictionary;
  title?: string;
  body?: string;
  phone?: { raw: string; display: string };
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="rounded-brand-lg bg-primary relative isolate overflow-hidden px-6 py-12 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="bg-pattern absolute inset-0 -z-10 opacity-40" aria-hidden />
          <div
            className="bg-secondary/20 absolute -top-24 -z-10 size-72 rounded-full blur-3xl ltr:-right-10 rtl:-left-10"
            aria-hidden
          />
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{title ?? dict.cta.title}</h2>
            <p className="mt-3 leading-7 text-white/75">{body ?? dict.cta.body}</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <ButtonLink href={localizeHref("/quote", locale)} variant="primary">
              {dict.cta.quote}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
            </ButtonLink>
            {phone ? (
              <a
                href={`tel:${phone.raw}`}
                className="rounded-brand inline-flex h-12 items-center justify-center gap-2 border border-white/40 px-6 font-semibold transition-colors hover:bg-white/10"
              >
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{phone.display}</span>
              </a>
            ) : (
              <ButtonLink href={localizeHref("/contact", locale)} variant="ghost">
                {dict.cta.contact}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
