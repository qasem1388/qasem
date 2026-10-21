import { Download, FileText, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusForm } from "@/components/admin/status-form";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { quoteStatuses } from "@/lib/inbox-status";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";
import { deleteQuote, updateQuote } from "../../../actions/inbox";

export const metadata = { title: "طلب عرض سعر" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeStyle: "short" });
const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export default async function QuotePage({ params }: PageProps<"/admin/quotes/[id]">) {
  const me = await requireUser("inbox.view");
  const { id } = await params;
  const quote = await db.quoteRequest.findUnique({ where: { id }, include: { attachment: true } });
  if (!quote) notFound();
  const service = await db.service.findUnique({ where: { slug: quote.serviceSlug }, select: { title: true } });
  const canManage = can(me.role, "inbox.manage");
  const st = quoteStatuses[quote.status];

  return (
    <>
      <PageTitle
        title={quote.company ? `${quote.name} — ${quote.company}` : quote.name}
        description={`${quote.reference} — ${fmt.format(quote.createdAt)}`}
        actions={
          canManage && (
            <form action={deleteQuote.bind(null, quote.id)}>
              <button
                type="submit"
                className="rounded-brand inline-flex h-10 items-center border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                حذف الطلب
              </button>
            </form>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="تفاصيل الطلب" actions={<Badge tone={st.tone}>{st.label}</Badge>}>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">الخدمة المطلوبة</dt>
                <dd className="text-primary font-semibold">
                  {(service?.title as Localized | undefined)?.ar ?? quote.serviceSlug}
                </dd>
              </div>
              <div>
                <dt className="text-muted">الرقم المرجعي</dt>
                <dd className="text-primary font-mono font-semibold" dir="ltr">
                  {quote.reference}
                </dd>
              </div>
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <Mail className="size-3.5" aria-hidden /> البريد
                </dt>
                <dd>
                  <a
                    href={`mailto:${quote.email}?subject=${encodeURIComponent(`عرض السعر ${quote.reference}`)}`}
                    className="text-accent font-semibold"
                    dir="ltr"
                  >
                    {quote.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <Phone className="size-3.5" aria-hidden /> الجوال
                </dt>
                <dd>
                  <a href={`tel:${quote.phone}`} className="text-accent font-semibold" dir="ltr">
                    {quote.phone}
                  </a>
                </dd>
              </div>
            </dl>
            <h3 className="text-muted mt-6 mb-2 text-sm font-semibold">وصف الاحتياج</h3>
            <p className="text-ink/85 leading-8 whitespace-pre-line">{quote.details}</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="المرفق">
            {quote.attachment ? (
              <a
                href={`/admin/files/${quote.attachment.id}`}
                className="rounded-brand border-primary/10 hover:border-secondary flex items-center gap-3 border p-3"
              >
                <FileText className="text-accent size-8 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="text-primary block truncate text-sm font-semibold">{quote.attachment.originalName}</span>
                  <span className="text-muted text-xs" dir="ltr">
                    {quote.attachment.kind.toUpperCase()} · {size(quote.attachment.size)}
                  </span>
                </span>
                <Download className="text-primary size-5" aria-hidden />
                <span className="sr-only">تنزيل</span>
              </a>
            ) : (
              <p className="text-muted text-sm">لا يوجد مرفق.</p>
            )}
          </Card>
          <Card title="المتابعة">
            <StatusForm
              action={updateQuote.bind(null, quote.id)}
              status={quote.status}
              notes={quote.notes ?? ""}
              canManage={canManage}
              options={Object.entries(quoteStatuses).map(([value, s]) => ({ value, label: s.label }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
