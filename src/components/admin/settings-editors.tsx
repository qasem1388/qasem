"use client";

import { useState } from "react";
import { saveCompany, saveFooter, saveGeneral } from "@/app/admin/actions/settings";
import { socialLabels } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";
import type { LinkItem, Localized, OptionalPage, SchemaType, SiteSettings, SocialPlatform } from "@/types/content";
import { ImagePicker } from "./image-picker";
import {
  AddButton,
  LocalizedInput,
  SaveBar,
  Section,
  SortableList,
  TextInput,
  Toggle,
  controlClass,
  err,
  useSave,
  type SaveResult,
} from "./inputs";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

/* ───────── Company data ───────── */

type Company = Pick<SiteSettings, "legal" | "contact" | "social">;

export function CompanyEditor({ initial }: { initial: Company }) {
  const [v, setV] = useState(initial);
  const save = useSaveWrap(saveCompany, v);
  const c = v.contact;
  const setC = (patch: Partial<Company["contact"]>) => setV((p) => ({ ...p, contact: { ...p.contact, ...patch } }));
  const e = save.errors;
  const platforms = Object.keys(socialLabels) as SocialPlatform[];

  return (
    <div className="space-y-6">
      <Section title="البيانات النظامية">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="رقم السجل التجاري"
            dir="ltr"
            value={v.legal.crNumber}
            onChange={(x) => setV((p) => ({ ...p, legal: { ...p.legal, crNumber: x } }))}
            error={err(e, "legal.crNumber")}
          />
          <TextInput
            label="الرقم الضريبي (اختياري)"
            dir="ltr"
            value={v.legal.vatNumber}
            onChange={(x) => setV((p) => ({ ...p, legal: { ...p.legal, vatNumber: x || undefined } }))}
            error={err(e, "legal.vatNumber")}
          />
        </div>
      </Section>

      <Section title="بيانات التواصل">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="رقم الهاتف (للاتصال)"
            dir="ltr"
            placeholder="+966110000000"
            value={c.phone}
            onChange={(x) => setC({ phone: x })}
            error={err(e, "contact.phone")}
          />
          <TextInput
            label="رقم الهاتف (كما يظهر)"
            dir="ltr"
            placeholder="011 000 0000"
            value={c.phoneDisplay}
            onChange={(x) => setC({ phoneDisplay: x })}
            error={err(e, "contact.phoneDisplay")}
          />
          <TextInput
            label="واتساب"
            dir="ltr"
            placeholder="966500000000"
            hint="بالصيغة الدولية دون + أو مسافات."
            value={c.whatsapp}
            onChange={(x) => setC({ whatsapp: x })}
            error={err(e, "contact.whatsapp")}
          />
          <TextInput
            label="البريد الإلكتروني"
            dir="ltr"
            type="email"
            value={c.email}
            onChange={(x) => setC({ email: x })}
            error={err(e, "contact.email")}
          />
        </div>
        <LocalizedInput
          label="ساعات العمل"
          value={c.workingHours}
          onChange={(x) => setC({ workingHours: x })}
          errors={e}
          path="contact.workingHours"
        />
      </Section>

      <Section title="العنوان والموقع">
        <LocalizedInput
          label="العنوان الوطني"
          value={c.address}
          onChange={(x) => setC({ address: x })}
          errors={e}
          path="contact.address"
        />
        <LocalizedInput label="المدينة" value={c.city} onChange={(x) => setC({ city: x })} errors={e} path="contact.city" />
        <LocalizedInput
          label="المنطقة"
          value={c.region ?? { ar: "", en: "" }}
          onChange={(x) => setC({ region: x })}
          errors={e}
          path="contact.region"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextInput
            label="خط العرض (Latitude)"
            dir="ltr"
            type="number"
            value={c.lat}
            onChange={(x) => setC({ lat: num(x) })}
            error={err(e, "contact.lat")}
          />
          <TextInput
            label="خط الطول (Longitude)"
            dir="ltr"
            type="number"
            value={c.lng}
            onChange={(x) => setC({ lng: num(x) })}
            error={err(e, "contact.lng")}
          />
          <TextInput
            label="رابط الخريطة"
            dir="ltr"
            value={c.mapUrl}
            onChange={(x) => setC({ mapUrl: x })}
            error={err(e, "contact.mapUrl")}
          />
        </div>
      </Section>

      <Section title="حسابات التواصل الاجتماعي" description="رتّب الحسابات بالسحب أو بالأسهم؛ تظهر بنفس الترتيب في الموقع.">
        <SortableList
          items={v.social}
          getKey={(s, i) => `${s.platform}-${i}`}
          itemLabel={(s) => socialLabels[s.platform]}
          onChange={(social) => setV((p) => ({ ...p, social }))}
          onRemove={(i) => setV((p) => ({ ...p, social: p.social.filter((_, j) => j !== i) }))}
          render={(s, i) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                aria-label="المنصة"
                value={s.platform}
                onChange={(ev) =>
                  setV((p) => ({
                    ...p,
                    social: p.social.map((x, j) => (j === i ? { ...x, platform: ev.target.value as SocialPlatform } : x)),
                  }))
                }
                className={cn(controlClass, "h-10")}
              >
                {platforms.map((pl) => (
                  <option key={pl} value={pl}>
                    {socialLabels[pl]}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-2">
                <input
                  aria-label={`رابط ${socialLabels[s.platform]}`}
                  dir="ltr"
                  value={s.url}
                  placeholder="https://"
                  onChange={(ev) =>
                    setV((p) => ({ ...p, social: p.social.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)) }))
                  }
                  className={cn(controlClass, "h-10 text-left")}
                  aria-invalid={err(e, `social.${i}.url`) ? true : undefined}
                />
                {err(e, `social.${i}.url`) && <p className="mt-1 text-xs text-red-600">{err(e, `social.${i}.url`)}</p>}
              </div>
            </div>
          )}
        />
        <AddButton onClick={() => setV((p) => ({ ...p, social: [...p.social, { platform: "x", url: "https://" }] }))}>
          إضافة حساب
        </AddButton>
      </Section>
      <SaveBar {...save.bar} />
    </div>
  );
}

/* ───────── Footer ───────── */

type Footer = SiteSettings["footer"];
const emptyL: Localized = { ar: "", en: "" };

export function FooterEditor({ initial }: { initial: Footer }) {
  const [v, setV] = useState(initial);
  const save = useSaveWrap(saveFooter, v);
  const e = save.errors;
  const setCol = (i: number, patch: Partial<Footer["columns"][number]>) =>
    setV((p) => ({ ...p, columns: p.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  return (
    <div className="space-y-6">
      <Section title="نبذة التذييل وحقوق النشر">
        <LocalizedInput
          label="نبذة مختصرة"
          value={v.about}
          onChange={(x) => setV((p) => ({ ...p, about: x }))}
          errors={e}
          path="about"
          multiline
        />
        <LocalizedInput
          label="نص حقوق النشر"
          value={v.copyright}
          onChange={(x) => setV((p) => ({ ...p, copyright: x }))}
          errors={e}
          path="copyright"
        />
      </Section>
      <Section
        title="أعمدة الروابط"
        description="حتى 4 أعمدة، وحتى 15 رابطًا في كل عمود. بيانات التواصل ومنصات التواصل تُعرض تلقائيًا من «بيانات المنشأة»."
      >
        <SortableList
          items={v.columns}
          getKey={(_, i) => `col-${i}`}
          itemLabel={(c) => c.title.ar || "عمود"}
          onChange={(columns) => setV((p) => ({ ...p, columns }))}
          onRemove={(i) => setV((p) => ({ ...p, columns: p.columns.filter((_, j) => j !== i) }))}
          render={(col, i) => (
            <div className="space-y-3 p-1">
              <LocalizedInput
                label="عنوان العمود"
                value={col.title}
                onChange={(x) => setCol(i, { title: x })}
                errors={e}
                path={`columns.${i}.title`}
              />
              <LinksEditor links={col.links} onChange={(links) => setCol(i, { links })} errors={e} path={`columns.${i}.links`} />
            </div>
          )}
        />
        {v.columns.length < 4 && (
          <AddButton onClick={() => setV((p) => ({ ...p, columns: [...p.columns, { title: { ...emptyL }, links: [] }] }))}>
            إضافة عمود
          </AddButton>
        )}
      </Section>
      <SaveBar {...save.bar} />
    </div>
  );
}

/** Editable list of links (label + href); used by the footer and menus. */
export function LinksEditor({
  links,
  onChange,
  errors,
  path,
  single = false,
}: {
  links: LinkItem[];
  onChange: (l: LinkItem[]) => void;
  errors?: Record<string, string>;
  path: string;
  /** One fixed link (no add/remove); errors are keyed without the index. */
  single?: boolean;
}) {
  const ep = (i: number, f: string) => (single ? `${path}.${f}` : `${path}.${i}.${f}`);
  return (
    <div>
      <SortableList
        items={links}
        getKey={(_, i) => `${path}-${i}`}
        itemLabel={(l) => l.label.ar || l.href}
        onChange={onChange}
        onRemove={single ? undefined : (i) => onChange(links.filter((_, j) => j !== i))}
        render={(l, i) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              aria-label="نص الرابط (عربي)"
              value={l.label.ar}
              onChange={(ev) =>
                onChange(links.map((x, j) => (j === i ? { ...x, label: { ...x.label, ar: ev.target.value } } : x)))
              }
              placeholder="النص بالعربية"
              className={cn(controlClass, "h-9")}
            />
            <input
              aria-label="نص الرابط (English)"
              dir="ltr"
              value={l.label.en}
              onChange={(ev) =>
                onChange(links.map((x, j) => (j === i ? { ...x, label: { ...x.label, en: ev.target.value } } : x)))
              }
              placeholder="English label"
              className={cn(controlClass, "h-9 text-left")}
            />
            <div>
              <input
                aria-label="الرابط"
                dir="ltr"
                value={l.href}
                onChange={(ev) => onChange(links.map((x, j) => (j === i ? { ...x, href: ev.target.value } : x)))}
                placeholder="/about"
                className={cn(controlClass, "h-9 text-left")}
                aria-invalid={errors?.[ep(i, "href")] ? true : undefined}
              />
              {(errors?.[ep(i, "href")] || errors?.[ep(i, "label.ar")]) && (
                <p className="mt-1 text-xs text-red-600">{errors?.[ep(i, "href")] ?? errors?.[ep(i, "label.ar")]}</p>
              )}
            </div>
          </div>
        )}
      />
      {!single && (
        <AddButton onClick={() => onChange([...links, { label: { ar: "", en: "" }, href: "/" }])}>إضافة رابط</AddButton>
      )}
    </div>
  );
}

/* ───────── General ───────── */

type General = Pick<SiteSettings, "demoMode" | "pages" | "seo">;
const pageLabels: Record<OptionalPage, string> = {
  sectors: "القطاعات",
  media: "المركز الإعلامي",
  clients: "عملاؤنا وشركاؤنا",
  careers: "التوظيف",
  faq: "الأسئلة الشائعة",
};

const schemaTypeLabels: Record<SchemaType, string> = {
  Organization: "منظمة / شركة (Organization)",
  Corporation: "شركة مساهمة أو قابضة (Corporation)",
  LocalBusiness: "نشاط تجاري محلي (LocalBusiness)",
  ProfessionalService: "خدمات مهنية (ProfessionalService)",
  GeneralContractor: "مقاولات عامة (GeneralContractor)",
};

export function GeneralEditor({ initial }: { initial: General }) {
  const [v, setV] = useState(initial);
  const save = useSaveWrap(saveGeneral, v);
  const setAnalytics = (patch: NonNullable<General["seo"]["analytics"]>) =>
    setV((p) => ({ ...p, seo: { ...p.seo, analytics: { ...p.seo.analytics, ...patch } } }));
  return (
    <div className="space-y-6">
      <Section
        title="الصفحات الاختيارية"
        description="عند تعطيل قسم تُخفى روابطه من القوائم والتذييل وخريطة الموقع، وتعرض صفحاته رسالة «غير موجودة»."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(pageLabels) as OptionalPage[]).map((k) => (
            <Toggle
              key={k}
              label={pageLabels[k]}
              checked={v.pages[k] !== false}
              onChange={(x) => setV((p) => ({ ...p, pages: { ...p.pages, [k]: x } }))}
            />
          ))}
        </div>
      </Section>
      <Section title="المشاركة الاجتماعية">
        <ImagePicker
          label="صورة المشاركة الافتراضية (Open Graph)"
          value={v.seo.shareImage}
          onChange={(x) => setV((p) => ({ ...p, seo: { ...p.seo, shareImage: x } }))}
          hint="تظهر عند مشاركة روابط الموقع في واتساب وX ولينكدإن. المقاس المثالي 1200×630 بصيغة JPG أو PNG."
        />
      </Section>
      <Section
        title="محركات البحث"
        description="تُولَّد خريطة الموقع (sitemap.xml) وملف robots.txt والبيانات المنظمة تلقائيًا من محتوى الموقع."
      >
        <div className="space-y-4">
          <Toggle
            label="السماح لمحركات البحث بأرشفة الموقع"
            hint="أطفئه أثناء تجهيز الموقع أو على نسخة الاختبار؛ ستُضاف علامة noindex ويُمنع الزحف في robots.txt."
            checked={v.seo.indexable !== false}
            onChange={(x) => setV((p) => ({ ...p, seo: { ...p.seo, indexable: x } }))}
          />
          <label className="block max-w-md">
            <span className="text-ink mb-1.5 block text-sm font-semibold">نوع المنشأة في البيانات المنظمة (Schema.org)</span>
            <select
              className={cn(controlClass, "h-10")}
              value={v.seo.schemaType ?? "Organization"}
              onChange={(ev) => setV((p) => ({ ...p, seo: { ...p.seo, schemaType: ev.target.value as SchemaType } }))}
            >
              {(Object.keys(schemaTypeLabels) as SchemaType[]).map((k) => (
                <option key={k} value={k}>
                  {schemaTypeLabels[k]}
                </option>
              ))}
            </select>
            <span className="text-muted mt-1 block text-xs">
              يساعد Google على فهم طبيعة النشاط. الأنواع المحلية تُضيف العنوان والموقع الجغرافي وأوقات العمل.
            </span>
          </label>
        </div>
      </Section>
      <Section
        title="التحليلات"
        description="لا تُحمَّل أدوات التحليل إلا بعد موافقة الزائر على ملفات تعريف الارتباط. اترك الحقل فارغًا لتعطيل الأداة."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="معرّف Google Analytics 4"
            dir="ltr"
            placeholder="G-XXXXXXXXXX"
            value={v.seo.analytics?.ga4Id ?? ""}
            onChange={(x) => setAnalytics({ ga4Id: x.trim().toUpperCase() })}
            error={err(save.errors, "seo.analytics.ga4Id")}
          />
          <TextInput
            label="نطاق Plausible"
            dir="ltr"
            placeholder="example.sa"
            value={v.seo.analytics?.plausibleDomain ?? ""}
            onChange={(x) => setAnalytics({ plausibleDomain: x.trim().toLowerCase() })}
            error={err(save.errors, "seo.analytics.plausibleDomain")}
          />
        </div>
      </Section>
      <Section title="وضع العرض التجريبي">
        <Toggle
          label="إظهار تنويه «موقع تجريبي» أسفل الموقع"
          hint="أطفئه بعد استبدال البيانات التجريبية ببيانات المنشأة الحقيقية."
          checked={v.demoMode}
          onChange={(x) => setV((p) => ({ ...p, demoMode: x }))}
        />
      </Section>
      <SaveBar {...save.bar} />
    </div>
  );
}

/* helper: adapts useSave to SaveBar props */
function useSaveWrap<T>(action: (json: string) => Promise<SaveResult>, value: T) {
  const s = useSave(action, value);
  return { errors: s.errors, bar: { pending: s.pending, dirty: s.dirty, result: s.result, onSave: s.save } };
}
