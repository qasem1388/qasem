import type { CalendarDisplay } from "@/shared/api/types";

/**
 * Display formatting. Amounts arrive from the backend as exact decimal
 * strings ("1150.00") and are formatted without converting to floating point
 * (Intl.NumberFormat accepts decimal strings exactly).
 * Digits are Latin (0-9), the common convention in Saudi accounting software.
 */
const LOCALE = "ar-SA-u-nu-latn";

const moneyFmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/** "1150.5" -> "1,150.50". Invalid input renders as an em dash. */
export function formatAmount(value: string): string {
  if (!DECIMAL_RE.test(value)) return "—";
  // `format` accepts numeric strings exactly per ECMA-402 (Intl.NumberFormat v3).
  return moneyFmt.format(value as unknown as number);
}

export function formatInteger(value: number): string {
  return intFmt.format(value);
}

/** Splits a decimal string into whole and fractional parts for styled display. */
export function splitAmount(value: string): { whole: string; fraction: string; negative: boolean } {
  const formatted = formatAmount(value.replace(/^-/, ""));
  const [whole = formatted, fraction = "00"] = formatted.split(".");
  return { whole, fraction, negative: value.startsWith("-") };
}

const gregorianFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const hijriFmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** Parses `YYYY-MM-DD` as a calendar date (noon UTC avoids timezone drift). */
export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatGregorian(d: Date): string {
  return gregorianFmt.format(d);
}

export function formatHijri(d: Date): string {
  return hijriFmt.format(d);
}

/** Formats a Gregorian date for display according to the company preference. */
export function formatDate(input: string | Date, mode: CalendarDisplay = "gregorian"): string {
  const d = typeof input === "string" ? parseIsoDate(input) ?? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  switch (mode) {
    case "hijri":
      return formatHijri(d);
    case "both":
      return `${formatGregorian(d)} — ${formatHijri(d)}`;
    default:
      return formatGregorian(d);
  }
}

/**
 * Timestamp as `YYYY-MM-DD HH:mm` (local time, 24h). A fixed numeric layout
 * stays unambiguous inside RTL tables, unlike locale output mixing "م/ص".
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${todayIso(d)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Today's date as `YYYY-MM-DD` in local time. */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
