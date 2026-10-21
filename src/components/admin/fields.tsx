"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-brand border border-primary/15 bg-white px-3.5 h-11 text-sm text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40 focus:outline-none aria-[invalid=true]:border-red-500";

type Base = { name: string; label: string; error?: string; hint?: string; className?: string };

function Wrap({ name, label, error, hint, className, children }: Base & { children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={`a-${name}`} className="text-primary mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`a-${name}-hint`} className="text-muted mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`a-${name}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  type = "text",
  defaultValue,
  autoComplete,
  required,
  dir,
  ...p
}: Base & { type?: string; defaultValue?: string; autoComplete?: string; required?: boolean; dir?: "ltr" | "rtl" }) {
  return (
    <Wrap {...p}>
      <input
        id={`a-${p.name}`}
        name={p.name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        dir={dir}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={p.error ? `a-${p.name}-error` : p.hint ? `a-${p.name}-hint` : undefined}
        className={cn(control, dir === "ltr" && "text-left")}
      />
    </Wrap>
  );
}

export function Select({
  options,
  defaultValue,
  ...p
}: Base & { options: { value: string; label: string }[]; defaultValue?: string }) {
  return (
    <Wrap {...p}>
      <select
        id={`a-${p.name}`}
        name={p.name}
        defaultValue={defaultValue}
        aria-invalid={p.error ? true : undefined}
        className={control}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="rounded-brand border-primary/10 flex cursor-pointer items-start gap-3 border p-3.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-[var(--brand-primary)]"
      />
      <span>
        <span className="text-primary block text-sm font-semibold">{label}</span>
        {hint && <span className="text-muted mt-0.5 block text-xs">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  variant = "secondary",
  className,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses(variant, "md", className)}>
      {pending ? "جارٍ الحفظ…" : children}
    </button>
  );
}

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <p
      role="status"
      className={cn("rounded-brand p-3 text-sm", state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}
    >
      {state.message}
    </p>
  );
}
