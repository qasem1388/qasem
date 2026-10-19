import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired with aria attributes. */
export function FieldShell({ label, error, hint, required, optionalLabel, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {label}
        {required ? (
          <span className="ms-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          optionalLabel && <span className="ms-1.5 text-xs font-normal text-subtle">({optionalLabel})</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1 text-xs text-danger" role="alert">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const controlBase =
  "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-subtle transition-shadow " +
  "focus:outline-none focus:ring-4 focus:ring-[var(--ring)] focus:border-primary disabled:bg-surface-3 disabled:text-muted";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  /** Render the value left-to-right (numbers, emails, usernames). */
  ltr?: boolean;
  trailing?: ReactNode;
  containerClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, optionalLabel, ltr, trailing, className, containerClassName, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      optionalLabel={optionalLabel}
      htmlFor={id}
      className={containerClassName}
    >
      <div className="relative" dir={ltr ? "ltr" : undefined}>
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          dir={ltr ? "ltr" : undefined}
          className={cn(
            controlBase,
            ltr && "text-left",
            trailing ? "pe-10" : undefined,
            error ? "border-danger" : "border-border-strong",
            className,
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 end-0 flex items-center pe-2">{trailing}</div>}
      </div>
    </FieldShell>
  );
});

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  containerClassName?: string;
}

export function SelectField({ label, error, hint, required, options, className, containerClassName, ...rest }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} htmlFor={id} className={containerClassName}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, error ? "border-danger" : "border-border-strong", className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
