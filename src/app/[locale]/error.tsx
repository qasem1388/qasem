"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale && isLocale(params.locale) ? params.locale : "ar";
  const dict = getDictionary(locale);
  // Production server errors carry only a digest, never the original message.
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;

  return (
    <section className="bg-surface">
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="text-primary text-2xl font-bold sm:text-3xl">{dict.serverError.title}</h1>
        <p className="text-muted mt-4 max-w-md leading-7">{dict.serverError.body}</p>
        {digest && (
          <p className="text-muted mt-2 text-xs">
            {dict.serverError.code}: <span dir="ltr">{digest}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className={buttonClasses("secondary")}>
            <RotateCcw className="size-4" aria-hidden />
            {dict.serverError.retry}
          </button>
          <Link href={`/${locale}`} className={buttonClasses("outline")}>
            {dict.notFound.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
