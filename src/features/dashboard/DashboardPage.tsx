import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Database,
  FilePlus2,
  FlaskConical,
  NotebookPen,
  ShieldCheck,
  UserPlus,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/app/auth";
import { api } from "@/shared/api/commands";
import type { AppStatus } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/Alert";
import { Badge } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { Money } from "@/shared/ui/Money";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useCompany } from "@/features/company/useCompany";
import { DEMO_MONTHLY_SALES, DEMO_STATS, DEMO_TRANSACTIONS, type DemoTx } from "./demoData";
import { SalesChart } from "./SalesChart";

const statusTone = { paid: "success", pending: "warning", overdue: "danger" } as const;

export function DashboardPage() {
  const { t, tx, dir } = useI18n();
  const { user } = useSession();
  const { company } = useCompany();
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    api.appStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const calendar = company?.calendarDisplay ?? "gregorian";
  const columns: Column<DemoTx>[] = [
    { key: "number", header: t("dashboard.columns.number"), value: (r) => r.number, sortable: true, render: (r) => <span className="num font-medium">{r.number}</span> },
    { key: "date", header: t("dashboard.columns.date"), value: (r) => r.date, sortable: true, render: (r) => <span className="whitespace-nowrap text-muted">{formatDate(r.date, calendar === "both" ? "gregorian" : calendar)}</span> },
    {
      key: "type",
      header: t("dashboard.columns.type"),
      value: (r) => r.type,
      render: (r) => tx(`dashboard.txTypes.${r.type}`),
      filterOptions: (["sale", "purchase", "receipt", "payment"] as const).map((v) => ({ value: v, label: tx(`dashboard.txTypes.${v}`) })),
    },
    { key: "party", header: t("dashboard.columns.party"), value: (r) => r.party, sortable: true },
    { key: "amount", header: t("dashboard.columns.amount"), value: (r) => Number(r.amount), sortable: true, align: "end", render: (r) => <Money value={r.amount} className="font-medium" /> },
    {
      key: "status",
      header: t("dashboard.columns.status"),
      value: (r) => r.status,
      render: (r) => <Badge tone={statusTone[r.status]}>{tx(`dashboard.txStatus.${r.status}`)}</Badge>,
      filterOptions: (["paid", "pending", "overdue"] as const).map((v) => ({ value: v, label: tx(`dashboard.txStatus.${v}`) })),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("dashboard.greeting", { name: user.fullName })} subtitle={company?.nameAr} />

      <Alert tone="warning" title={t("dashboard.demoBanner")}>
        {t("dashboard.demoBannerBody")}
      </Alert>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label={t("dashboard.title")}>
        {DEMO_STATS.map((s) => (
          <Card key={s.key} className="relative p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted">{tx(`dashboard.stats.${s.key}`)}</p>
              <Badge tone="neutral" icon={<FlaskConical className="size-3" />}>{t("dashboard.demoTag")}</Badge>
            </div>
            <Money value={s.value} className="mt-3 text-2xl font-bold text-text" />
            <p className={cn("mt-2 flex items-center gap-1 text-xs", s.change >= 0 ? "text-success" : "text-danger")}>
              {s.change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              <span className="num">{Math.abs(s.change).toFixed(1)}%</span>
              <span className="text-subtle">{t("dashboard.vsLastMonth")}</span>
            </p>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t("dashboard.salesChart")}
            subtitle={t("dashboard.salesChartSub")}
            icon={<BarChart3 className="size-5" />}
            actions={<Badge tone="neutral" icon={<FlaskConical className="size-3" />}>{t("dashboard.demoTag")}</Badge>}
          />
          <div className="p-5">
            <SalesChart data={DEMO_MONTHLY_SALES} rtl={dir === "rtl"} />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title={t("dashboard.systemStatus")} icon={<ShieldCheck className="size-5" />} />
            <dl className="flex flex-col divide-y divide-border px-5 text-sm">
              <StatusRow icon={Database} label={t("dashboard.status.database")}>
                {status?.databaseEncrypted ? (
                  <Badge tone="success">{t("dashboard.status.encrypted", { version: status.cipherVersion.split(" ")[0] ?? "" })}</Badge>
                ) : (
                  <Badge tone="danger">{t("dashboard.status.notEncrypted")}</Badge>
                )}
              </StatusRow>
              <StatusRow icon={WifiOff} label={t("dashboard.status.mode")}>{t("dashboard.status.offline")}</StatusRow>
              <StatusRow icon={NotebookPen} label={t("dashboard.status.schema")}><span className="num">v{status?.schemaVersion ?? "—"}</span></StatusRow>
              <StatusRow icon={ShieldCheck} label={t("dashboard.status.appVersion")}><span className="num">{status?.appVersion ?? "—"}</span></StatusRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title={t("dashboard.quickActions")} />
            <div className="grid grid-cols-2 gap-2 p-4">
              <QuickAction icon={FilePlus2} label={t("dashboard.actions.newInvoice")} />
              <QuickAction icon={NotebookPen} label={t("dashboard.actions.newEntry")} />
              <QuickAction icon={UserPlus} label={t("dashboard.actions.newCustomer")} />
              <QuickAction icon={BarChart3} label={t("dashboard.actions.reports")} />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={t("dashboard.recent")}
          actions={<Badge tone="neutral" icon={<FlaskConical className="size-3" />}>{t("dashboard.demoTag")}</Badge>}
        />
        <DataTable rows={DEMO_TRANSACTIONS} columns={columns} rowKey={(r) => r.id} pageSize={6} initialSort={{ key: "date", dir: "desc" }} caption={t("dashboard.recent")} />
      </Card>
    </div>
  );
}

function StatusRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="flex items-center gap-2 text-muted">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      disabled
      title={t("common.comingSoon")}
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong p-3 text-center text-xs text-muted disabled:cursor-not-allowed"
    >
      <Icon className="size-5 text-primary/70" aria-hidden="true" />
      {label}
      <span className="text-[10px] text-subtle">{t("common.comingSoon")}</span>
    </button>
  );
}
