"use client";

import { Compass } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale && isLocale(params.locale) ? params.locale : "ar";
  const dict = getDictionary(locale);

  return (
    <section className="bg-surface relative overflow-hidden">
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="from-primary to-primary/40 bg-gradient-to-b bg-clip-text text-[7rem] leading-none font-bold text-transparent sm:text-[9rem]">
          404
        </p>
        <h1 className="text-primary mt-4 text-2xl font-bold sm:text-3xl">{dict.notFound.title}</h1>
        <p className="text-muted mt-4 max-w-md leading-7">{dict.notFound.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}`} className={buttonClasses("secondary")}>
            {dict.notFound.home}
          </Link>
          <Link href={`/${locale}/contact`} className={buttonClasses("outline")}>
            <Compass className="size-4" aria-hidden />
            {dict.contact.call}
          </Link>
        </div>
      </div>
    </section>
  );
}
