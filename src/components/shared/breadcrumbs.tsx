import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${base}${c.href}` } : {}),
    })),
  };
  return (
    <nav aria-label={label}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/70">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronLeft className="size-3.5 opacity-60 ltr:rotate-180" aria-hidden />}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="hover:text-secondary transition-colors">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-secondary">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
