import { fontOptions } from "@/lib/font-options";
import type { BrandTheme } from "@/types/content";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColor(value: string | undefined, fallback: string) {
  return value && HEX.test(value) ? value : fallback;
}

const clamp = (n: number, min: number, max: number, fallback: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;

/**
 * Turns the stored brand theme into CSS custom properties consumed by
 * `globals.css`. Values are validated so admin input can never inject CSS.
 */
export function brandCssVariables(brand: Partial<BrandTheme>): string {
  const secondary = safeColor(brand.secondary, "#c8a24a");
  const font = fontOptions[brand.font as keyof typeof fontOptions] ?? fontOptions.plex;
  return [
    `--brand-primary:${safeColor(brand.primary, "#0b1f3a")}`,
    `--brand-secondary:${secondary}`,
    `--brand-accent:${safeColor(brand.accent, "#1d4e89")}`,
    `--brand-surface:${safeColor(brand.surface, "#f5f7fa")}`,
    `--brand-text:${safeColor(brand.text, "#0f172a")}`,
    `--brand-button:${safeColor(brand.button, secondary)}`,
    `--brand-button-text:${safeColor(brand.buttonText, "#0b1f3a")}`,
    `--brand-radius:${clamp(brand.radius ?? 14, 0, 32, 14)}px`,
    `--brand-font:var(${font.cssVar})`,
    `--brand-font-scale:${clamp(brand.fontScale ?? 1, 0.9, 1.15, 1)}`,
  ].join(";");
}
