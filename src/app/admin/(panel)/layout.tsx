import { AdminShell, type AdminNavItem } from "@/components/admin/shell";
import { getSiteSettings } from "@/lib/content";
import { can, roleLabels } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { logout } from "../actions/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const settings = await getSiteSettings();

  const nav: AdminNavItem[] = [
    { href: "/admin", label: "الرئيسية", icon: "dashboard" },
    ...(can(user.role, "users.manage") ? [{ href: "/admin/users", label: "المستخدمون والصلاحيات", icon: "users" } as const] : []),
    ...(can(user.role, "audit.view") ? [{ href: "/admin/audit", label: "سجل العمليات", icon: "audit" } as const] : []),
    { href: "/admin/account", label: "حسابي", icon: "account" },
  ];

  return (
    <AdminShell
      nav={nav}
      user={{ name: user.name, roleLabel: roleLabels[user.role] }}
      siteName={settings.name.ar}
      logout={logout}
    >
      {children}
    </AdminShell>
  );
}
