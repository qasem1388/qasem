import { passwordScore } from "@/shared/validation/schemas";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";

const levels = ["weak", "weak", "fair", "good", "strong"] as const;
const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-primary", "bg-success"];

export function PasswordStrength({ password }: { password: string }) {
  const { tx } = useI18n();
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= score ? colors[score] : "bg-surface-3")} />
        ))}
      </div>
      <span className="w-14 text-xs text-muted">{tx(`admin.strength.${levels[score]}`)}</span>
    </div>
  );
}
