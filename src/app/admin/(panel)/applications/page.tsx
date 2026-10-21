import Link from "next/link";
import { InboxToolbar, searchWhere } from "@/components/admin/inbox-toolbar";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { applicationStatuses, type ApplicationStatus } from "@/lib/application-status";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";

export const metadata = { title: "طلبات التوظيف" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireUser("inbox.view");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in applicationStatuses ? (sp.status as ApplicationStatus) : undefined;
  const jobId = typeof sp.job === "string" ? sp.job : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const filter = { ...searchWhere(q), ...(jobId ? { jobId } : {}) };
  const where = { ...filter, ...(status ? { status } : {}) };

  const [apps, counts, jobs] = await Promise.all([
    db.jobApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { job: { select: { title: true } } },
    }),
    db.jobApplication.groupBy({ by: ["status"], _count: true, where: filter }),
    db.job.findMany({ orderBy: { postedAt: "desc" }, select: { id: true, title: true } }),
  ]);

  return (
    <>
      <PageTitle
        title="طلبات التوظيف"
        description="الطلبات الواردة من صفحات الوظائف مع السير الذاتية. حدّث حالة كل طلب وأضف ملاحظاتك الداخلية."
      />
      {sp.deleted && (
        <p role="status" className="rounded-brand mb-4 bg-emerald-50 p-3 text-sm text-emerald-800">
          تم حذف الطلب والسيرة الذاتية المرفقة.
        </p>
      )}
      <InboxToolbar
        base="/admin/applications"
        statuses={applicationStatuses}
        counts={Object.fromEntries(counts.map((c) => [c.status, c._count]))}
        status={status}
        q={q}
        exportType="applications"
        extra={{ job: jobId }}
      />
      <form className="mb-4 flex items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {q && <input type="hidden" name="q" value={q} />}
        <label htmlFor="job-filter" className="text-muted text-sm">
          الوظيفة
        </label>
        <select
          id="job-filter"
          name="job"
          defaultValue={jobId ?? ""}
          className="rounded-brand border-primary/15 h-9 border bg-white px-2 text-sm"
        >
          <option value="">كل الوظائف</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {(j.title as Localized).ar}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-brand bg-primary h-9 px-3 text-sm font-semibold text-white">
          تصفية
        </button>
      </form>
      <Table
        head={["الرقم المرجعي", "المتقدم", "الوظيفة", "تاريخ التقديم", "الحالة"]}
        empty={apps.length ? undefined : "لا توجد طلبات."}
      >
        {apps.map((a) => (
          <tr key={a.id} className={a.status === "NEW" ? "bg-primary-50/40" : undefined}>
            <Td>
              <Link
                href={`/admin/applications/${a.id}`}
                className="text-accent font-mono text-xs font-semibold whitespace-nowrap hover:underline"
                dir="ltr"
              >
                {a.reference}
              </Link>
            </Td>
            <Td>
              <Link href={`/admin/applications/${a.id}`} className="text-primary font-semibold hover:underline">
                {a.name}
              </Link>
              <span className="text-muted block text-xs" dir="ltr">
                {a.email}
              </span>
            </Td>
            <Td>{a.job ? (a.job.title as Localized).ar : <span className="text-muted">طلب عام</span>}</Td>
            <Td className="text-muted whitespace-nowrap">{fmt.format(a.createdAt)}</Td>
            <Td>
              <Badge tone={applicationStatuses[a.status].tone}>{applicationStatuses[a.status].label}</Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
