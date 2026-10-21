import Link from "next/link";
import { InboxToolbar, one, searchWhere } from "@/components/admin/inbox-toolbar";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { quoteStatuses, type QuoteStatus } from "@/lib/inbox-status";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "طلبات عروض الأسعار" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function QuotesPage({ searchParams }: PageProps<"/admin/quotes">) {
  await requireUser("inbox.view");
  const sp = await searchParams;
  const status = one(sp.status) && one(sp.status)! in quoteStatuses ? (one(sp.status) as QuoteStatus) : undefined;
  const q = one(sp.q);
  const service = one(sp.service);
  const base = { ...searchWhere(q), ...(service ? { serviceSlug: service } : {}) };
  const [rows, groups, services] = await Promise.all([
    db.quoteRequest.findMany({ where: { ...base, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.quoteRequest.groupBy({ by: ["status"], _count: true, where: base }),
    db.service.findMany({ orderBy: { order: "asc" }, select: { slug: true, title: true } }),
  ]);
  const serviceName = (slug: string) => (services.find((s) => s.slug === slug)?.title as Localized | undefined)?.ar ?? slug;

  return (
    <>
      <PageTitle
        title="طلبات عروض الأسعار"
        description="الطلبات الواردة من نموذج «طلب عرض سعر» مع المرفقات. تابع كل طلب حتى إغلاقه."
      />
      {sp.deleted && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تم حذف الطلب ومرفقه.
        </p>
      )}
      <InboxToolbar
        base="/admin/quotes"
        statuses={quoteStatuses}
        counts={Object.fromEntries(groups.map((g) => [g.status, g._count]))}
        status={status}
        q={q}
        exportType="quotes"
        extra={{ service }}
      />
      <form className="mb-4 flex items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {q && <input type="hidden" name="q" value={q} />}
        <label htmlFor="svc" className="text-muted text-sm">
          الخدمة
        </label>
        <select
          id="svc"
          name="service"
          defaultValue={service ?? ""}
          className="rounded-brand border-primary/15 h-9 border bg-white px-2 text-sm"
        >
          <option value="">كل الخدمات</option>
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>
              {(s.title as Localized).ar}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-brand bg-primary h-9 px-3 text-sm font-semibold text-white">
          تصفية
        </button>
      </form>
      <Table head={["الرقم المرجعي", "العميل", "الخدمة", "التاريخ", "الحالة"]} empty={rows.length ? undefined : "لا توجد طلبات."}>
        {rows.map((r) => (
          <tr key={r.id} className={r.status === "NEW" ? "bg-primary-50/40" : undefined}>
            <Td>
              <Link
                href={`/admin/quotes/${r.id}`}
                className="text-accent font-mono text-xs font-semibold whitespace-nowrap hover:underline"
                dir="ltr"
              >
                {r.reference}
              </Link>
            </Td>
            <Td>
              <Link href={`/admin/quotes/${r.id}`} className="text-primary font-semibold hover:underline">
                {r.name}
              </Link>
              <span className="text-muted block text-xs">{r.company}</span>
            </Td>
            <Td>{serviceName(r.serviceSlug)}</Td>
            <Td className="text-muted whitespace-nowrap">{fmt.format(r.createdAt)}</Td>
            <Td>
              <Badge tone={quoteStatuses[r.status].tone}>{quoteStatuses[r.status].label}</Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
