import { NotificationsEditor } from "@/components/admin/notifications-editor";
import { Badge, Card, PageTitle, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { mailConfig } from "@/server/mail";
import { getNotificationSettings } from "@/server/notify";

export const metadata = { title: "الإشعارات والبريد" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "short", timeStyle: "short" });
const kindLabel: Record<string, string> = {
  contact: "تنبيه رسالة",
  quote: "تنبيه عرض سعر",
  application: "تنبيه توظيف",
  "contact.reply": "تأكيد للمرسل",
  "quote.reply": "تأكيد للمرسل",
  "application.reply": "تأكيد للمتقدم",
  test: "اختبار",
};
const statusBadge = {
  SENT: <Badge tone="green">أُرسلت</Badge>,
  FAILED: <Badge tone="red">فشلت</Badge>,
  SKIPPED: <Badge tone="gray">لم تُرسل</Badge>,
};

export default async function NotificationsPage() {
  await requireUser("settings.manage");
  const [settings, logs] = await Promise.all([
    getNotificationSettings(),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const cfg = mailConfig();
  return (
    <>
      <PageTitle title="الإشعارات والبريد" description="تنبيهات الفريق عند وصول رسالة أو طلب جديد، ورسائل التأكيد للعملاء." />
      <div className="space-y-6">
        <div>
          <NotificationsEditor initial={settings} smtp={cfg ? { host: cfg.host, from: cfg.from } : null} />
        </div>
        <Card title="سجل الإرسال (آخر 50)">
          {logs.length === 0 ? (
            <p className="text-muted text-sm">لا توجد رسائل بعد.</p>
          ) : (
            <Table head={["النوع", "إلى", "الحالة", "الوقت"]}>
              {logs.map((l) => (
                <tr key={l.id}>
                  <Td className="text-xs">{kindLabel[l.kind] ?? l.kind}</Td>
                  <Td className="max-w-40 truncate text-xs">
                    <span dir="ltr" title={l.to}>
                      {l.to}
                    </span>
                  </Td>
                  <Td>
                    <span title={l.error ?? undefined}>{statusBadge[l.status]}</span>
                    {l.error && <span className="text-muted mt-1 block max-w-48 truncate text-[11px]">{l.error}</span>}
                  </Td>
                  <Td className="text-muted text-xs whitespace-nowrap">{fmt.format(l.createdAt)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
