"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  locale,
  label,
  ariaLabel,
  className,
}: {
  locale: Locale;
  label: string;
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname() || `/${locale}`;
  const target: Locale = locale === "ar" ? "en" : "ar";
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  const href = `/${target}${rest}`;

  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1.5 font-medium transition-colors", className)}
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${target};path=/;max-age=31536000;samesite=lax`;
      }}
    >
      <Globe className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
