import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";

export function ServiceCard({
  href,
  icon,
  title,
  summary,
  readMore,
  category,
}: {
  href: string;
  icon: IconName;
  title: string;
  summary: string;
  readMore: string;
  category?: string;
}) {
  return (
    <article className="group rounded-brand-lg border-primary/8 hover:shadow-primary/10 relative flex h-full flex-col overflow-hidden border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-2xl">
      <div
        className="bg-primary absolute -top-16 size-40 scale-0 rounded-full transition-transform duration-500 ease-out group-hover:scale-[5] ltr:-right-16 rtl:-left-16"
        aria-hidden
      />
      <span className="rounded-brand bg-secondary-50 text-secondary-700 group-hover:bg-secondary group-hover:text-primary relative inline-flex size-14 items-center justify-center transition-colors duration-300">
        <Icon name={icon} className="size-7" />
      </span>
      {category && (
        <p className="text-secondary-700 group-hover:text-secondary relative mt-5 text-xs font-semibold transition-colors duration-300">
          {category}
        </p>
      )}
      <h3
        className={`relative ${category ? "mt-1.5" : "mt-6"} text-primary text-xl font-bold transition-colors duration-300 group-hover:text-white`}
      >
        {title}
      </h3>
      <p className="text-muted relative mt-3 flex-1 leading-7 transition-colors duration-300 group-hover:text-white/75">
        {summary}
      </p>
      <Link
        href={href}
        className="text-primary group-hover:text-secondary relative mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-300 after:absolute after:inset-0 after:content-['']"
      >
        {readMore}
        <span className="sr-only">: {title}</span>
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          aria-hidden
        />
      </Link>
    </article>
  );
}
