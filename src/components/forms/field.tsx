import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-brand border border-primary/15 bg-white px-4 text-[0.95rem] text-ink placeholder:text-muted/70 transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40 focus:outline-none aria-[invalid=true]:border-red-500";

type Common = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  defaultValue?: string;
};

function Wrapper({ name, label, error, required, optionalLabel, className, children }: Common & { children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={`f-${name}`} className="text-primary mb-2 block text-sm font-semibold">
        {label}
        {required ? (
          <span className="text-red-600" aria-hidden>
            {" "}
            *
          </span>
        ) : (
          optionalLabel && <span className="text-muted font-normal"> ({optionalLabel})</span>
        )}
      </label>
      {children}
      {error && (
        <p id={`f-${name}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  type = "text",
  autoComplete,
  inputMode,
  dir,
  ...props
}: Common & {
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  dir?: "ltr" | "rtl";
}) {
  return (
    <Wrapper {...props}>
      <input
        id={`f-${props.name}`}
        name={props.name}
        type={type}
        required={props.required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        dir={dir}
        defaultValue={props.defaultValue}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `f-${props.name}-error` : undefined}
        className={cn(control, "h-12", dir === "ltr" && "rtl:text-right")}
      />
    </Wrapper>
  );
}

export function TextAreaField({ rows = 4, ...props }: Common & { rows?: number }) {
  return (
    <Wrapper {...props}>
      <textarea
        id={`f-${props.name}`}
        name={props.name}
        rows={rows}
        required={props.required}
        defaultValue={props.defaultValue}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `f-${props.name}-error` : undefined}
        className={cn(control, "resize-y py-3 leading-7")}
      />
    </Wrapper>
  );
}

export function SelectField({
  options,
  placeholder,
  ...props
}: Common & { options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <Wrapper {...props}>
      <select
        id={`f-${props.name}`}
        name={props.name}
        required={props.required}
        defaultValue={props.defaultValue ?? ""}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `f-${props.name}-error` : undefined}
        className={cn(control, "h-12")}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Hidden from people and assistive tech; bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden className="sr-only">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function FileField({ accept, hint, ...props }: Common & { accept: string; hint: string }) {
  return (
    <Wrapper {...props}>
      <input
        id={`f-${props.name}`}
        name={props.name}
        type="file"
        accept={accept}
        required={props.required}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={`f-${props.name}-hint${props.error ? ` f-${props.name}-error` : ""}`}
        className={cn(
          control,
          "file:bg-primary hover:file:bg-primary-900 h-auto py-2.5 file:me-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white",
        )}
      />
      <p id={`f-${props.name}-hint`} className="text-muted mt-1.5 text-xs">
        {hint}
      </p>
    </Wrapper>
  );
}

/** Sends the page language so confirmation emails use the visitor's language. */
export function LocaleInput() {
  const params = useParams<{ locale?: string }>();
  return <input type="hidden" name="locale" value={params?.locale === "en" ? "en" : "ar"} />;
}
