import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { SocialIcon, WhatsAppIcon, socialLabels } from "@/components/ui/brand-icons";
import { ManageCookiesButton } from "@/components/consent/cookie-consent";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { analyticsConfig } from "@/lib/analytics";
import { localizeHref, tr, whatsappUrl } from "@/lib/utils";
import { isPathEnabled } from "@/content/defaults/pages";
import type { SiteSettings } from "@/types/content";
import { Logo } from "./logo";

export function SiteFooter({ settings, locale, dict }: { settings: SiteSettings; locale: Locale; dict: Dictionary }) {
  const { contact, footer, legal, social } = settings;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary relative overflow-hidden text-white/75">
      <div className="bg-pattern absolute inset-0 opacity-40" aria-hidden />
      <div className="from-secondary via-secondary/60 absolute inset-x-0 top-0 h-1 bg-gradient-to-l to-transparent" aria-hidden />

      <div className="container-page relative grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:py-16">
        <div className="sm:col-span-2 lg:col-span-4">
          <Logo
            href={localizeHref("/", locale)}
            name={tr(settings.name, locale)}
            src={settings.logo.footerSrc}
            mark={settings.logo.mark}
            tone="light"
          />
          <p className="mt-5 max-w-sm text-sm leading-7">{tr(footer.about, locale)}</p>
          <ul className="mt-6 flex flex-wrap items-center gap-2" aria-label={dict.footer.followUs}>
            {social.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLabels[s.platform]}
                  className="hover:border-secondary hover:bg-secondary hover:text-primary inline-flex size-10 items-center justify-center rounded-full border border-white/15 transition-colors"
                >
                  <SocialIcon platform={s.platform} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {footer.columns.map((col) => (
          <nav key={col.title.en} aria-label={tr(col.title, locale)} className="lg:col-span-2">
            <h2 className="mb-5 text-base font-bold text-white">{tr(col.title, locale)}</h2>
            <ul className="space-y-3 text-sm">
              {col.links
                .filter((link) => isPathEnabled(link.href, settings.pages))
                .map((link) => (
                  <li key={link.href}>
                    <Link href={localizeHref(link.href, locale)} className="hover:text-secondary transition-colors">
                      {tr(link.label, locale)}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}

        <div className="sm:col-span-2 lg:col-span-4">
          <h2 className="mb-5 text-base font-bold text-white">{dict.footer.contactTitle}</h2>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <MapPin className="text-secondary mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {tr(contact.address, locale)}
                <br />
                {tr(contact.city, locale)}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="text-secondary size-4 shrink-0" aria-hidden />
              <a href={`tel:${contact.phone}`} className="hover:text-secondary" dir="ltr">
                {contact.phoneDisplay}
              </a>
            </li>
            <li className="flex gap-3">
              <WhatsAppIcon className="text-secondary size-4 shrink-0" />
              <a
                href={whatsappUrl(contact.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary"
                dir="ltr"
              >
                +{contact.whatsapp}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="text-secondary size-4 shrink-0" aria-hidden />
              <a href={`mailto:${contact.email}`} className="hover:text-secondary">
                {contact.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="text-secondary size-4 shrink-0" aria-hidden />
              <span>{tr(contact.workingHours, locale)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {year} {tr(footer.copyright, locale)}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {(["privacy", "terms", "cookies"] as const).map((k) => (
              <li key={k}>
                <Link href={localizeHref(`/${k}`, locale)} className="hover:text-secondary">
                  {dict.sitemapLinks[k]}
                </Link>
              </li>
            ))}
            {analyticsConfig(settings) && (
              <li>
                <ManageCookiesButton label={dict.consent.manage} className="hover:text-secondary cursor-pointer" />
              </li>
            )}
          </ul>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {dict.footer.cr}: <span dir="ltr">{legal.crNumber}</span>
            </span>
            {legal.vatNumber && (
              <span>
                {dict.footer.vat}: <span dir="ltr">{legal.vatNumber}</span>
              </span>
            )}
          </p>
        </div>
        {settings.demoMode && (
          <p className="bg-black/20 py-2 text-center text-[0.7rem] text-white/60">{dict.footer.demoNotice}</p>
        )}
      </div>
    </footer>
  );
}
