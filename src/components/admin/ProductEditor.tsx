"use client";

import { useState } from "react";
import { uploadImage } from "./ImageInput";

type Variant = { id?: string; colorName: string; colorHex: string; size: string; sku: string; price: number | null; stock: number; images: string[] };

export type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  titles: Record<string, string>;
  shortDescription: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  sku: string;
  stock: number;
  brand: string;
  weightKg: number;
  tags: string;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  active: boolean;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  categoryId: string | null;
  variants: Variant[];
};

const TITLE_FIELDS: [string, string][] = [
  ["seo", "عنوان السيو (محركات البحث)"],
  ["marketing", "عنوان تسويقي"],
  ["emotional", "عنوان عاطفي"],
  ["short", "اسم مختصر للبطاقات"],
  ["luxury", "عنوان فاخر"],
  ["ad", "عنوان إعلان (≤30 حرف)"],
  ["social", "عنوان سوشيال ميديا"],
  ["question", "عنوان بصيغة سؤال"],
];

const COLOR_PRESETS: [string, string][] = [
  ["أسود", "#111111"], ["أبيض", "#ffffff"], ["رمادي", "#9ca3af"], ["بيج", "#d6c3a5"], ["بني", "#7b4b2a"], ["كحلي", "#1e2a4a"],
  ["أزرق", "#2563eb"], ["أخضر", "#16a34a"], ["زيتي", "#556b2f"], ["أحمر", "#dc2626"], ["وردي", "#f472b6"], ["ذهبي", "#c99a45"], ["فضي", "#c0c0c0"],
];

export function ProductEditor({ initial, categories, siteUrl }: { initial: ProductForm; categories: { id: string; name: string }[]; siteUrl: string }) {
  const [f, setF] = useState<ProductForm>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [studio, setStudio] = useState<{ loading: boolean; images: { url: string; style: string }[]; original: string; provider: string; selected: string[] }>({ loading: false, images: [], original: "", provider: "", selected: [] });
  const [copyLoading, setCopyLoading] = useState(false);
  const [details, setDetails] = useState("");

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const setVariant = (i: number, patch: Partial<Variant>) => setF((x) => ({ ...x, variants: x.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const generateImages = async (file: File) => {
    setStudio((s) => ({ ...s, loading: true, images: [] }));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", f.name);
    const res = await fetch("/api/admin/ai/images", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      setStudio((s) => ({ ...s, loading: false }));
      return;
    }
    setStudio({ loading: false, images: data.images, original: data.original, provider: data.provider, selected: data.images.map((i: { url: string }) => i.url) });
  };

  const addStudioImages = () => {
    set("images", [...new Set([...f.images, ...studio.selected])]);
    setStudio((s) => ({ ...s, images: [], selected: [] }));
  };

  const generateCopy = async () => {
    if (!f.name.trim()) return alert("اكتب اسم المنتج أولاً");
    setCopyLoading(true);
    const res = await fetch("/api/admin/ai/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        category: categories.find((c) => c.id === f.categoryId)?.name,
        price: f.price || undefined,
        colors: f.variants.map((v) => v.colorName),
        details: [details, f.description].filter(Boolean).join("\n"),
        imageUrl: studio.original || f.images[0],
      }),
    });
    const data = await res.json();
    setCopyLoading(false);
    if (!res.ok) return alert(data.error);
    setF((x) => ({
      ...x,
      titles: data.titles,
      shortDescription: data.shortDescription,
      description: data.description,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      keywords: data.keywords.join("، "),
      slug: x.slug || data.slug,
    }));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(f.id ? `/api/admin/products/${f.id}` : "/api/admin/products", {
      method: f.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error });
    setMsg({ ok: true, text: "تم الحفظ ✓" });
    if (!f.id) window.location.href = `/admin/products/${data.id}`;
    else set("slug", data.slug);
  };

  const remove = async () => {
    if (!f.id || !confirm("حذف المنتج؟")) return;
    const res = await fetch(`/api/admin/products/${f.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.archived) alert("المنتج مرتبط بطلبات سابقة، تم إخفاؤه بدلاً من حذفه");
    window.location.href = "/admin/products";
  };

  const moveImage = (i: number, d: number) => {
    const imgs = [...f.images];
    const j = i + d;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set("images", imgs);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* استوديو الذكاء الاصطناعي */}
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-l from-brand-700 to-ink p-5 text-white">
          <h2 className="text-lg font-black">✨ استوديو الذكاء الاصطناعي</h2>
          <p className="text-sm opacity-80">ارفع صورة واحدة للمنتج واحصل على 6 صور احترافية، ثم اكتب العناوين والوصف والسيو بضغطة زر.</p>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center hover:border-brand-500 ${studio.loading ? "opacity-60" : ""}`}>
              <span className="text-3xl">📸</span>
              <span className="font-bold">{studio.loading ? "جاري توليد 6 صور احترافية…" : "ارفع صورة المنتج لتوليد 6 صور"}</span>
              <span className="text-xs text-neutral-500">JPG / PNG / WEBP حتى 12MB — يُفضّل خلفية بسيطة</span>
              <input type="file" accept="image/*" className="hidden" disabled={studio.loading} onChange={(e) => e.target.files?.[0] && generateImages(e.target.files[0])} />
            </label>
            {studio.images.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">اختر الصور التي تريد إضافتها ({studio.provider === "ai" ? "مولّدة بالذكاء الاصطناعي" : "تصاميم استوديو"}):</p>
                <div className="grid grid-cols-3 gap-2">
                  {studio.images.map((img) => {
                    const on = studio.selected.includes(img.url);
                    return (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => setStudio((s) => ({ ...s, selected: on ? s.selected.filter((u) => u !== img.url) : [...s.selected, img.url] }))}
                        className={`relative overflow-hidden rounded-xl border-4 ${on ? "border-brand-600" : "border-transparent opacity-60"}`}
                      >
                        <img src={img.url} alt={img.style} className="aspect-square w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[10px] text-white">{img.style}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={addStudioImages} className="btn-brand w-full">إضافة {studio.selected.length} صور للمنتج</button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <label className="label" htmlFor="ai-details">معلومات إضافية للذكاء الاصطناعي (اختياري)</label>
            <textarea id="ai-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={5} className="input" placeholder="مثال: خامة قطن 100%، مقاسات من S إلى XL، مناسب للصيف، ضمان سنة…" />
            <button type="button" onClick={generateCopy} disabled={copyLoading} className="btn-primary w-full">
              {copyLoading ? "جاري الكتابة…" : "✍️ اكتب 8 عناوين مختلفة + الوصف + السيو"}
            </button>
            <p className="text-xs text-neutral-500">يستخدم اسم المنتج والتصنيف والألوان وصورة المنتج لكتابة محتوى فريد لكل منتج.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-5">
            <h2 className="font-extrabold">المعلومات الأساسية</h2>
            <div><label className="label">اسم المنتج *</label><input value={f.name} onChange={(e) => set("name", e.target.value)} className="input" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">التصنيف</label>
                <select value={f.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)} className="input">
                  <option value="">بدون تصنيف</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">الماركة</label><input value={f.brand} onChange={(e) => set("brand", e.target.value)} className="input" /></div>
              <div><label className="label">السعر (ر.س) *</label><input type="number" step="0.01" value={f.price || ""} onChange={(e) => set("price", num(e.target.value))} className="input" /></div>
              <div><label className="label">السعر قبل الخصم</label><input type="number" step="0.01" value={f.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value ? Number(e.target.value) : null)} className="input" /></div>
              <div><label className="label">التكلفة (لحساب الربح)</label><input type="number" step="0.01" value={f.cost ?? ""} onChange={(e) => set("cost", e.target.value ? Number(e.target.value) : null)} className="input" /></div>
              <div>
                <label className="label">المخزون {f.variants.length > 0 && <span className="text-xs text-neutral-400">(مجموع الألوان)</span>}</label>
                <input type="number" value={f.variants.length ? f.variants.reduce((s, v) => s + v.stock, 0) : f.stock} disabled={f.variants.length > 0} onChange={(e) => set("stock", num(e.target.value))} className="input" />
              </div>
              <div><label className="label">SKU</label><input value={f.sku} onChange={(e) => set("sku", e.target.value)} className="input" dir="ltr" /></div>
              <div><label className="label">الوزن (كجم) للشحن</label><input type="number" step="0.1" value={f.weightKg} onChange={(e) => set("weightKg", num(e.target.value))} className="input" /></div>
            </div>
            <div><label className="label">وسوم (مفصولة بفواصل)</label><input value={f.tags} onChange={(e) => set("tags", e.target.value)} className="input" /></div>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-extrabold">العناوين المختلفة للمنتج</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TITLE_FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className="label">{label}</label>
                  <input value={f.titles[k] ?? ""} onChange={(e) => set("titles", { ...f.titles, [k]: e.target.value })} className="input" />
                </div>
              ))}
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="font-extrabold">الوصف</h2>
            <div><label className="label">وصف مختصر</label><textarea value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} rows={2} className="input" /></div>
            <div><label className="label">الوصف التفصيلي</label><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={10} className="input" /></div>
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">صور المنتج ({f.images.length})</h2>
              <label className="btn-outline cursor-pointer py-2">
                رفع صور
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = [...(e.target.files ?? [])];
                    const urls = await Promise.all(files.map((file) => uploadImage(file).catch(() => "")));
                    set("images", [...f.images, ...urls.filter(Boolean)]);
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {f.images.map((src, i) => (
                <div key={src} className="group relative overflow-hidden rounded-xl border">
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                  {i === 0 && <span className="badge absolute start-1 top-1 bg-ink text-white">الرئيسية</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => moveImage(i, -1)} className="px-2">→</button>
                    <button type="button" onClick={() => set("images", f.images.filter((_, idx) => idx !== i))} className="px-2">✕</button>
                    <button type="button" onClick={() => moveImage(i, 1)} className="px-2">←</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold">الألوان والمتغيرات ({f.variants.length})</h2>
              <button type="button" onClick={() => set("variants", [...f.variants, { colorName: "", colorHex: "#000000", size: "", sku: "", price: null, stock: 0, images: [] }])} className="btn-outline py-2">+ إضافة لون</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map(([name, hex]) => (
                <button key={name} type="button" onClick={() => set("variants", [...f.variants, { colorName: name, colorHex: hex, size: "", sku: "", price: null, stock: 10, images: [] }])} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:border-ink">
                  <span className="h-3.5 w-3.5 rounded-full border" style={{ background: hex }} /> {name}
                </button>
              ))}
            </div>
            {f.variants.map((v, i) => (
              <div key={v.id ?? i} className="grid items-end gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-3"><label className="label text-xs">اللون</label><input value={v.colorName} onChange={(e) => setVariant(i, { colorName: e.target.value })} className="input py-2" /></div>
                <div className="sm:col-span-1"><label className="label text-xs">الكود</label><input type="color" value={v.colorHex} onChange={(e) => setVariant(i, { colorHex: e.target.value })} className="h-10 w-full rounded-lg border" /></div>
                <div className="sm:col-span-2"><label className="label text-xs">المقاس</label><input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} className="input py-2" placeholder="اختياري" /></div>
                <div className="sm:col-span-2"><label className="label text-xs">السعر</label><input type="number" value={v.price ?? ""} onChange={(e) => setVariant(i, { price: e.target.value ? Number(e.target.value) : null })} className="input py-2" placeholder="نفس السعر" /></div>
                <div className="sm:col-span-1"><label className="label text-xs">الكمية</label><input type="number" value={v.stock} onChange={(e) => setVariant(i, { stock: num(e.target.value) })} className="input py-2" /></div>
                <div className="sm:col-span-2">
                  <label className="label text-xs">صورة اللون</label>
                  <select value={v.images[0] ?? ""} onChange={(e) => setVariant(i, { images: e.target.value ? [e.target.value] : [] })} className="input py-2 text-xs">
                    <option value="">—</option>
                    {f.images.map((src, idx) => <option key={src} value={src}>صورة {idx + 1}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => set("variants", f.variants.filter((_, idx) => idx !== i))} className="btn-ghost py-2 text-red-600 sm:col-span-1">حذف</button>
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <h2 className="font-extrabold">الحالة والظهور</h2>
            {([["active", "منشور في المتجر"], ["featured", "منتج مميز (الرئيسية)"], ["isNew", "شارة جديد"], ["bestSeller", "شارة الأكثر مبيعاً"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm font-bold">
                {label}
                <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-5 w-5 accent-ink" />
              </label>
            ))}
            {f.cost && f.price ? <p className="text-sm text-neutral-600">هامش الربح: <b>{Math.round(((f.price - f.cost) / f.price) * 100)}%</b> ({(f.price - f.cost).toFixed(2)} ر.س)</p> : null}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-extrabold">تحسين محركات البحث SEO</h2>
            <div><label className="label">الرابط (slug)</label><input value={f.slug} onChange={(e) => set("slug", e.target.value)} className="input" /></div>
            <div><label className="label">عنوان الصفحة <span className="text-xs text-neutral-400">({f.seoTitle.length}/60)</span></label><input value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="input" /></div>
            <div><label className="label">الوصف التعريفي <span className="text-xs text-neutral-400">({f.seoDescription.length}/160)</span></label><textarea value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} className="input" /></div>
            <div><label className="label">الكلمات المفتاحية</label><textarea value={f.keywords} onChange={(e) => set("keywords", e.target.value)} rows={2} className="input" /></div>
            <div className="rounded-xl border p-3">
              <p className="mb-1 text-xs text-neutral-500">معاينة في Google</p>
              <p className="truncate text-xs text-green-700" dir="ltr">{siteUrl}/product/{f.slug || "..."}</p>
              <p className="line-clamp-1 text-[17px] text-[#1a0dab]">{f.seoTitle || f.titles.seo || f.name || "عنوان المنتج"}</p>
              <p className="line-clamp-2 text-xs text-neutral-600">{f.seoDescription || f.shortDescription || "الوصف التعريفي يظهر هنا"}</p>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 p-3 backdrop-blur lg:start-64">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {msg && <p className={`text-sm font-bold ${msg.ok ? "text-brand-700" : "text-red-600"}`}>{msg.text}</p>}
          <div className="ms-auto flex gap-2">
            {f.id && <a href={`/product/${encodeURIComponent(f.slug)}`} target="_blank" className="btn-outline">معاينة</a>}
            {f.id && <button type="button" onClick={remove} className="btn-ghost text-red-600">حذف</button>}
            <button type="button" onClick={save} disabled={saving} className="btn-primary px-8">{saving ? "جاري الحفظ…" : "حفظ المنتج"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
