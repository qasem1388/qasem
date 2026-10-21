import { Monitor } from "lucide-react";
import { ChangePasswordForm } from "@/components/admin/account-forms";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { roleLabels } from "@/server/auth/permissions";
import { getSession, requireUser } from "@/server/auth/session";
import { revokeOtherSessions } from "../../actions/account";

export const metadata = { title: "حسابي" };

const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" });

function deviceName(ua: string | null) {
  if (!ua) return "جهاز غير معروف";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [browser, os].filter(Boolean).join(" — ") || "متصفح";
}

export default async function AccountPage() {
  const me = await requireUser();
  const current = await getSession();
  const sessions = await db.session.findMany({
    where: { userId: me.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageTitle title="حسابي" description={`${me.email} — ${roleLabels[me.role]}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="تغيير كلمة المرور">
          <ChangePasswordForm />
        </Card>
        <Card
          title="الجلسات النشطة"
          actions={
            sessions.length > 1 ? (
              <form action={revokeOtherSessions}>
                <button type="submit" className={buttonClasses("outline", "sm")}>
                  إنهاء الجلسات الأخرى
                </button>
              </form>
            ) : undefined
          }
        >
          <ul className="divide-primary/8 divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Monitor className="text-muted size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-primary text-sm font-semibold">
                    {deviceName(s.userAgent)} {s.id === current?.id && <Badge tone="green">هذا الجهاز</Badge>}
                  </p>
                  <p className="text-muted text-xs">
                    <span dir="ltr">{s.ip}</span> — منذ {fmt.format(s.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
