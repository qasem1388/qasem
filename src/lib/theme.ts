import type { BrandTheme } from "@/types/content";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColor(value: string, fallback: string) {
  return HEX.test(value) ? value : fallback;
}

/**
 * Turns the stored brand theme into CSS custom properties consumed by
 * `globals.css`. Values are validated so admin input can never inject CSS.
 */
export function brandCssVariables(brand: BrandTheme): string {
  const radius = Number.isFinite(brand.radius) ? Math.min(Math.max(brand.radius, 0), 32) : 14;
  return [
    `--brand-primary:${safeColor(brand.primary, "#0b1f3a")}`,
    `--brand-secondary:${safeColor(brand.secondary, "#c8a24a")}`,
    `--brand-accent:${safeColor(brand.accent, "#1d4e89")}`,
    `--brand-surface:${safeColor(brand.surface, "#f5f7fa")}`,
    `--brand-text:${safeColor(brand.text, "#0f172a")}`,
    `--brand-radius:${radius}px`,
  ].join(";");
}
