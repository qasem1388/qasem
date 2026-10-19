import { useEffect, useState } from "react";
import { History, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useSession } from "@/app/auth";
import { api } from "@/shared/api/commands";
import type { AuditRecord, Role, UserSummary } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { errorText } from "@/shared/lib/errors";
import { formatDateTime } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/Alert";
import { Badge } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { DataTable, type Column } from "@/shared/ui/DataTable";
import { PageHeader } from "@/shared/ui/PageHeader";

const roleTone: Record<Role, "primary" | "accent" | "neutral"> = { admin: "primary", accountant: "accent", cashier: "neutral" };

export function UsersPage() {
  const { t, tx } = useI18n();
  const { token, can } = useSession();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [broken, setBroken] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.usersList(token).then(setUsers),
      can("audit_view") ? api.auditRecent(token).then(setAudit) : Promise.resolve(),
      can("audit_view") ? api.auditVerify(token).then(setBroken) : Promise.resolve(),
    ]).catch((e) => setError(errorText(e, tx)));
  }, [token, can, tx]);

  const actionLabel = (a: string) => {
    const key = `users.actions.${a.replace(/\./g, "_")}`;
    const v = tx(key);
    return v === key ? a : v;
  };

  const userColumns: Column<UserSummary>[] = [
    { key: "username", header: t("users.columns.username"), value: (u) => u.username, sortable: true, render: (u) => <span className="num font-medium">{u.username}</span> },
    { key: "fullName", header: t("users.columns.fullName"), value: (u) => u.fullName, sortable: true },
    {
      key: "role",
      header: t("users.columns.role"),
      value: (u) => u.role,
      render: (u) => <Badge tone={roleTone[u.role]}>{tx(`roles.${u.role}`)}</Badge>,
      filterOptions: (["admin", "accountant", "cashier"] as const).map((r) => ({ value: r, label: tx(`roles.${r}`) })),
    },
    { key: "status", header: t("users.columns.status"), value: (u) => (u.isActive ? 1 : 0), render: (u) => <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? t("users.active") : t("users.inactive")}</Badge> },
    { key: "lastLogin", header: t("users.columns.lastLogin"), value: (u) => u.lastLoginAt, sortable: true, render: (u) => <span className="num text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : t("users.never")}</span> },
  ];

  const actions = [...new Set(audit.map((a) => a.action))];
  const auditColumns: Column<AuditRecord>[] = [
    { key: "id", header: "#", value: (a) => a.id, sortable: true, render: (a) => <span className="num text-subtle">{a.id}</span> },
    { key: "time", header: t("users.columns.time"), value: (a) => a.occurredAt, sortable: true, render: (a) => <span className="num whitespace-nowrap">{formatDateTime(a.occurredAt)}</span> },
    { key: "user", header: t("users.columns.user"), value: (a) => a.username, sortable: true, render: (a) => <span className="num">{a.username ?? "—"}</span> },
    { key: "action", header: t("users.columns.action"), value: (a) => a.action, render: (a) => actionLabel(a.action), filterOptions: actions.map((a) => ({ value: a, label: actionLabel(a) })) },
    { key: "hash", header: "SHA-256", value: (a) => a.hash, render: (a) => <code className="num text-xs text-subtle" title={a.hash}>{a.hash.slice(0, 12)}…</code> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Alert tone="info">{t("users.manageSoon")}</Alert>

      <Card>
        <CardHeader title={t("users.list")} icon={<Users className="size-5" />} />
        <DataTable rows={users} columns={userColumns} rowKey={(u) => u.id} searchable={users.length > 5} />
      </Card>

      {can("audit_view") && (
        <Card>
          <CardHeader
            title={t("users.audit")}
            subtitle={t("users.auditHint")}
            icon={<History className="size-5" />}
            actions={
              broken === undefined ? null : broken === null ? (
                <Badge tone="success" icon={<ShieldCheck className="size-3.5" />}>{t("users.chainOk")}</Badge>
              ) : (
                <Badge tone="danger" icon={<ShieldAlert className="size-3.5" />}>{t("users.chainBroken", { id: broken })}</Badge>
              )
            }
          />
          <DataTable rows={audit} columns={auditColumns} rowKey={(a) => String(a.id)} pageSize={10} initialSort={{ key: "id", dir: "desc" }} />
        </Card>
      )}
    </div>
  );
}
