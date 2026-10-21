import Link from "next/link";
import { InboxToolbar, one, searchWhere } from "@/components/admin/inbox-toolbar";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { messageStatuses, type MessageStatus } from "@/lib/inbox-status";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "رسائل التواصل" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireUser("inbox.view");
  const sp = await searchParams;
  const status = one(sp.status) && one(sp.status)! in messageStatuses ? (one(sp.status) as MessageStatus) : undefined;
  const q = one(sp.q);
  const base = searchWhere(q);
  const [rows, groups] = await Promise.all([
    db.contactMessage.findMany({ where: { ...base, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.contactMessage.groupBy({ by: ["status"], _count: true, where: base }),
  ]);
  return (
    <>
      <PageTitle title="رسائل التواصل" description="الرسائل الواردة من نموذج «تواصل معنا» في الموقع." />
      {sp.deleted && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تم حذف الرسالة.
        </p>
      )}
      <InboxToolbar
        base="/admin/messages"
        statuses={messageStatuses}
        counts={Object.fromEntries(groups.map((g) => [g.status, g._count]))}
        status={status}
        q={q}
        exportType="messages"
      />
      <Table head={["الرقم", "المرسل", "الرسالة", "التاريخ", "الحالة"]} empty={rows.length ? undefined : "لا توجد رسائل."}>
        {rows.map((m) => (
          <tr key={m.id} className={m.status === "NEW" ? "bg-primary-50/40 font-semibold" : undefined}>
            <Td>
              <Link
                href={`/admin/messages/${m.id}`}
                className="text-accent font-mono text-xs whitespace-nowrap hover:underline"
                dir="ltr"
              >
                {m.reference}
              </Link>
            </Td>
            <Td>
              <Link href={`/admin/messages/${m.id}`} className="text-primary hover:underline">
                {m.name}
              </Link>
              <span className="text-muted block text-xs font-normal" dir="ltr">
                {m.email}
              </span>
            </Td>
            <Td className="text-ink/75 max-w-sm truncate font-normal">{m.message}</Td>
            <Td className="text-muted font-normal whitespace-nowrap">{fmt.format(m.createdAt)}</Td>
            <Td>
              <Badge tone={messageStatuses[m.status].tone}>{messageStatuses[m.status].label}</Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
