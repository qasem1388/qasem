"use client";

import { ExternalLink, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePage } from "@/app/admin/actions/pages";
import { textToHtml } from "@/lib/text-to-html";
import { cn } from "@/lib/utils";
import type { Localized } from "@/types/content";
import { LocalizedInput, SaveBar, Section, TextInput, controlClass, useSave } from "./inputs";
import { RichTextEditor } from "./rich-text-editor";

export type PageDraft = {
  title: Localized;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoDescription: Localized;
  body: Localized;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 80);

export function PageEditor({ id, initial, system }: { id: string | null; initial: PageDraft; system: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<PageDraft>(() => ({
    ...initial,
    body: { ar: textToHtml(initial.body.ar), en: textToHtml(initial.body.en) },
  }));
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [slugTouched, setSlugTouched] = useState(!!id);
  const s = useSave(async (json) => {
    const res = await savePage(id, json);
    if (res.ok && !id && res.id) router.replace(`/admin/pages/${res.id}?created=1`);
    return res;
  }, v);
  const e = s.errors;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Section title="العنوان والمحتوى">
          <LocalizedInput
            label="عنوان الصفحة"
            value={v.title}
            onChange={(title) => setV((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title.en) }))}
            errors={e}
            path="title"
          />
          <div>
            <div role="tablist" aria-label="لغة المحتوى" className="mb-2 flex gap-1">
              {(["ar", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-brand px-4 py-1.5 text-sm font-semibold",
                    lang === l ? "bg-primary text-white" : "bg-surface text-ink/70",
                  )}
                >
                  {l === "ar" ? "المحتوى بالعربية" : "English content"}
                </button>
              ))}
            </div>
            {/* Both editors stay mounted so undo history is kept per language. */}
            <div className={lang === "ar" ? "" : "hidden"}>
              <RichTextEditor
                label="المحتوى بالعربية"
                dir="rtl"
                value={v.body.ar}
                onChange={(ar) => setV((p) => ({ ...p, body: { ...p.body, ar } }))}
              />
            </div>
            <div className={lang === "en" ? "" : "hidden"}>
              <RichTextEditor
                label="English content"
                dir="ltr"
                value={v.body.en}
                onChange={(en) => setV((p) => ({ ...p, body: { ...p.body, en } }))}
              />
            </div>
          </div>
        </Section>
      </div>
      <div className="space-y-6">
        <Section title="النشر">
          <label className="block">
            <span className="text-primary mb-1.5 block text-sm font-semibold">الحالة</span>
            <select
              value={v.status}
              onChange={(ev) => setV((p) => ({ ...p, status: ev.target.value as PageDraft["status"] }))}
              className={cn(controlClass, "h-10")}
            >
              <option value="PUBLISHED">منشورة</option>
              <option value="DRAFT">مسودة (غير ظاهرة)</option>
              <option value="ARCHIVED">مؤرشفة (غير ظاهرة)</option>
            </select>
          </label>
          <TextInput
            label="رابط الصفحة"
            dir="ltr"
            value={v.slug}
            onChange={(slug) => {
              setSlugTouched(true);
              setV((p) => ({ ...p, slug: slug.toLowerCase() }));
            }}
            error={e?.slug}
            hint={system ? "رابط هذه الصفحة الأساسية ثابت." : `يظهر الرابط هكذا: /ar/${v.slug || "page-name"}`}
          />
          {id && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`/admin/pages/${id}/preview`}
                target="_blank"
                className="rounded-brand border-primary/15 text-primary inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-semibold"
              >
                <Eye className="size-4" aria-hidden />
                معاينة المحفوظ
              </a>
              {initial.status === "PUBLISHED" && (
                <a
                  href={`/ar/${initial.slug}`}
                  target="_blank"
                  className="rounded-brand border-primary/15 text-primary inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-semibold"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  عرض في الموقع
                </a>
              )}
            </div>
          )}
        </Section>
        <Section title="محركات البحث">
          <LocalizedInput
            label="وصف الصفحة (Meta description)"
            value={v.seoDescription}
            onChange={(seoDescription) => setV((p) => ({ ...p, seoDescription }))}
            errors={e}
            path="seoDescription"
            multiline
          />
        </Section>
      </div>
      <div className="xl:col-span-3">
        <SaveBar pending={s.pending} dirty={s.dirty} result={s.result} onSave={s.save} />
      </div>
    </div>
  );
}
