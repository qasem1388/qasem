import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "light";
type Size = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-button text-button-fg hover:bg-button-hover hover:text-white shadow-lg shadow-button/20",
  secondary: "bg-primary text-white hover:bg-primary-900",
  ghost: "border border-white/40 text-white hover:bg-white/10 hover:border-white",
  outline: "border border-primary/20 text-primary hover:border-primary hover:bg-primary-50",
  light: "bg-white text-primary hover:bg-secondary-50",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-brand font-semibold whitespace-nowrap transition-all duration-200",
    "focus-visible:outline-offset-4 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    className,
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
