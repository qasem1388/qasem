import { Clock, Mail, Phone } from "lucide-react";
import { SocialIcon, socialLabels } from "@/components/ui/brand-icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { tr } from "@/lib/utils";
import type { SiteSettings } from "@/types/content";
import { LanguageSwitcher } from "./language-switcher";

export function TopBar({ settings, locale, dict }: { settings: SiteSettings; locale: Locale; dict: Dictionary }) {
  const { contact, social } = settings;
  return (
    <div className="bg-primary text-[0.8rem] text-white/80">
      <div className="container-page flex h-10 items-center justify-between gap-4">
        <ul className="flex min-w-0 items-center gap-5">
          <li>
            <a href={`tel:${contact.phone}`} className="hover:text-secondary inline-flex items-center gap-1.5" dir="ltr">
              <Phone className="text-secondary size-3.5" aria-hidden />
              <span className="sr-only">{dict.contact.phone}: </span>
              {contact.phoneDisplay}
            </a>
          </li>
          <li className="hidden sm:block">
            <a href={`mailto:${contact.email}`} className="hover:text-secondary inline-flex items-center gap-1.5">
              <Mail className="text-secondary size-3.5" aria-hidden />
              <span className="sr-only">{dict.contact.email}: </span>
              {contact.email}
            </a>
          </li>
          <li className="hidden items-center gap-1.5 lg:inline-flex">
            <Clock className="text-secondary size-3.5" aria-hidden />
            {tr(contact.workingHours, locale)}
          </li>
        </ul>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-3 md:flex">
            {social.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[s.platform]}
                  className="hover:text-secondary block transition-colors"
                >
                  <SocialIcon platform={s.platform} className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
          <span className="hidden h-4 w-px bg-white/20 md:block" aria-hidden />
          <LanguageSwitcher
            locale={locale}
            label={dict.language.switchTo}
            ariaLabel={dict.language.switchLabel}
            className="hover:text-secondary"
          />
        </div>
      </div>
    </div>
  );
}
