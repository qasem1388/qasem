"use client";

import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Localized } from "@/types/content";

export const controlClass =
  "block w-full rounded-brand border border-primary/15 bg-white px-3 text-sm text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-secondary/40 focus:outline-none aria-[invalid=true]:border-red-500";

export type Errors = Record<string, string>;

/** Error for a field path, e.g. err(errors, "contact.email"). */
export const err = (errors: Errors | undefined, path: string) => errors?.[path];

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export function TextInput({
  label,
  value,
  onChange,
  error,
  hint,
  dir,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  dir?: "ltr" | "rtl";
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-primary mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, "h-10", dir === "ltr" && "text-left")}
      />
      {hint && !error && <p className="text-muted mt-1 text-xs">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

/** Arabic + English inputs side by side for one bilingual value. */
export function LocalizedInput({
  label,
  value,
  onChange,
  errors,
  path,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: Localized | undefined;
  onChange: (v: Localized) => void;
  errors?: Errors;
  path: string;
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  const v = value ?? { ar: "", en: "" };
  const fields: { lang: "ar" | "en"; tag: string; dir: "rtl" | "ltr" }[] = [
    { lang: "ar", tag: "عربي", dir: "rtl" },
    { lang: "en", tag: "English", dir: "ltr" },
  ];
  return (
    <fieldset>
      <legend className="text-primary mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {fields.map(({ lang, tag, dir }) => {
          const e = errors?.[`${path}.${lang}`];
          const common = {
            id: `${id}-${lang}`,
            value: v[lang],
            dir,
            lang,
            "aria-label": `${label} (${tag})`,
            "aria-invalid": e ? true : undefined,
            onChange: (ev: { target: { value: string } }) => onChange({ ...v, [lang]: ev.target.value }),
          };
          return (
            <div key={lang} className="relative">
              <span
                className={cn(
                  "bg-surface text-muted pointer-events-none absolute top-2 rounded px-1.5 text-[10px] font-semibold",
                  lang === "en" ? "right-2" : "left-2",
                )}
              >
                {tag}
              </span>
              {multiline ? (
                <textarea {...common} rows={rows} className={cn(controlClass, "pt-7 pb-2 leading-6")} />
              ) : (
                <input {...common} className={cn(controlClass, "h-10", lang === "en" ? "pe-16" : "pe-12")} />
              )}
              <FieldError message={e} />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ColorInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-primary mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label}: منتقي اللون`}
          className="rounded-brand border-primary/15 h-10 w-12 shrink-0 cursor-pointer border bg-white p-1"
        />
        <input
          id={id}
          value={value}
          dir="ltr"
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={cn(controlClass, "h-10 text-left font-mono uppercase")}
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="rounded-brand border-primary/10 flex cursor-pointer items-start justify-between gap-4 border bg-white p-3.5">
      <span>
        <span className="text-primary block text-sm font-semibold">{label}</span>
        {hint && <span className="text-muted mt-0.5 block text-xs">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="peer-focus-visible:ring-secondary relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 after:absolute after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all ltr:after:left-0.5 peer-checked:ltr:after:left-[1.375rem] rtl:after:right-0.5 peer-checked:rtl:after:right-[1.375rem]"
      />
    </label>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Reorderable list: drag the handle with a mouse, or use the ↑/↓ buttons
 * (keyboard and screen-reader friendly).
 */
export function SortableList<T>({
  items,
  onChange,
  render,
  itemLabel,
  onRemove,
  getKey,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, index: number) => ReactNode;
  itemLabel: (item: T, index: number) => string;
  onRemove?: (index: number) => void;
  getKey: (item: T, index: number) => string;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li
          key={getKey(item, i)}
          onDragOver={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            setOver(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null) onChange(move(items, dragging, i));
            setDragging(null);
            setOver(null);
          }}
          className={cn(
            "rounded-brand flex items-start gap-2 border bg-white p-2 transition-colors",
            over === i && dragging !== null && dragging !== i ? "border-secondary bg-secondary-50" : "border-primary/10",
            dragging === i && "opacity-50",
          )}
        >
          <span
            draggable
            onDragStart={(e) => {
              setDragging(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            className="text-muted mt-1.5 cursor-grab active:cursor-grabbing"
            title="اسحب لإعادة الترتيب"
            aria-hidden
          >
            <GripVertical className="size-5" />
          </span>
          <div className="min-w-0 flex-1">{render(item, i)}</div>
          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onChange(move(items, i, i - 1))}
              disabled={i === 0}
              aria-label={`نقل «${itemLabel(item, i)}» للأعلى`}
              className="text-muted hover:bg-primary-50 hover:text-primary rounded p-1 disabled:opacity-30"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onChange(move(items, i, i + 1))}
              disabled={i === items.length - 1}
              aria-label={`نقل «${itemLabel(item, i)}» للأسفل`}
              className="text-muted hover:bg-primary-50 hover:text-primary rounded p-1 disabled:opacity-30"
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`حذف «${itemLabel(item, i)}»`}
                className="rounded p-1 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-brand border-primary/30 text-primary hover:border-primary hover:bg-primary-50 mt-2 inline-flex h-9 items-center gap-1.5 border border-dashed px-3 text-sm font-semibold"
    >
      <Plus className="size-4" aria-hidden />
      {children}
    </button>
  );
}

export type SaveResult = { ok: boolean; message: string; errors?: Errors };

/** Runs a JSON-based save action and tracks its pending/result state + unsaved changes. */
export function useSave<T>(action: (json: string) => Promise<SaveResult>, value: T) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SaveResult>();
  const [saved, setSaved] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    start(async () => {
      const json = JSON.stringify(value);
      const res = await action(json);
      setResult(res);
      if (res.ok) setSaved(json);
    });
  return { pending, result, dirty, save, errors: result?.ok ? undefined : result?.errors };
}

export function SaveBar({
  pending,
  dirty,
  result,
  onSave,
  extra,
}: {
  pending: boolean;
  dirty: boolean;
  result?: SaveResult;
  onSave: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="border-primary/10 sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSave} disabled={pending} className={buttonClasses("secondary", "md")}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {pending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
        </button>
        {extra}
        <p role="status" className="text-sm">
          {result && !pending && !(result.ok && dirty) ? (
            <span className={result.ok ? "text-emerald-700" : "text-red-600"}>{result.message}</span>
          ) : dirty ? (
            <span className="text-secondary-700">لديك تغييرات غير محفوظة.</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-brand-lg border-primary/8 border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-primary font-bold">{title}</h2>
      {description && <p className="text-muted mt-1 text-sm">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}
