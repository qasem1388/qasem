import { Briefcase, Building2, FileText, FolderKanban, Handshake, Inbox, MessageSquare, Newspaper, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageTitle, Table, Td } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { auditLabels } from "@/server/audit";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";

export const metadata = { title: "الرئيسية" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const user = await requireUser("dashboard.view");
  const [services, projects, news, jobs, clients, sectors, users, messages, quotes, applications] = await Promise.all([
    db.service.count(),
    db.project.count(),
    db.newsPost.count(),
    db.job.count({ where: { open: true } }),
    db.client.count(),
    db.sector.count(),
    db.user.count({ where: { active: true } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.quoteRequest.count({ where: { status: "NEW" } }),
    db.jobApplication.count({ where: { status: "NEW" } }),
  ]);
  const showAudit = can(user.role, "audit.view");
  const recent = showAudit
    ? await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } })
    : [];

  const content = [
    { label: "الخدمات", value: services, icon: Building2 },
    { label: "المشاريع", value: projects, icon: FolderKanban },
    { label: "الأخبار والمقالات", value: news, icon: Newspaper },
    { label: "الوظائف المتاحة", value: jobs, icon: Briefcase },
    { label: "العملاء والشركاء", value: clients, icon: Handshake },
    { label: "القطاعات", value: sectors, icon: FileText },
  ];
  const inbox = [
    { label: "رسائل جديدة", value: messages, icon: MessageSquare, href: "/admin/messages?status=NEW" },
    { label: "طلبات عروض أسعار جديدة", value: quotes, icon: Inbox, href: "/admin/quotes?status=NEW" },
    { label: "طلبات توظيف جديدة", value: applications, icon: Users, href: "/admin/applications?status=NEW" },
  ];

  return (
    <>
      <PageTitle title={`مرحبًا، ${user.name}`} description="نظرة عامة على محتوى الموقع والطلبات الواردة." />

      <h2 className="sr-only">الطلبات الواردة</h2>
      <ul className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {inbox.map(({ icon: I, ...s }) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="rounded-brand-lg bg-primary hover:bg-primary-900 flex items-center gap-4 p-5 text-white transition-colors"
            >
              <span className="rounded-brand bg-secondary text-primary inline-flex size-12 items-center justify-center">
                <I className="size-6" aria-hidden />
              </span>
              <span>
                <span className="block text-2xl font-bold">{s.value}</span>
                <span className="text-sm text-white/70">{s.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="text-primary mb-3 text-lg font-bold">محتوى الموقع</h2>
      <ul className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {content.map(({ icon: I, ...s }) => (
          <li key={s.label} className="rounded-brand-lg border-primary/8 border bg-white p-5">
            <I className="text-secondary-700 size-5" aria-hidden />
            <p className="text-primary mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-muted text-sm">{s.label}</p>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {showAudit ? (
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-primary text-lg font-bold">آخر العمليات</h2>
              <Link href="/admin/audit" className="text-accent text-sm font-semibold hover:underline">
                عرض السجل كاملًا
              </Link>
            </div>
            <Table head={["العملية", "المستخدم", "الوقت"]} empty={recent.length ? undefined : "لا توجد عمليات بعد."}>
              {recent.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Badge tone={r.action.includes("failed") || r.action.includes("blocked") ? "red" : "blue"}>
                      {auditLabels[r.action] ?? r.action}
                    </Badge>
                  </Td>
                  <Td>{r.user?.name ?? "—"}</Td>
                  <Td className="text-muted">{fmt.format(r.createdAt)}</Td>
                </tr>
              ))}
            </Table>
          </div>
        ) : null}
        <Card title="معلومات" className={showAudit ? "" : "lg:col-span-3"}>
          <ul className="text-ink/80 space-y-3 text-sm">
            <li className="flex justify-between">
              <span>المستخدمون النشطون</span>
              <strong className="text-primary">{users}</strong>
            </li>
            <li className="flex justify-between">
              <span>بيئة التشغيل</span>
              <strong className="text-primary">{process.env.NODE_ENV === "production" ? "إنتاج" : "تطوير"}</strong>
            </li>
          </ul>
          <p className="rounded-brand bg-secondary-50 text-secondary-700 mt-5 p-3 text-xs leading-6">
            راجع «الإشعارات والبريد» لتحديد من تصله تنبيهات الطلبات الجديدة.
          </p>
        </Card>
      </div>
    </>
  );
}
