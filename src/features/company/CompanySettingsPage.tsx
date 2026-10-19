import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useSession } from "@/app/auth";
import { api } from "@/shared/api/commands";
import { ApiError } from "@/shared/api/client";
import type { CompanyInput } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { formatDateTime } from "@/shared/lib/format";
import { companySchema, zodFieldErrors } from "@/shared/validation/schemas";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { FullScreenLoader } from "@/shared/ui/Spinner";
import { errorText } from "@/shared/lib/errors";
import { CompanyForm, companyToForm, type CompanyFormState } from "./CompanyForm";
import { useCompany } from "./useCompany";

export function CompanySettingsPage() {
  const { t, tx } = useI18n();
  const { token, can } = useSession();
  const { company, setCompany, error: loadError } = useCompany();
  const canEdit = can("company_manage");

  const [form, setForm] = useState<CompanyFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (company && !form) setForm(companyToForm(company));
  }, [company, form]);

  const dirty = useMemo(
    () => !!form && !!company && JSON.stringify(form) !== JSON.stringify(companyToForm(company)),
    [form, company],
  );

  if (loadError) return <Alert tone="danger">{errorText(loadError, tx)}</Alert>;
  if (!company || !form) return <FullScreenLoader label={t("app.loading")} />;

  const save = async () => {
    setMessage(null);
    const parsed = companySchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      setMessage({ tone: "danger", text: t("errors.validation") });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = await api.companyUpdate(token, parsed.data as CompanyInput);
      setCompany(updated);
      setForm(companyToForm(updated));
      setMessage({ tone: "success", text: t("common.saved") });
    } catch (e) {
      if (e instanceof ApiError && e.code === "validation") setErrors(e.fieldMap());
      setMessage({ tone: "danger", text: errorText(e, tx) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("company.title")}
        subtitle={t("company.subtitle")}
        actions={
          canEdit && (
            <Button onClick={() => void save()} loading={saving} disabled={!dirty} icon={<Save className="size-4" />}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {!canEdit && <Alert tone="info">{t("company.readOnly")}</Alert>}
        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) void save();
            }}
            noValidate
          >
            <CompanyForm value={form} onChange={setForm} errors={errors} disabled={!canEdit || saving} />
            <button type="submit" hidden />
          </form>
        </Card>
        <p className="text-xs text-subtle">
          {t("company.lastUpdated")}: <span className="num">{formatDateTime(company.updatedAt)}</span>
        </p>
      </div>
    </div>
  );
}
