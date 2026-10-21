import { ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function NewsCard({
  href,
  image,
  kindLabel,
  date,
  dateLabel,
  title,
  excerpt,
  readMore,
}: {
  href: string;
  image: string;
  kindLabel: string;
  date: string;
  dateLabel: string;
  title: string;
  excerpt: string;
  readMore: string;
}) {
  return (
    <article className="group rounded-brand-lg border-primary/8 hover:shadow-primary/10 relative flex h-full flex-col overflow-hidden border bg-white transition-shadow hover:shadow-xl">
      <div className="relative overflow-hidden">
        <Image
          src={image}
          alt=""
          width={640}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          height={400}
          className="aspect-[16/10] h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="bg-secondary text-primary absolute top-4 rounded-full px-3 py-1 text-xs font-semibold ltr:left-4 rtl:right-4">
          {kindLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-muted flex items-center gap-1.5 text-xs">
          <Calendar className="size-3.5" aria-hidden />
          <time dateTime={date}>{dateLabel}</time>
        </p>
        <h3 className="text-primary mt-3 text-lg leading-snug font-bold">
          <Link href={href} className="group-hover:text-accent after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        </h3>
        <p className="text-muted mt-3 line-clamp-3 flex-1 text-sm leading-7">{excerpt}</p>
        <span className="text-secondary-700 mt-5 inline-flex items-center gap-2 text-sm font-semibold" aria-hidden>
          {readMore}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </span>
      </div>
    </article>
  );
}
