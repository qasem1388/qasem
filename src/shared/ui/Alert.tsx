import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-primary-soft text-primary border-primary/25", Icon: Info },
  success: { box: "bg-success-soft text-success border-success/25", Icon: CheckCircle2 },
  warning: { box: "bg-warning-soft text-warning border-warning/30", Icon: AlertTriangle },
  danger: { box: "bg-danger-soft text-danger border-danger/25", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : undefined, "text-text/85")}>{children}</div>}
      </div>
    </div>
  );
}
