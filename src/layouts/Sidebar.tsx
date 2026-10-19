import { NavLink } from "react-router-dom";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { MODULE_GROUPS, MODULES } from "@/app/modules";
import { useSession } from "@/app/auth";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { LogoMark } from "@/shared/ui/Logo";

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t, tx } = useI18n();
  const { can } = useSession();
  const visible = MODULES.filter((m) => can(m.permission));

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar text-sidebar-text transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
      aria-label={t("app.name")}
    >
      <div className={cn("flex h-16 items-center gap-3 border-b border-white/5", collapsed ? "justify-center px-2" : "px-5")}>
        <LogoMark className="size-9 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-lg font-bold text-white">{t("app.name")}</p>
            <p className="text-[11px] tracking-wider text-sidebar-text/70">HESABATI</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {MODULE_GROUPS.map((group) => {
          const items = visible.filter((m) => m.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-sidebar-text/55">
                  {tx(`nav.groups.${group}`)}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((m) => (
                  <li key={m.key}>
                    <NavLink
                      to={m.path}
                      end={m.path === "/"}
                      title={collapsed ? t(m.label) : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-sidebar-active font-semibold text-white shadow-[inset_-3px_0_0_#2bb3a3]"
                            : "hover:bg-white/5 hover:text-white",
                        )
                      }
                    >
                      <m.icon className="size-[18px] shrink-0" aria-hidden="true" />
                      {!collapsed && (
                        <>
                          <span className="truncate">{t(m.label)}</span>
                          {m.status === "planned" && (
                            <span className="ms-auto rounded bg-white/5 px-1.5 py-px text-[10px] text-sidebar-text/60">
                              {t("common.comingSoon")}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggle}
        className="flex h-12 items-center justify-center gap-2 border-t border-white/5 text-xs text-sidebar-text/70 hover:text-white"
        aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
      >
        {collapsed ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
        {!collapsed && t("nav.collapse")}
      </button>
    </aside>
  );
}
