"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState } from "react";
import { saveIdentity } from "@/app/admin/actions/settings";
import { defaultBrand, defaultLogo } from "@/content/defaults/brand";
import { fontOptions, type FontKey } from "@/lib/font-options";
import { brandCssVariables } from "@/lib/theme";
import type { SiteSettings } from "@/types/content";
import { ImagePicker } from "./image-picker";
import { ColorInput, LocalizedInput, SaveBar, Section, useSave, err } from "./inputs";

type Identity = Pick<SiteSettings, "name" | "tagline" | "description" | "logo" | "brand">;

const colorFields: { key: keyof Identity["brand"]; label: string }[] = [
  { key: "primary", label: "اللون الأساسي (الكحلي)" },
  { key: "secondary", label: "اللون الثانوي (الذهبي)" },
  { key: "accent", label: "لون التمييز" },
  { key: "button", label: "لون زر الدعوة الرئيسي" },
  { key: "buttonText", label: "لون نص الزر" },
  { key: "surface", label: "لون خلفية الأقسام" },
  { key: "text", label: "لون النصوص" },
];

export function IdentityEditor({ initial }: { initial: Identity }) {
  const [v, setV] = useState<Identity>(initial);
  const { pending, result, dirty, save, errors } = useSave(saveIdentity, v);
  const set = <K extends keyof Identity>(k: K, val: Identity[K]) => setV((p) => ({ ...p, [k]: val }));
  const setBrand = <K extends keyof Identity["brand"]>(k: K, val: Identity["brand"][K]) =>
    setV((p) => ({ ...p, brand: { ...p.brand, [k]: val } }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <Section title="اسم الشركة والتعريف">
          <LocalizedInput label="اسم الشركة" value={v.name} onChange={(x) => set("name", x)} errors={errors} path="name" />
          <LocalizedInput
            label="الشعار النصي (يظهر تحت الاسم)"
            value={v.tagline}
            onChange={(x) => set("tagline", x)}
            errors={errors}
            path="tagline"
          />
          <LocalizedInput
            label="وصف الشركة (لمحركات البحث والمشاركة)"
            value={v.description}
            onChange={(x) => set("description", x)}
            errors={errors}
            path="description"
            multiline
          />
        </Section>

        <Section
          title="الشعار والأيقونة"
          description="عند عدم رفع شعار يُعرض الرمز مع اسم الشركة نصيًا. يُفضّل SVG أو PNG بخلفية شفافة."
        >
          <ImagePicker
            label="الشعار الرئيسي (الهيدر)"
            aspect="logo"
            value={v.logo.src}
            onChange={(x) => set("logo", { ...v.logo, src: x })}
            hint="ارتفاع مقترح 96px أو أكبر."
          />
          <ImagePicker
            label="شعار التذييل (نسخة فاتحة للخلفية الداكنة)"
            aspect="logo"
            value={v.logo.footerSrc}
            onChange={(x) => set("logo", { ...v.logo, footerSrc: x })}
          />
          <ImagePicker
            label="الرمز (يظهر بجانب الاسم عند عدم وجود شعار)"
            aspect="square"
            allowClear={false}
            value={v.logo.mark}
            onChange={(x) => x && set("logo", { ...v.logo, mark: x })}
          />
          <ImagePicker
            label="أيقونة الموقع Favicon"
            aspect="square"
            value={v.logo.favicon}
            onChange={(x) => set("logo", { ...v.logo, favicon: x })}
            hint="ICO أو PNG مربع بمقاس 48×48 أو أكبر."
          />
        </Section>

        <Section title="الألوان">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {colorFields.map((c) => (
              <ColorInput
                key={c.key}
                label={c.label}
                value={String(v.brand[c.key])}
                onChange={(x) => setBrand(c.key, x as never)}
                error={err(errors, `brand.${c.key}`)}
              />
            ))}
          </div>
        </Section>

        <Section title="الخطوط والأحجام">
          <fieldset>
            <legend className="text-primary mb-2 text-sm font-semibold">الخط</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(fontOptions) as FontKey[]).map((k) => (
                <label
                  key={k}
                  className="rounded-brand border-primary/10 has-checked:border-secondary has-checked:bg-secondary-50 flex cursor-pointer items-center gap-3 border p-3"
                >
                  <input
                    type="radio"
                    name="font"
                    checked={v.brand.font === k}
                    onChange={() => setBrand("font", k)}
                    className="accent-[var(--brand-primary)]"
                  />
                  <span style={{ fontFamily: `var(${fontOptions[k].cssVar})` }}>
                    <span className="text-primary block text-base font-bold">الريادة التجارية</span>
                    <span className="text-muted block text-xs" dir="ltr">
                      {fontOptions[k].label}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <RangeInput
            label="حجم النصوص العام"
            min={90}
            max={115}
            step={5}
            unit="%"
            value={Math.round(v.brand.fontScale * 100)}
            onChange={(n) => setBrand("fontScale", n / 100)}
          />
          <RangeInput
            label="استدارة الزوايا"
            min={0}
            max={24}
            step={2}
            unit="px"
            value={v.brand.radius}
            onChange={(n) => setBrand("radius", n)}
          />
        </Section>
      </div>

      <div className="xl:col-span-2">
        <div className="space-y-3 xl:sticky xl:top-20">
          <h2 className="text-primary font-bold">معاينة مباشرة</h2>
          <BrandPreview identity={v} />
          <p className="text-muted text-xs leading-6">
            المعاينة تتحدث فورًا ولا تُنشر التغييرات على الموقع إلا بعد الضغط على «حفظ التغييرات».
          </p>
        </div>
      </div>

      <div className="xl:col-span-5">
        <SaveBar
          pending={pending}
          dirty={dirty}
          result={result}
          onSave={save}
          extra={
            <button
              type="button"
              onClick={() => {
                if (confirm("استعادة الألوان والخط والشعارات الافتراضية؟ يمكنك المعاينة قبل الحفظ."))
                  setV((p) => ({ ...p, brand: defaultBrand, logo: defaultLogo }));
              }}
              className="rounded-brand border-primary/15 text-primary hover:bg-primary-50 inline-flex h-12 items-center gap-2 border px-4 text-sm font-semibold"
            >
              <RotateCcw className="size-4" aria-hidden />
              استعادة الهوية الافتراضية
            </button>
          }
        />
      </div>
    </div>
  );
}

function RangeInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <label className="block">
      <span className="text-primary mb-1.5 flex justify-between text-sm font-semibold">
        {label}
        <span className="text-muted" dir="ltr">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand-primary)]"
      />
    </label>
  );
}

/** Miniature of the public site rendered with the unsaved theme values. */
function BrandPreview({ identity }: { identity: Identity }) {
  const vars = Object.fromEntries(
    brandCssVariables(identity.brand)
      .split(";")
      .map((d) => [d.slice(0, d.indexOf(":")), d.slice(d.indexOf(":") + 1)]),
  );
  return (
    <div
      style={
        { ...vars, fontFamily: "var(--brand-font)", fontSize: `calc(1rem * ${identity.brand.fontScale})` } as React.CSSProperties
      }
      className="rounded-brand-lg border-primary/10 overflow-hidden border bg-white shadow-lg"
      aria-label="معاينة الهوية"
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {identity.logo.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- live preview of an admin-selected logo
            <img src={identity.logo.src} alt="" className="h-8 w-auto" />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- live preview */}
              <img src={identity.logo.mark} alt="" className="size-8" />
              <span className="truncate text-sm font-bold" style={{ color: "var(--brand-primary)" }}>
                {identity.name.ar || "اسم الشركة"}
              </span>
            </>
          )}
        </div>
        <span
          className="rounded-[var(--brand-radius)] px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: "var(--brand-primary)" }}
        >
          اطلب عرض سعر
        </span>
      </div>
      <div className="p-5 text-white" style={{ background: "var(--brand-primary)" }}>
        <p className="text-xs" style={{ color: "var(--brand-secondary)" }}>
          {identity.tagline.ar}
        </p>
        <p className="mt-2 text-lg leading-snug font-bold">نصنع قيمة مستدامة لأعمالك</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-[var(--brand-radius)] px-4 py-2 text-xs font-semibold"
            style={{ background: "var(--brand-button)", color: "var(--brand-button-text)" }}
          >
            اكتشف خدماتنا
            <ArrowLeft className="size-3.5" aria-hidden />
          </span>
          <span className="rounded-[var(--brand-radius)] border border-white/40 px-4 py-2 text-xs font-semibold">تواصل معنا</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4" style={{ background: "var(--brand-surface)" }}>
        {["التوريدات العامة", "المقاولات العامة"].map((t) => (
          <div key={t} className="rounded-[calc(var(--brand-radius)*1.2)] bg-white p-3">
            <span
              className="inline-block size-7 rounded-[var(--brand-radius)]"
              style={{ background: "color-mix(in oklab, var(--brand-secondary) 20%, white)" }}
            />
            <p className="mt-2 text-sm font-bold" style={{ color: "var(--brand-primary)" }}>
              {t}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--brand-text)", opacity: 0.7 }}>
              نص توضيحي قصير للخدمة.
            </p>
            <p className="mt-2 text-xs font-semibold" style={{ color: "var(--brand-accent)" }}>
              اقرأ المزيد
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
