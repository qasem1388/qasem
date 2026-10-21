import "server-only";
import { after } from "next/server";
import { defaultNotifications, type NotificationSettings, type NotifyKind } from "@/content/defaults/notifications";
import type { Locale } from "@/i18n/config";
import { getSiteSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { autoReply, teamAlert } from "./email-templates";
import { sendMail } from "./mail";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const row = await db.setting.findUnique({ where: { key: "notifications" } });
  const v = (row?.value ?? {}) as Partial<NotificationSettings>;
  return {
    enabled: v.enabled ?? defaultNotifications.enabled,
    recipients: { ...defaultNotifications.recipients, ...v.recipients },
    autoReply: { ...defaultNotifications.autoReply, ...v.autoReply },
  };
}

const adminPath: Record<NotifyKind, string> = {
  contact: "/admin/messages",
  quote: "/admin/quotes",
  application: "/admin/applications",
};

/**
 * Schedules the team alert and the submitter's confirmation to be sent after
 * the response, so a slow or failing mail server never delays the form.
 */
export function notifySubmission(input: {
  kind: NotifyKind;
  id: string;
  reference: string;
  locale: Locale;
  name: string;
  email: string;
  fields: [string, string][];
}) {
  after(async () => {
    try {
      const [settings, site] = await Promise.all([getNotificationSettings(), getSiteSettings()]);
      if (!settings.enabled) return;
      const brand = { name: site.name.ar, primary: site.brand.primary, secondary: site.brand.secondary };
      const alert = teamAlert(
        brand,
        input.kind,
        input.reference,
        input.fields,
        `${siteUrl()}${adminPath[input.kind]}/${input.id}`,
      );
      for (const to of settings.recipients[input.kind]) {
        await sendMail({ kind: input.kind, to, ...alert, replyTo: input.email });
      }
      if (settings.autoReply[input.kind]) {
        const brandLocal = { ...brand, name: site.name[input.locale] || site.name.ar };
        await sendMail({
          kind: `${input.kind}.reply`,
          to: input.email,
          ...autoReply(brandLocal, input.kind, input.locale, input.reference, input.name, {
            phone: site.contact.phoneDisplay,
            email: site.contact.email,
          }),
        });
      }
    } catch (e) {
      console.error("notification failed", e);
    }
  });
}
