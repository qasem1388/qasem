"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { saveHomepage } from "@/app/admin/actions/homepage";
import { Icon, iconNames, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { HomePage, HomeSectionKey, Localized, SectionCopy } from "@/types/content";
import { ImagePicker } from "./image-picker";
import {
  AddButton,
  LocalizedInput,
  SaveBar,
  Section,
  SortableList,
  TextInput,
  controlClass,
  type Errors,
  useSave,
} from "./inputs";
import { LinksEditor } from "./settings-editors";

const sectionLabels: Record<HomeSectionKey, string> = {
  hero: "البانر الرئيسي",
  about: "نبذة عن الشركة",
  visionMission: "الرؤية والرسالة",
  services: "أبرز الخدمات",
  stats: "الإحصائيات",
  projects: "المشاريع المميزة",
  sectors: "القطاعات",
  whyUs: "لماذا تختارنا؟",
  clients: "شعارات العملاء",
  testimonials: "آراء العملاء",
  news: "أحدث الأخبار",
  quote: "طلب عرض سعر",
  contact: "نموذج التواصل",
};

const tabs = [
  { id: "layout", label: "ترتيب الأقسام", prefixes: ["sections"] },
  { id: "hero", label: "البانر الرئيسي", prefixes: ["hero"] },
  { id: "about", label: "من نحن والرؤية", prefixes: ["about", "visionMission"] },
  { id: "stats", label: "الإحصائيات", prefixes: ["stats"] },
  { id: "why", label: "لماذا تختارنا", prefixes: ["whyUs"] },
  {
    id: "copy",
    label: "عناوين الأقسام",
    prefixes: ["services", "projects", "sectors", "clients", "testimonials", "news", "quote", "contact"],
  },
] as const;

const L = (): Localized => ({ ar: "", en: "" });

export function HomepageEditor({ initial }: { initial: HomePage }) {
  const [v, setV] = useState(initial);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("layout");
  const s = useSave(saveHomepage, v);
  const e = s.errors;
  const set = <K extends keyof HomePage>(k: K, val: HomePage[K]) => setV((p) => ({ ...p, [k]: val }));
  const tabHasError = (prefixes: readonly string[]) =>
    !!e && Object.keys(e).some((k) => prefixes.some((p) => k === p || k.startsWith(`${p}.`)));

  return (
    <div>
      <div
        role="tablist"
        aria-label="أقسام المحرر"
        className="rounded-brand-lg mb-6 flex gap-1 overflow-x-auto bg-white p-1.5 shadow-sm"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-brand relative shrink-0 px-4 py-2 text-sm font-semibold whitespace-nowrap",
              tab === t.id ? "bg-primary text-white" : "text-ink/70 hover:bg-primary-50",
            )}
          >
            {t.label}
            {tabHasError(t.prefixes) && (
              <span
                className="absolute top-1.5 size-2 rounded-full bg-red-500 ltr:right-1.5 rtl:left-1.5"
                aria-label="يحتوي أخطاء"
              />
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-6">
        {tab === "layout" && (
          <Section
            title="ترتيب أقسام الصفحة الرئيسية"
            description="اسحب الأقسام أو استخدم الأسهم لتغيير ترتيبها، واستخدم زر العين لإظهار القسم أو إخفائه."
          >
            <SortableList
              items={v.sections}
              getKey={(x) => x.key}
              itemLabel={(x) => sectionLabels[x.key]}
              onChange={(sections) => set("sections", sections)}
              render={(x, i) => (
                <div className="flex items-center justify-between gap-3 py-1">
                  <span className={cn("font-semibold", x.enabled ? "text-primary" : "text-muted line-through")}>
                    {sectionLabels[x.key]}
                  </span>
                  <button
                    type="button"
                    aria-pressed={x.enabled}
                    onClick={() =>
                      set(
                        "sections",
                        v.sections.map((y, j) => (j === i ? { ...y, enabled: !y.enabled } : y)),
                      )
                    }
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
                      x.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {x.enabled ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                    {x.enabled ? "ظاهر" : "مخفي"}
                    <span className="sr-only">: {sectionLabels[x.key]}</span>
                  </button>
                </div>
              )}
            />
          </Section>
        )}

        {tab === "hero" && (
          <>
            <Section title="نصوص البانر">
              <LocalizedInput
                label="العنوان الصغير"
                value={v.hero.eyebrow}
                onChange={(x) => set("hero", { ...v.hero, eyebrow: x })}
                errors={e}
                path="hero.eyebrow"
              />
              <LocalizedInput
                label="العنوان الرئيسي"
                value={v.hero.title}
                onChange={(x) => set("hero", { ...v.hero, title: x })}
                errors={e}
                path="hero.title"
                multiline
                rows={2}
              />
              <LocalizedInput
                label="الوصف"
                value={v.hero.subtitle}
                onChange={(x) => set("hero", { ...v.hero, subtitle: x })}
                errors={e}
                path="hero.subtitle"
                multiline
              />
              <ImagePicker
                label="صورة البانر"
                allowClear={false}
                value={v.hero.image}
                onChange={(x) => x && set("hero", { ...v.hero, image: x })}
                hint="مقاس مقترح 1200×1000 بكسل."
              />
            </Section>
            <Section title="أزرار الدعوة لاتخاذ إجراء" description="حتى 3 أزرار. الأول يظهر بلون زر الدعوة الرئيسي.">
              <SortableList
                items={v.hero.ctas}
                getKey={(_, i) => `cta-${i}`}
                itemLabel={(c) => c.label.ar || "زر"}
                onChange={(ctas) => set("hero", { ...v.hero, ctas })}
                onRemove={(i) => set("hero", { ...v.hero, ctas: v.hero.ctas.filter((_, j) => j !== i) })}
                render={(c, i) => (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input
                      aria-label="نص الزر (عربي)"
                      value={c.label.ar}
                      onChange={(ev) => updateCta(i, { label: { ...c.label, ar: ev.target.value } })}
                      className={cn(controlClass, "h-9")}
                      placeholder="النص بالعربية"
                    />
                    <input
                      aria-label="نص الزر (English)"
                      dir="ltr"
                      value={c.label.en}
                      onChange={(ev) => updateCta(i, { label: { ...c.label, en: ev.target.value } })}
                      className={cn(controlClass, "h-9 text-left")}
                      placeholder="English"
                    />
                    <input
                      aria-label="رابط الزر"
                      dir="ltr"
                      value={c.href}
                      onChange={(ev) => updateCta(i, { href: ev.target.value })}
                      className={cn(controlClass, "h-9 text-left")}
                      aria-invalid={e?.[`hero.ctas.${i}.href`] ? true : undefined}
                    />
                    <select
                      aria-label="نمط الزر"
                      value={c.variant}
                      onChange={(ev) => updateCta(i, { variant: ev.target.value as "primary" })}
                      className={cn(controlClass, "h-9")}
                    >
                      <option value="primary">رئيسي</option>
                      <option value="secondary">فاتح</option>
                      <option value="ghost">إطار شفاف</option>
                    </select>
                  </div>
                )}
              />
              {v.hero.ctas.length < 3 && (
                <AddButton
                  onClick={() =>
                    set("hero", { ...v.hero, ctas: [...v.hero.ctas, { label: L(), href: "/contact", variant: "ghost" }] })
                  }
                >
                  إضافة زر
                </AddButton>
              )}
            </Section>
            <Section title="نقاط مميزة أسفل الأزرار">
              <LocalizedList
                items={v.hero.highlights}
                onChange={(highlights) => set("hero", { ...v.hero, highlights })}
                errors={e}
                path="hero.highlights"
                max={6}
              />
            </Section>
          </>
        )}

        {tab === "about" && (
          <>
            <Section title="نبذة عن الشركة">
              <CopyFields value={v.about} onChange={(x) => set("about", { ...v.about, ...x })} errors={e} path="about" />
              <LocalizedInput
                label="النص"
                value={v.about.body}
                onChange={(x) => set("about", { ...v.about, body: x })}
                errors={e}
                path="about.body"
                multiline
                rows={5}
              />
              <ImagePicker
                label="الصورة"
                allowClear={false}
                value={v.about.image}
                onChange={(x) => x && set("about", { ...v.about, image: x })}
              />
              <p className="text-primary text-sm font-semibold">النقاط المميزة</p>
              <LocalizedList
                items={v.about.points}
                onChange={(points) => set("about", { ...v.about, points })}
                errors={e}
                path="about.points"
                max={8}
              />
              <p className="text-primary text-sm font-semibold">زر «تعرّف علينا»</p>
              <LinksEditor
                links={[v.about.cta]}
                onChange={(l) => l[0] && set("about", { ...v.about, cta: l[0] })}
                errors={e}
                path="about.cta"
                single
              />
            </Section>
            <Section title="الرؤية والرسالة والقيم">
              <CopyFields
                value={v.visionMission}
                onChange={(x) => set("visionMission", { ...v.visionMission, ...x })}
                errors={e}
                path="visionMission"
                noSubtitle
              />
              <IconItems
                items={v.visionMission.items}
                onChange={(items) => set("visionMission", { ...v.visionMission, items })}
                errors={e}
                path="visionMission.items"
                max={6}
              />
            </Section>
          </>
        )}

        {tab === "stats" && (
          <Section title="الإحصائيات" description="تظهر بعدّاد متحرك. حتى 6 أرقام.">
            <SortableList
              items={v.stats.items}
              getKey={(_, i) => `stat-${i}`}
              itemLabel={(x) => x.label.ar || "رقم"}
              onChange={(items) => set("stats", { items })}
              onRemove={(i) => set("stats", { items: v.stats.items.filter((_, j) => j !== i) })}
              render={(x, i) => {
                const up = (patch: Partial<typeof x>) =>
                  set("stats", { items: v.stats.items.map((y, j) => (j === i ? { ...y, ...patch } : y)) });
                return (
                  <div className="space-y-3 p-1">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <IconSelect value={x.icon} onChange={(icon) => up({ icon })} />
                      <TextInput
                        label="الرقم"
                        dir="ltr"
                        type="number"
                        value={x.value}
                        onChange={(n) => up({ value: Math.max(0, Math.round(Number(n) || 0)) })}
                        error={e?.[`stats.items.${i}.value`]}
                      />
                      <TextInput
                        label="لاحقة (مثل +)"
                        dir="ltr"
                        value={x.suffix ?? ""}
                        onChange={(suffix) => up({ suffix: suffix || undefined })}
                        error={e?.[`stats.items.${i}.suffix`]}
                      />
                    </div>
                    <LocalizedInput
                      label="الوصف"
                      value={x.label}
                      onChange={(label) => up({ label })}
                      errors={e}
                      path={`stats.items.${i}.label`}
                    />
                  </div>
                );
              }}
            />
            {v.stats.items.length < 6 && (
              <AddButton
                onClick={() => set("stats", { items: [...v.stats.items, { icon: "award", value: 0, suffix: "+", label: L() }] })}
              >
                إضافة رقم
              </AddButton>
            )}
          </Section>
        )}

        {tab === "why" && (
          <Section title="لماذا تختارنا؟">
            <CopyFields value={v.whyUs} onChange={(x) => set("whyUs", { ...v.whyUs, ...x })} errors={e} path="whyUs" noSubtitle />
            <ImagePicker
              label="الصورة"
              allowClear={false}
              value={v.whyUs.image}
              onChange={(x) => x && set("whyUs", { ...v.whyUs, image: x })}
            />
            <IconItems
              items={v.whyUs.items}
              onChange={(items) => set("whyUs", { ...v.whyUs, items })}
              errors={e}
              path="whyUs.items"
              max={8}
            />
          </Section>
        )}

        {tab === "copy" && (
          <>
            {(["services", "projects", "news"] as const).map((k) => (
              <Section key={k} title={sectionLabels[k]}>
                <CopyFields
                  value={v[k]}
                  onChange={(x) => set(k, { ...v[k], ...x })}
                  errors={e}
                  path={k}
                  noSubtitle={k === "news"}
                />
                <p className="text-primary text-sm font-semibold">زر «عرض الكل»</p>
                <LinksEditor
                  links={[v[k].cta]}
                  onChange={(l) => l[0] && set(k, { ...v[k], cta: l[0] })}
                  errors={e}
                  path={`${k}.cta`}
                  single
                />
              </Section>
            ))}
            {(["sectors", "clients", "testimonials", "contact"] as const).map((k) => (
              <Section key={k} title={sectionLabels[k]}>
                <CopyFields
                  value={v[k]}
                  onChange={(x) => set(k, { ...v[k], ...x })}
                  errors={e}
                  path={k}
                  noSubtitle={k === "clients" || k === "testimonials"}
                />
              </Section>
            ))}
            <Section title={sectionLabels.quote}>
              <CopyFields value={v.quote} onChange={(x) => set("quote", { ...v.quote, ...x })} errors={e} path="quote" />
              <LocalizedList
                items={v.quote.points}
                onChange={(points) => set("quote", { ...v.quote, points })}
                errors={e}
                path="quote.points"
                max={6}
              />
            </Section>
          </>
        )}
      </div>

      <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
    </div>
  );

  function updateCta(i: number, patch: Partial<HomePage["hero"]["ctas"][number]>) {
    set("hero", { ...v.hero, ctas: v.hero.ctas.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }
}

function CopyFields({
  value,
  onChange,
  errors,
  path,
  noSubtitle,
}: {
  value: SectionCopy;
  onChange: (v: Partial<SectionCopy>) => void;
  errors?: Errors;
  path: string;
  noSubtitle?: boolean;
}) {
  return (
    <>
      <LocalizedInput
        label="العنوان الصغير"
        value={value.eyebrow}
        onChange={(eyebrow) => onChange({ eyebrow })}
        errors={errors}
        path={`${path}.eyebrow`}
      />
      <LocalizedInput
        label="العنوان"
        value={value.title}
        onChange={(title) => onChange({ title })}
        errors={errors}
        path={`${path}.title`}
      />
      {!noSubtitle && (
        <LocalizedInput
          label="الوصف (اختياري)"
          value={value.subtitle ?? L()}
          onChange={(subtitle) => onChange({ subtitle: subtitle.ar || subtitle.en ? subtitle : undefined })}
          errors={errors}
          path={`${path}.subtitle`}
          multiline
          rows={2}
        />
      )}
    </>
  );
}

export function LocalizedList({
  items,
  onChange,
  errors,
  path,
  max,
}: {
  items: Localized[];
  onChange: (l: Localized[]) => void;
  errors?: Errors;
  path: string;
  max: number;
}) {
  return (
    <>
      <SortableList
        items={items}
        getKey={(_, i) => `${path}-${i}`}
        itemLabel={(x) => x.ar || "عنصر"}
        onChange={onChange}
        onRemove={(i) => onChange(items.filter((_, j) => j !== i))}
        render={(x, i) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              aria-label="النص (عربي)"
              value={x.ar}
              onChange={(ev) => onChange(items.map((y, j) => (j === i ? { ...y, ar: ev.target.value } : y)))}
              className={cn(controlClass, "h-9")}
              aria-invalid={errors?.[`${path}.${i}.ar`] ? true : undefined}
            />
            <input
              aria-label="النص (English)"
              dir="ltr"
              value={x.en}
              onChange={(ev) => onChange(items.map((y, j) => (j === i ? { ...y, en: ev.target.value } : y)))}
              className={cn(controlClass, "h-9 text-left")}
            />
          </div>
        )}
      />
      {items.length < max && <AddButton onClick={() => onChange([...items, L()])}>إضافة</AddButton>}
    </>
  );
}

type IconItem = { icon: IconName; title: Localized; body: Localized };

function IconItems({
  items,
  onChange,
  errors,
  path,
  max,
}: {
  items: IconItem[];
  onChange: (l: IconItem[]) => void;
  errors?: Errors;
  path: string;
  max: number;
}) {
  return (
    <>
      <SortableList
        items={items}
        getKey={(_, i) => `${path}-${i}`}
        itemLabel={(x) => x.title.ar || "عنصر"}
        onChange={onChange}
        onRemove={(i) => onChange(items.filter((_, j) => j !== i))}
        render={(x, i) => {
          const up = (patch: Partial<IconItem>) => onChange(items.map((y, j) => (j === i ? { ...y, ...patch } : y)));
          return (
            <div className="space-y-3 p-1">
              <div className="max-w-xs">
                <IconSelect value={x.icon} onChange={(icon) => up({ icon })} />
              </div>
              <LocalizedInput
                label="العنوان"
                value={x.title}
                onChange={(title) => up({ title })}
                errors={errors}
                path={`${path}.${i}.title`}
              />
              <LocalizedInput
                label="الوصف"
                value={x.body}
                onChange={(body) => up({ body })}
                errors={errors}
                path={`${path}.${i}.body`}
                multiline
                rows={2}
              />
            </div>
          );
        }}
      />
      {items.length < max && (
        <AddButton onClick={() => onChange([...items, { icon: "sparkles", title: L(), body: L() }])}>إضافة عنصر</AddButton>
      )}
    </>
  );
}

export function IconSelect({ value, onChange }: { value: IconName; onChange: (v: IconName) => void }) {
  return (
    <label className="block">
      <span className="text-primary mb-1.5 block text-sm font-semibold">الأيقونة</span>
      <span className="flex items-center gap-2">
        <span className="rounded-brand bg-primary text-secondary inline-flex size-10 shrink-0 items-center justify-center">
          <Icon name={value} className="size-5" />
        </span>
        <select
          value={value}
          onChange={(ev) => onChange(ev.target.value as IconName)}
          className={cn(controlClass, "h-10")}
          dir="ltr"
        >
          {iconNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
