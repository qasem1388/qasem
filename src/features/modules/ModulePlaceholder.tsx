import { useNavigate, useParams } from "react-router-dom";
import { Check, Construction } from "lucide-react";
import { MODULES } from "@/app/modules";
import { useI18n } from "@/shared/i18n";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { NotFoundPage } from "@/features/system/StatusPages";

/** Landing page for modules scheduled for later phases. */
export function ModulePlaceholder() {
  const { t } = useI18n();
  const { moduleKey } = useParams();
  const navigate = useNavigate();
  const mod = MODULES.find((m) => m.key === moduleKey && m.status === "planned");
  if (!mod) return <NotFoundPage />;

  return (
    <div className="flex justify-center py-10">
      <Card className="w-full max-w-2xl p-10 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <mod.icon className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{t(mod.label)}</h1>
        <div className="mt-3 flex justify-center gap-2">
          <Badge tone="warning" icon={<Construction className="size-3" />}>{t("modules.plannedTitle")}</Badge>
          {mod.phase && <Badge tone="neutral">{t("modules.phase")}: <span className="num">{mod.phase}</span></Badge>}
        </div>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">{t("modules.plannedBody")}</p>
        {mod.planned && (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-border bg-surface-2 p-5 text-start">
            <p className="mb-3 text-sm font-semibold">{t("modules.features")}</p>
            <ul className="flex flex-col gap-2 text-sm text-muted">
              {mod.planned.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="secondary" className="mt-8" onClick={() => navigate("/")}>
          {t("modules.backToDashboard")}
        </Button>
      </Card>
    </div>
  );
}
