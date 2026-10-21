import { AdminShell, type AdminNavGroup, type AdminNavItem } from "@/components/admin/shell";
import { getSiteSettings } from "@/lib/content";
import { resourceByKey } from "@/lib/resources/definitions";
import { can, roleLabels } from "@/server/auth/permissions";
import { requireUser } from "@/server/auth/session";
import { logout } from "../actions/auth";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const settings = await getSiteSettings();

  const has = (p: Parameters<typeof can>[1]) => can(user.role, p);
  const contentItems = (keys: (keyof typeof resourceByKey & AdminNavItem["icon"])[]): AdminNavItem[] =>
    has("content.view") ? keys.map((k) => ({ href: `/admin/content/${k}`, label: resourceByKey[k].label, icon: k })) : [];
  const nav: AdminNavGroup[] = [
    { items: [{ href: "/admin", label: "الرئيسية", icon: "dashboard" }] },
    {
      title: "المحتوى",
      items: [
        ...(has("content.edit") ? [{ href: "/admin/homepage", label: "الصفحة الرئيسية", icon: "home" } as const] : []),
        ...contentItems([
          "services",
          "service-categories",
          "projects",
          "sectors",
          "news",
          "photos",
          "videos",
          "clients",
          "testimonials",
          "stories",
          "faqs",
        ]),
        ...(has("content.edit") ? [{ href: "/admin/pages", label: "الصفحات", icon: "pages" } as const] : []),
        { href: "/admin/media", label: "مكتبة الوسائط", icon: "media" },
      ],
    },
    {
      title: "التوظيف",
      items: [
        ...contentItems(["jobs"]),
        ...(has("inbox.view") ? [{ href: "/admin/applications", label: "طلبات التوظيف", icon: "applications" } as const] : []),
      ],
    },
    ...(has("settings.manage")
      ? [
          {
            title: "الإعدادات",
            items: [
              { href: "/admin/settings/identity", label: "الهوية التجارية", icon: "identity" },
              { href: "/admin/settings/company", label: "بيانات المنشأة", icon: "company" },
              { href: "/admin/settings/branches", label: "الفروع", icon: "branches" },
              { href: "/admin/menus", label: "القوائم", icon: "menus" },
              { href: "/admin/settings/footer", label: "التذييل", icon: "footer" },
              { href: "/admin/settings/general", label: "الإعدادات العامة", icon: "general" },
            ] satisfies AdminNavItem[],
          },
        ]
      : []),
    {
      title: "الإدارة",
      items: [
        ...(has("users.manage") ? [{ href: "/admin/users", label: "المستخدمون والصلاحيات", icon: "users" } as const] : []),
        ...(has("audit.view") ? [{ href: "/admin/audit", label: "سجل العمليات", icon: "audit" } as const] : []),
        { href: "/admin/account", label: "حسابي", icon: "account" },
      ],
    },
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
