"use client";

import { ExternalLink, ImagePlus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { saveItem } from "@/app/admin/actions/content";
import { uploadMedia } from "@/app/admin/actions/media";
import type { IconName } from "@/components/ui/icon";
import type { Field, Option, ResourceDef } from "@/lib/resources/types";
import { textToHtml } from "@/lib/text-to-html";
import { cn } from "@/lib/utils";
import type { Localized } from "@/types/content";
import { IconSelect, LocalizedList } from "./homepage-editor";
import { ImagePicker, MediaDialog } from "./image-picker";
import {
  AddButton,
  LocalizedInput,
  SaveBar,
  Section,
  SortableList,
  TextInput,
  Toggle,
  controlClass,
  type Errors,
  useSave,
} from "./inputs";
import { RichTextEditor } from "./rich-text-editor";

type Values = Record<string, unknown>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 80);

/** Generic form for any content type described in lib/resources/definitions. */
export function ItemEditor({
  def,
  id,
  initial,
  relations,
  publicUrl,
}: {
  def: ResourceDef;
  id: string | null;
  initial: Values;
  relations: Record<string, Option[]>;
  publicUrl?: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<Values>(() => {
    const out = { ...initial };
    for (const f of def.sections.flatMap((s) => s.fields)) {
      if (f.type === "rich") {
        const r = (out[f.name] as Localized) ?? { ar: "", en: "" };
        out[f.name] = { ar: textToHtml(r.ar), en: textToHtml(r.en) };
      }
    }
    return out;
  });
  const [slugTouched, setSlugTouched] = useState(!!id);
  const s = useSave(async (json) => {
    const res = await saveItem(def.key, id, json);
    if (res.ok && !id && res.id) router.replace(`/admin/content/${def.key}/${res.id}?created=1`);
    return res;
  }, v);

  const slugField = def.sections.flatMap((x) => x.fields).find((f): f is Extract<Field, { type: "slug" }> => f.type === "slug");
  const set = (name: string, value: unknown) =>
    setV((p) => {
      const next = { ...p, [name]: value };
      if (slugField && !slugTouched && name === slugField.from) next.slug = slugify((value as Localized).en ?? "");
      return next;
    });

  const render = (f: Field) => (
    <FieldInput
      key={f.name}
      field={f}
      value={v[f.name]}
      onChange={(x) => {
        if (f.type === "slug") setSlugTouched(true);
        set(f.name, x);
      }}
      errors={s.errors}
      options={f.type === "relation" ? (relations[f.name] ?? []) : undefined}
    />
  );

  const main = def.sections.filter((x) => !x.side);
  const side = def.sections.filter((x) => x.side);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        {main.map((sec) => (
          <Section key={sec.title} title={sec.title}>
            {sec.fields.map(render)}
          </Section>
        ))}
      </div>
      <div className="space-y-6">
        {side.map((sec) => (
          <Section key={sec.title} title={sec.title}>
            {sec.fields.map(render)}
          </Section>
        ))}
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            className="rounded-brand border-primary/15 text-primary inline-flex h-10 items-center gap-2 border bg-white px-4 text-sm font-semibold"
          >
            <ExternalLink className="size-4" aria-hidden />
            عرض في الموقع
          </a>
        )}
      </div>
      <div className="xl:col-span-3">
        <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
      </div>
    </div>
  );
}

function FieldInput({
  field: f,
  value,
  onChange,
  errors,
  options,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  errors?: Errors;
  options?: Option[];
}) {
  const e = errors?.[f.name];
  switch (f.type) {
    case "text":
    case "url":
      return (
        <TextInput
          label={f.label}
          hint={f.hint}
          dir={f.type === "url" ? "ltr" : f.dir}
          value={String(value ?? "")}
          onChange={onChange}
          error={e}
          placeholder={f.type === "url" ? "https://" : undefined}
        />
      );
    case "slug":
      return (
        <TextInput
          label={f.label}
          hint={f.hint}
          dir="ltr"
          value={String(value ?? "")}
          onChange={(x) => onChange(x.toLowerCase())}
          error={e}
        />
      );
    case "number":
      return (
        <TextInput
          label={f.label}
          hint={f.hint}
          dir="ltr"
          type="number"
          value={value as number}
          onChange={(x) => onChange(x === "" ? undefined : Number(x))}
          error={e}
        />
      );
    case "date":
      return (
        <TextInput
          label={f.label}
          hint={f.hint}
          dir="ltr"
          type="date"
          value={String(value ?? "")}
          onChange={onChange}
          error={e}
        />
      );
    case "boolean":
      return <Toggle label={f.label} hint={f.hint} checked={!!value} onChange={onChange} />;
    case "localized":
      return (
        <div>
          <LocalizedInput
            label={f.label}
            value={value as Localized}
            onChange={onChange}
            errors={errors}
            path={f.name}
            multiline={f.multiline}
            rows={f.rows}
          />
          {f.hint && <p className="text-muted mt-1 text-xs">{f.hint}</p>}
        </div>
      );
    case "rich":
      return <LocalizedRich label={f.label} value={value as Localized} onChange={onChange} />;
    case "image":
      return (
        <div>
          <ImagePicker
            label={f.label}
            hint={f.hint}
            aspect={f.aspect}
            allowClear={!f.required}
            value={(value as string) || undefined}
            onChange={(x) => onChange(x ?? "")}
          />
          {e && <p className="mt-1 text-xs text-red-600">{e}</p>}
        </div>
      );
    case "gallery":
      return <GalleryInput label={f.label} value={(value as string[]) ?? []} onChange={onChange} max={f.max ?? 20} />;
    case "icon":
      return <IconSelect value={value as IconName} onChange={onChange} />;
    case "select":
    case "relation": {
      const opts = f.type === "select" ? f.options : (options ?? []);
      const required = f.type === "select" || f.required;
      return (
        <label className="block">
          <span className="text-primary mb-1.5 block text-sm font-semibold">{f.label}</span>
          <select
            value={String(value ?? "")}
            onChange={(ev) => onChange(ev.target.value)}
            aria-invalid={e ? true : undefined}
            className={cn(controlClass, "h-10")}
          >
            {(!required || !value) && <option value="">{required ? "— اختر —" : "— بدون —"}</option>}
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {e && <span className="mt-1 block text-xs text-red-600">{e}</span>}
        </label>
      );
    }
    case "localizedList":
      return (
        <div>
          <p className="text-primary mb-1.5 text-sm font-semibold">{f.label}</p>
          <LocalizedList items={(value as Localized[]) ?? []} onChange={onChange} errors={errors} path={f.name} max={f.max} />
        </div>
      );
    case "features":
      return (
        <FeaturesInput
          label={f.label}
          value={(value as { title: Localized; body: Localized }[]) ?? []}
          onChange={onChange}
          errors={errors}
          path={f.name}
          max={f.max}
        />
      );
  }
}

function LocalizedRich({ label, value, onChange }: { label: string; value: Localized; onChange: (v: Localized) => void }) {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-primary text-sm font-semibold">{label}</p>
        <div role="tablist" aria-label={`${label}: اللغة`} className="flex gap-1">
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={cn(
                "rounded-brand px-3 py-1 text-xs font-semibold",
                lang === l ? "bg-primary text-white" : "bg-surface text-ink/70",
              )}
            >
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </div>
      <div className={lang === "ar" ? "" : "hidden"}>
        <RichTextEditor label={`${label} (عربي)`} dir="rtl" value={value.ar} onChange={(ar) => onChange({ ...value, ar })} />
      </div>
      <div className={lang === "en" ? "" : "hidden"}>
        <RichTextEditor label={`${label} (English)`} dir="ltr" value={value.en} onChange={(en) => onChange({ ...value, en })} />
      </div>
    </div>
  );
}

function GalleryInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
}) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files)
      .slice(0, max - value.length)
      .forEach((f) => fd.append("files", f));
    start(async () => {
      const res = await uploadMedia(fd);
      if (!res.ok) return setError(res.message);
      onChange([...value, ...res.items.map((i) => i.url)].slice(0, max));
      setError(res.rejected.length ? `رُفض: ${res.rejected.join("، ")}` : undefined);
      if (ref.current) ref.current.value = "";
    });
  };
  return (
    <div>
      <p className="text-primary mb-1.5 text-sm font-semibold">
        {label}{" "}
        <span className="text-muted font-normal">
          ({value.length}/{max})
        </span>
      </p>
      {value.length > 0 && (
        <SortableList
          items={value}
          getKey={(src, i) => `${src}-${i}`}
          itemLabel={(_, i) => `الصورة ${i + 1}`}
          onChange={onChange}
          onRemove={(i) => onChange(value.filter((_, j) => j !== i))}
          render={(src) => (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img src={src} alt="" className="h-14 w-20 rounded object-cover" />
              <span className="text-muted truncate text-xs" dir="ltr">
                {src}
              </span>
            </div>
          )}
        />
      )}
      {value.length < max && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={pending}
            className="rounded-brand bg-primary inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden />
            {pending ? "جارٍ الرفع…" : "رفع صور"}
          </button>
          <AddButton onClick={() => setPicking(true)}>
            <span className="inline-flex items-center gap-1">
              <ImagePlus className="size-4" aria-hidden /> من المكتبة
            </span>
          </AddButton>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label}: رفع صور`}
        onChange={(e) => upload(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {picking && (
        <MediaDialog
          onClose={() => setPicking(false)}
          onPick={(src) => {
            onChange([...value, src]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function FeaturesInput({
  label,
  value,
  onChange,
  errors,
  path,
  max,
}: {
  label: string;
  value: { title: Localized; body: Localized }[];
  onChange: (v: { title: Localized; body: Localized }[]) => void;
  errors?: Errors;
  path: string;
  max: number;
}) {
  return (
    <div>
      <p className="text-primary mb-1.5 text-sm font-semibold">{label}</p>
      <SortableList
        items={value}
        getKey={(_, i) => `${path}-${i}`}
        itemLabel={(x) => x.title.ar || "ميزة"}
        onChange={onChange}
        onRemove={(i) => onChange(value.filter((_, j) => j !== i))}
        render={(x, i) => (
          <div className="space-y-3 p-1">
            <LocalizedInput
              label="العنوان"
              value={x.title}
              onChange={(title) => onChange(value.map((y, j) => (j === i ? { ...y, title } : y)))}
              errors={errors}
              path={`${path}.${i}.title`}
            />
            <LocalizedInput
              label="الوصف"
              value={x.body}
              onChange={(body) => onChange(value.map((y, j) => (j === i ? { ...y, body } : y)))}
              errors={errors}
              path={`${path}.${i}.body`}
              multiline
              rows={2}
            />
          </div>
        )}
      />
      {value.length < max && (
        <AddButton onClick={() => onChange([...value, { title: { ar: "", en: "" }, body: { ar: "", en: "" } }])}>
          إضافة ميزة
        </AddButton>
      )}
    </div>
  );
}
