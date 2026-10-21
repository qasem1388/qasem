"use client";

import {
  Briefcase,
  BriefcaseBusiness,
  CircleHelp,
  Factory,
  FolderKanban,
  Handshake,
  Image as ImageIcon,
  Inbox,
  MessageSquareQuote,
  Newspaper,
  Tags,
  Trophy,
  Video,
  Building,
  ExternalLink,
  FileClock,
  FileText,
  Home,
  Images,
  LayoutDashboard,
  ListTree,
  LogOut,
  MapPinned,
  Menu,
  Palette,
  PanelBottom,
  Settings2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const icons = {
  dashboard: LayoutDashboard,
  users: Users,
  audit: FileClock,
  account: UserCog,
  home: Home,
  pages: FileText,
  menus: ListTree,
  media: Images,
  identity: Palette,
  company: Building,
  branches: MapPinned,
  footer: PanelBottom,
  general: Settings2,
  services: Briefcase,
  "service-categories": Tags,
  projects: FolderKanban,
  sectors: Factory,
  news: Newspaper,
  photos: ImageIcon,
  videos: Video,
  clients: Handshake,
  testimonials: MessageSquareQuote,
  stories: Trophy,
  faqs: CircleHelp,
  jobs: BriefcaseBusiness,
  applications: Inbox,
} as const;
export type AdminNavItem = { href: string; label: string; icon: keyof typeof icons };
export type AdminNavGroup = { title?: string; items: AdminNavItem[] };

export function AdminShell({
  nav,
  user,
  siteName,
  logout,
  children,
}: {
  nav: AdminNavGroup[];
  user: { name: string; roleLabel: string };
  siteName: string;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-white/10 px-5">
        <Link href="/admin" className="truncate font-bold">
          {siteName}
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="lg:hidden" aria-label="إغلاق القائمة">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <nav aria-label="قائمة لوحة التحكم" className="flex-1 overflow-y-auto p-3">
        {nav.map((group, gi) => (
          <div key={gi} className={gi ? "mt-5" : undefined}>
            {group.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-white/40">{group.title}</p>}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = icons[item.icon];
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-brand flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                        active ? "bg-secondary text-primary" : "text-white/75 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3 text-sm">
        <a
          href="/ar"
          target="_blank"
          className="rounded-brand flex items-center gap-3 px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="size-4.5" aria-hidden />
          عرض الموقع
        </a>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-brand flex w-full items-center gap-3 px-3 py-2.5 text-white/75 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4.5 rtl:-scale-x-100" aria-hidden />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-surface min-h-dvh lg:flex">
      <aside className="bg-primary sticky top-0 hidden h-dvh w-64 shrink-0 text-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة لوحة التحكم">
          <div className="bg-primary/60 absolute inset-0" onClick={() => setOpen(false)} />
          <aside className="bg-primary absolute inset-y-0 start-0 w-72 text-white shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="border-primary/8 sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-brand bg-primary inline-flex size-10 items-center justify-center text-white lg:hidden"
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="ms-auto flex items-center gap-3">
            <div className="text-end leading-tight">
              <p className="text-primary text-sm font-semibold">{user.name}</p>
              <p className="text-muted text-xs">{user.roleLabel}</p>
            </div>
            <span
              className="bg-primary text-secondary inline-flex size-10 items-center justify-center rounded-full font-bold"
              aria-hidden
            >
              {user.name.charAt(0)}
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
