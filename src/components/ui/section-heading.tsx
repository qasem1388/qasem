import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "dark",
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  tone?: "dark" | "light";
  className?: string;
  id?: string;
}) {
  return (
    <div data-reveal className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-start", className)}>
      {eyebrow && (
        <p
          className={cn(
            "mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-wide",
            tone === "dark" ? "text-secondary-700" : "text-secondary",
          )}
        >
          <span className="h-px w-8 bg-current" aria-hidden />
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className={cn(
          "text-2xl leading-snug font-bold text-balance sm:text-3xl lg:text-4xl lg:leading-tight",
          tone === "dark" ? "text-primary" : "text-white",
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", tone === "dark" ? "text-muted" : "text-white/75")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
