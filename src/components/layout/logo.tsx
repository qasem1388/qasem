import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Renders the uploaded logo when available, otherwise the brand mark with
 * the company name as text, so a name change applies everywhere instantly.
 */
export function Logo({
  href,
  name,
  tagline,
  src,
  mark,
  tone = "dark",
  className,
}: {
  href: string;
  name: string;
  tagline?: string;
  src?: string;
  mark: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-3", className)} aria-label={name}>
      {src ? (
        <Image src={src} alt={name} width={180} height={48} className="h-11 w-auto" priority />
      ) : (
        <>
          <Image src={mark} alt="" width={44} height={44} className="size-10 shrink-0 sm:size-11" priority />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className={cn("truncate text-base font-bold sm:text-lg", tone === "dark" ? "text-primary" : "text-white")}>
              {name}
            </span>
            {tagline && (
              <span
                className={cn(
                  "hidden truncate text-xs sm:block xl:max-w-48 2xl:max-w-none",
                  tone === "dark" ? "text-muted" : "text-white/60",
                )}
              >
                {tagline}
              </span>
            )}
          </span>
        </>
      )}
    </Link>
  );
}
