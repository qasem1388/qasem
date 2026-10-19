import { useNavigate } from "react-router-dom";
import { Lock, MapPinOff, ServerCrash } from "lucide-react";
import { useI18n } from "@/shared/i18n";
import { Button } from "@/shared/ui/Button";

function Centered({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-3 text-muted">{icon}</div>
      <h1 className="text-xl font-bold">{title}</h1>
      {body && <p className="max-w-md text-sm leading-relaxed text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return <Centered icon={<MapPinOff className="size-8" />} title={t("system.notFound")} action={<Button variant="secondary" onClick={() => navigate("/")}>{t("modules.backToDashboard")}</Button>} />;
}

export function ForbiddenPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return <Centered icon={<Lock className="size-8" />} title={t("system.forbidden")} action={<Button variant="secondary" onClick={() => navigate("/")}>{t("modules.backToDashboard")}</Button>} />;
}

export function FatalErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <Centered
      icon={<ServerCrash className="size-8 text-danger" />}
      title={t("system.fatalTitle")}
      body={`${t("system.fatalBody")} ${message}`}
      action={<Button onClick={onRetry}>{t("common.retry")}</Button>}
    />
  );
}
