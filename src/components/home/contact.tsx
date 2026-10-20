import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { tr, whatsappUrl } from "@/lib/utils";
import type { SectionProps } from "./types";

export function ContactSection({ locale, dict, home, settings }: SectionProps) {
  const { contact } = settings;
  const cards = [
    { icon: Phone, label: dict.contact.phone, value: contact.phoneDisplay, href: `tel:${contact.phone}`, ltr: true },
    {
      icon: WhatsAppIcon,
      label: dict.contact.whatsapp,
      value: `+${contact.whatsapp}`,
      href: whatsappUrl(contact.whatsapp),
      ltr: true,
      external: true,
    },
    { icon: Mail, label: dict.contact.email, value: contact.email, href: `mailto:${contact.email}` },
    { icon: MapPin, label: dict.contact.address, value: tr(contact.address, locale), href: contact.mapUrl, external: true },
  ];

  return (
    <section id="contact" aria-labelledby="contact-title" className="py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="contact-title"
          eyebrow={tr(home.contact.eyebrow, locale)}
          title={tr(home.contact.title, locale)}
          subtitle={tr(home.contact.subtitle, locale)}
        />
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2" data-reveal>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {cards.map(({ icon: IconCmp, ...c }) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group rounded-brand-lg border-primary/8 hover:border-secondary flex items-center gap-4 border bg-white p-5 transition-all hover:shadow-md"
                  >
                    <span className="rounded-brand bg-primary text-secondary group-hover:bg-secondary group-hover:text-primary inline-flex size-12 shrink-0 items-center justify-center transition-colors">
                      <IconCmp className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="text-muted block text-sm">{c.label}</span>
                      <span className="text-primary block font-semibold break-words" dir={c.ltr ? "ltr" : undefined}>
                        {c.value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="rounded-brand-lg bg-surface text-primary flex items-center gap-3 p-5 text-sm">
              <Clock className="text-secondary-700 size-5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">{dict.contact.hours}: </span>
                {tr(contact.workingHours, locale)}
              </span>
            </p>
          </div>
          <div
            className="rounded-brand-lg border-primary/8 shadow-primary/5 border bg-white p-6 shadow-xl sm:p-8 lg:col-span-3"
            data-reveal
          >
            <ContactForm dict={dict} />
          </div>
        </div>
      </div>
    </section>
  );
}
