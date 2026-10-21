import { Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusForm } from "@/components/admin/status-form";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { db } from "@/lib/db";
import { messageStatuses } from "@/lib/inbox-status";
import { whatsappUrl } from "@/lib/utils";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { deleteMessage, updateMessage } from "../../../actions/inbox";

export const metadata = { title: "رسالة تواصل" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeStyle: "short" });

export default async function MessagePage({ params }: PageProps<"/admin/messages/[id]">) {
  const me = await requireUser("inbox.view");
  const { id } = await params;
  let msg = await db.contactMessage.findUnique({ where: { id } });
  if (!msg) notFound();
  const canManage = can(me.role, "inbox.manage");
  // Opening a new message marks it as read (only for users who can manage the inbox).
  if (msg.status === "NEW" && canManage) msg = await db.contactMessage.update({ where: { id }, data: { status: "READ" } });
  const st = messageStatuses[msg.status];
  const phone = msg.phone.replace(/^0/, "966");

  return (
    <>
      <PageTitle
        title={msg.name}
        description={`${msg.reference} — ${fmt.format(msg.createdAt)} — ${msg.locale === "en" ? "من الموقع الإنجليزي" : "من الموقع العربي"}`}
        actions={
          canManage && (
            <form action={deleteMessage.bind(null, msg.id)}>
              <button
                type="submit"
                className="rounded-brand inline-flex h-10 items-center border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                حذف الرسالة
              </button>
            </form>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="الرسالة" actions={<Badge tone={st.tone}>{st.label}</Badge>}>
            <p className="text-ink/85 leading-8 whitespace-pre-line">{msg.message}</p>
          </Card>
          <Card title="الرد على المرسل">
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${msg.email}?subject=${encodeURIComponent(`رد على رسالتك ${msg.reference}`)}`}
                className="rounded-brand bg-primary inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold text-white"
              >
                <Mail className="size-4" aria-hidden /> <span dir="ltr">{msg.email}</span>
              </a>
              <a
                href={`tel:${msg.phone}`}
                className="rounded-brand border-primary/15 text-primary inline-flex h-10 items-center gap-2 border px-4 text-sm font-semibold"
              >
                <Phone className="size-4" aria-hidden /> <span dir="ltr">{msg.phone}</span>
              </a>
              <a
                href={whatsappUrl(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-brand text-primary inline-flex h-10 items-center gap-2 bg-[#25D366] px-4 text-sm font-semibold"
              >
                <WhatsAppIcon className="size-4" /> واتساب
              </a>
            </div>
          </Card>
        </div>
        <Card title="المتابعة">
          <StatusForm
            action={updateMessage.bind(null, msg.id)}
            status={msg.status}
            notes={msg.notes ?? ""}
            canManage={canManage}
            options={Object.entries(messageStatuses).map(([value, s]) => ({ value, label: s.label }))}
          />
        </Card>
      </div>
    </>
  );
}
