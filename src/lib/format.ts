export function formatPrice(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" });
}

/** رقم سعودي بصيغة 9665XXXXXXXX */
export function normalizeSaudiPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("05")) return `966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `966${digits}`;
  return digits;
}

export function isValidSaudiPhone(phone: string): boolean {
  return /^9665\d{8}$/.test(normalizeSaudiPhone(phone));
}
