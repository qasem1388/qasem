import Link from "next/link";
import { Badge, PageTitle, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { auditLabels } from "@/server/audit";
import { requireUser } from "@/server/auth/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "سجل العمليات" };

const PER_PAGE = 30;
const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "medium" });

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireUser("audit.view");
  const sp = await searchParams;
  const action = typeof sp.action === "string" && sp.action in auditLabels ? sp.action : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = action ? { action } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { name: true } } },
    }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number, a = action) =>
    `/admin/audit?${new URLSearchParams({ ...(a ? { action: a } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <PageTitle
        title="سجل العمليات"
        description="العمليات الإدارية المهمة: تسجيل الدخول، تغيير كلمات المرور، وإدارة المستخدمين والمحتوى."
      />
      <nav aria-label="تصفية حسب العملية" className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...Object.keys(auditLabels)].map((a) => (
          <Link
            key={a ?? "all"}
            href={href(1, a)}
            aria-current={a === action ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              a === action ? "bg-primary text-white" : "text-ink/75 ring-primary/10 hover:bg-primary-50 bg-white ring-1",
            )}
          >
            {a ? auditLabels[a] : "الكل"}
          </Link>
        ))}
      </nav>
      <Table head={["العملية", "المستخدم", "التفاصيل", "عنوان IP", "الوقت"]} empty={rows.length ? undefined : "لا توجد سجلات."}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>
              <Badge tone={/failed|blocked|deleted/.test(r.action) ? "red" : "blue"}>{auditLabels[r.action] ?? r.action}</Badge>
            </Td>
            <Td>{r.user?.name ?? "—"}</Td>
            <Td className="text-muted max-w-xs text-xs">
              {r.details ? (
                <code dir="ltr" className="block truncate">
                  {JSON.stringify(r.details)}
                </code>
              ) : (
                "—"
              )}
            </Td>
            <Td className="text-muted">
              <span dir="ltr">{r.ip ?? "—"}</span>
            </Td>
            <Td className="text-muted whitespace-nowrap">{fmt.format(r.createdAt)}</Td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <nav aria-label="الصفحات" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            صفحة {page} من {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href(page - 1)} className="rounded-brand ring-primary/10 bg-white px-3 py-2 ring-1">
                السابق
              </Link>
            )}
            {page < pages && (
              <Link href={href(page + 1)} className="rounded-brand ring-primary/10 bg-white px-3 py-2 ring-1">
                التالي
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
