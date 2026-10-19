import { formatAmount } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { useI18n } from "@/shared/i18n";

/**
 * Currency label. Uses the textual abbreviation "ر.س" which every font can
 * render. The official Saudi Riyal symbol (U+20C1, SAMA 2025) can be dropped
 * in here as an SVG once the licensed artwork is added to `src/assets`.
 */
export function CurrencyLabel({ className }: { className?: string }) {
  const { t } = useI18n();
  return <span className={cn("text-[0.8em] font-normal text-muted", className)}>{t("common.sar")}</span>;
}

/** Formatted exact amount + currency, always laid out LTR-safe. */
export function Money({ value, className, showCurrency = true }: { value: string; className?: string; showCurrency?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span className="num">{formatAmount(value)}</span>
      {showCurrency && <CurrencyLabel />}
    </span>
  );
}
