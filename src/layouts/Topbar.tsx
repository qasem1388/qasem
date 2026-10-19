import { Building2, LogOut, Moon, Sun, WifiOff } from "lucide-react";
import { useAuth, useSession } from "@/app/auth";
import { useTheme } from "@/app/theme";
import { useCompany } from "@/features/company/useCompany";
import { useI18n } from "@/shared/i18n";
import { formatDate, todayIso } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/Badge";

export function Topbar() {
  const { t, tx } = useI18n();
  const { user } = useSession();
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { company } = useCompany();
  const initials = user.fullName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("");

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold text-text">{company?.nameAr ?? "…"}</p>
          {company?.vatNumber && (
            <p className="text-xs text-subtle">
              {t("company.vatNumber")}: <span className="num">{company.vatNumber}</span>
            </p>
          )}
        </div>
      </div>

      <div className="ms-auto flex items-center gap-3">
        <span className="hidden text-sm text-muted lg:inline">
          {formatDate(todayIso(), company?.calendarDisplay ?? "both")}
        </span>
        <Badge tone="success" icon={<WifiOff className="size-3" aria-hidden="true" />} className="hidden md:inline-flex">
          {t("topbar.offline")}
        </Badge>
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-text"
          aria-label={t("theme.toggle")}
          title={theme === "dark" ? t("theme.light") : t("theme.dark")}
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <div className="h-8 w-px bg-border" aria-hidden="true" />
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-text">{user.fullName}</p>
            <p className="text-xs text-subtle">{tx(`roles.${user.role}`)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"
          aria-label={t("topbar.logout")}
          title={t("topbar.logout")}
        >
          <LogOut className="size-5 rtl:rotate-180" />
        </button>
      </div>
    </header>
  );
}
