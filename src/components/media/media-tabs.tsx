import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn, localizeHref } from "@/lib/utils";

export type MediaSection = "media" | "news" | "articles" | "announcements" | "events" | "photos" | "videos";

const order: { key: MediaSection; href: string }[] = [
  { key: "media", href: "/media" },
  { key: "news", href: "/media/news" },
  { key: "articles", href: "/media/articles" },
  { key: "announcements", href: "/media/announcements" },
  { key: "events", href: "/media/events" },
  { key: "photos", href: "/media/photos" },
  { key: "videos", href: "/media/videos" },
];

/** Secondary navigation shared by all media-center pages. */
export function MediaTabs({ active, locale, dict }: { active: MediaSection; locale: Locale; dict: Dictionary }) {
  return (
    <nav
      aria-label={dict.pages.media.title}
      className="border-primary/8 sticky top-[4.5rem] z-20 border-b bg-white/95 backdrop-blur lg:top-20"
    >
      <ul className="container-page flex [scrollbar-width:none] gap-1 overflow-x-auto py-2">
        {order.map((o) => (
          <li key={o.key} className="shrink-0">
            <Link
              href={localizeHref(o.href, locale)}
              aria-current={active === o.key ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                active === o.key ? "bg-primary text-white" : "text-ink/75 hover:bg-primary-50 hover:text-primary",
              )}
            >
              {o.key === "media" ? dict.media.latest : dict.pages[o.key].title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
