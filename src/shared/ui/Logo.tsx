import { cn } from "@/shared/lib/cn";

/** Brand mark (same artwork as the app icon, `assets/logo.svg`). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={cn("size-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f766e" />
          <stop offset="1" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect x="64" y="64" width="896" height="896" rx="208" fill="url(#lg-bg)" />
      <rect x="236" y="560" width="120" height="224" rx="28" fill="#ecfdf5" opacity="0.92" />
      <rect x="452" y="440" width="120" height="344" rx="28" fill="#ecfdf5" opacity="0.92" />
      <rect x="668" y="320" width="120" height="464" rx="28" fill="#ecfdf5" opacity="0.92" />
      <path d="M236 470 L452 350 L580 400 L790 220" fill="none" stroke="url(#lg-gold)" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="790" cy="220" r="46" fill="url(#lg-gold)" />
    </svg>
  );
}
