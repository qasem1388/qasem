import { Download, FileText, Mail, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusForm } from "@/components/admin/status-form";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { applicationStatuses } from "@/lib/application-status";
import { db } from "@/lib/db";
import { can } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import type { Localized } from "@/types/content";
import { deleteApplication, updateApplication } from "../../../actions/applications";

export const metadata = { title: "طلب توظيف" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "long", timeStyle: "short" });
const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export default async function ApplicationPage({ params }: PageProps<"/admin/applications/[id]">) {
  const me = await requireUser("inbox.view");
  const { id } = await params;
  const app = await db.jobApplication.findUnique({ where: { id }, include: { job: true, cv: true } });
  if (!app) notFound();
  const canManage = can(me.role, "inbox.manage");
  const st = applicationStatuses[app.status];

  return (
    <>
      <PageTitle
        title={app.name}
        description={`${app.job ? (app.job.title as Localized).ar : "طلب عام"} — ${fmt.format(app.createdAt)}`}
        actions={
          canManage && (
            <form action={deleteApplication.bind(null, app.id)}>
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
          <Card title="بيانات المتقدم" actions={<Badge tone={st.tone}>{st.label}</Badge>}>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">الرقم المرجعي</dt>
                <dd className="text-primary font-mono font-semibold" dir="ltr">
                  {app.reference}
                </dd>
              </div>
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <Mail className="size-3.5" aria-hidden /> البريد
                </dt>
                <dd>
                  <a href={`mailto:${app.email}`} className="text-accent font-semibold" dir="ltr">
                    {app.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <Phone className="size-3.5" aria-hidden /> الجوال
                </dt>
                <dd>
                  <a href={`tel:${app.phone}`} className="text-accent font-semibold" dir="ltr">
                    {app.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> المدينة
                </dt>
                <dd className="text-primary font-semibold">{app.city || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">سنوات الخبرة</dt>
                <dd className="text-primary font-semibold">{app.experience || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">LinkedIn</dt>
                <dd>
                  {app.linkedin ? (
                    <a
                      href={app.linkedin}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-accent break-all"
                      dir="ltr"
                    >
                      {app.linkedin}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          <Card title="نبذة المتقدم">
            <p className="text-ink/80 text-sm leading-7 whitespace-pre-line">{app.coverLetter || "لم يكتب المتقدم نبذة."}</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="السيرة الذاتية">
            {app.cv ? (
              <a
                href={`/admin/files/${app.cv.id}`}
                className="rounded-brand border-primary/10 hover:border-secondary flex items-center gap-3 border p-3"
              >
                <FileText className="size-8 shrink-0 text-red-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="text-primary block truncate text-sm font-semibold">{app.cv.originalName}</span>
                  <span className="text-muted text-xs" dir="ltr">
                    {app.cv.kind.toUpperCase()} · {size(app.cv.size)}
                  </span>
                </span>
                <Download className="text-primary size-5" aria-hidden />
                <span className="sr-only">تنزيل</span>
              </a>
            ) : (
              <p className="text-muted text-sm">الملف غير متاح.</p>
            )}
          </Card>
          <Card title="المتابعة">
            <StatusForm
              action={updateApplication.bind(null, app.id)}
              status={app.status}
              notes={app.notes ?? ""}
              canManage={canManage}
              options={Object.entries(applicationStatuses).map(([value, s]) => ({ value, label: s.label }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
