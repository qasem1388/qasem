import { ArrowRight, Briefcase, Clock, MapPin } from "lucide-react";
import Link from "next/link";

export function JobCard({
  href,
  title,
  department,
  location,
  type,
  summary,
  cta,
}: {
  href: string;
  title: string;
  department: string;
  location: string;
  type: string;
  summary: string;
  cta: string;
}) {
  return (
    <article className="group rounded-brand-lg border-primary/8 hover:border-secondary hover:shadow-primary/5 relative flex h-full flex-col border bg-white p-7 transition-all hover:shadow-lg">
      <p className="text-secondary-700 text-xs font-semibold">{department}</p>
      <h3 className="text-primary mt-2 text-xl font-bold">
        <Link href={href} className="after:absolute after:inset-0 after:content-['']">
          {title}
        </Link>
      </h3>
      <p className="text-muted mt-3 flex-1 leading-7">{summary}</p>
      <ul className="text-primary mt-5 flex flex-wrap gap-2 text-xs">
        <li className="bg-primary-50 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
          <MapPin className="size-3.5" aria-hidden />
          {location}
        </li>
        <li className="bg-primary-50 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
          <Clock className="size-3.5" aria-hidden />
          {type}
        </li>
      </ul>
      <span
        className="text-primary group-hover:text-secondary-700 mt-6 inline-flex items-center gap-2 text-sm font-semibold"
        aria-hidden
      >
        <Briefcase className="size-4" />
        {cta}
        <ArrowRight className="size-4 rtl:rotate-180" />
      </span>
    </article>
  );
}
