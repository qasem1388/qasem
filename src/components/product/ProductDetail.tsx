"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { discountPercent, formatPrice } from "@/lib/format";
import { CartIcon, ClockIcon, HeartIcon, MinusIcon, PlusIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from "../icons";
import { Stars } from "../store/Stars";

type Props = {
  p: ProductView;
  whatsapp: string;
  delivery: { from: string; to: string };
  freeShippingThreshold: number;
};

export function ProductDetail({ p, whatsapp, delivery, freeShippingThreshold }: Props) {
  const add = useCart((s) => s.add);
  const toggle = useCart((s) => s.toggleWishlist);
  const wishlist = useCart((s) => s.wishlist);
  const viewed = useCart((s) => s.viewed);
  const [mounted, setMounted] = useState(false);
  const colors = useMemo(() => [...new Map(p.variants.map((v) => [v.colorName, v])).values()], [p.variants]);
  const [color, setColor] = useState(colors.find((c) => c.stock > 0)?.colorName ?? colors[0]?.colorName ?? "");
  const sizes = p.variants.filter((v) => v.colorName === color && v.size);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
    viewed(p.id);
  }, [p.id, viewed]);

  const variant = p.variants.length
    ? p.variants.find((v) => v.colorName === color && (sizes.length ? v.size === size : true)) ?? null
    : null;
  const needsSize = sizes.length > 0 && !size;
  const price = variant?.price ?? p.price;
  const stock = variant ? variant.stock : p.variants.length ? 0 : p.stock;
  const images = useMemo(() => {
    const vImgs = p.variants.find((v) => v.colorName === color)?.images ?? [];
    return [...new Set([...vImgs, ...p.images])];
  }, [color, p.images, p.variants]);
  const off = discountPercent(price, p.compareAtPrice);
  const liked = mounted && wishlist.includes(p.id);

  useEffect(() => setActive(0), [color]);

  const addToCart = (goCheckout = false) => {
    if (needsSize || stock <= 0) return;
    add(
      {
        productId: p.id,
        variantId: variant?.id ?? null,
        slug: p.slug,
        name: p.name,
        variant: variant ? [variant.colorName, variant.size].filter(Boolean).join(" / ") : "",
        image: images[0] ?? "",
        price,
        maxStock: stock,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    if (goCheckout) window.location.href = "/checkout";
  };

  const waText = `السلام عليكم، أستفسر عن: ${p.name}${color ? ` - اللون ${color}` : ""}\n${typeof window !== "undefined" ? window.location.href : ""}`;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* معرض الصور */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-neutral-100">
          {images[active] && <img src={images[active]} alt={`${p.name}${color ? ` - ${color}` : ""}`} className="h-full w-full object-cover" fetchPriority="high" />}
          {off > 0 && <span className="badge absolute start-4 top-4 bg-red-500 px-3 py-1.5 text-sm text-white">خصم {off}%</span>}
        </div>
        {images.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {images.map((src, i) => (
              <button key={src} onClick={() => setActive(i)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === active ? "border-ink" : "border-transparent"}`} aria-label={`صورة ${i + 1}`}>
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* المعلومات */}
      <div>
        {p.brand && <p className="mb-1 text-sm font-bold text-brand-700">{p.brand}</p>}
        <h1 className="text-2xl font-black leading-snug md:text-3xl">{p.name}</h1>
        {p.titles.marketing && <p className="mt-2 text-neutral-600">{p.titles.marketing}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {p.ratingCount > 0 && (
            <a href="#reviews" className="flex items-center gap-1.5"><Stars value={p.ratingAvg} /> <span className="text-neutral-500">({p.ratingCount} تقييم)</span></a>
          )}
          {p.salesCount > 10 && <span className="rounded-full bg-orange-50 px-3 py-1 font-bold text-orange-700">🔥 تم بيع {p.salesCount}+</span>}
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-3xl font-black">{formatPrice(price)}</span>
          {p.compareAtPrice && p.compareAtPrice > price && <span className="text-lg text-neutral-400 line-through">{formatPrice(p.compareAtPrice)}</span>}
          {off > 0 && <span className="text-sm font-bold text-red-600">وفّر {formatPrice(p.compareAtPrice! - price)}</span>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">السعر شامل ضريبة القيمة المضافة</p>

        {/* التقسيط */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#ffd3c2] bg-[#fff6f2] p-3 text-xs">
            <span className="rounded-md bg-[#ffd3c2] px-2 py-1 font-extrabold" dir="ltr">tamara</span>
            <span>4 دفعات بقيمة <b>{formatPrice(price / 4)}</b> بدون فوائد</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#3effc0]/60 bg-[#effff9] p-3 text-xs">
            <span className="rounded-md bg-[#3effc0] px-2 py-1 font-extrabold" dir="ltr">tabby</span>
            <span>قسّمها على 4: <b>{formatPrice(price / 4)}</b> شهرياً</span>
          </div>
        </div>

        {/* الألوان */}
        {colors.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-bold">اللون: <span className="font-normal text-neutral-600">{color}</span></p>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const out = p.variants.filter((v) => v.colorName === c.colorName).every((v) => v.stock <= 0);
                return (
                  <button
                    key={c.colorName}
                    onClick={() => { setColor(c.colorName); setSize(""); }}
                    title={c.colorName}
                    aria-label={c.colorName}
                    aria-pressed={color === c.colorName}
                    className={`relative h-11 w-11 rounded-full border-2 p-0.5 transition ${color === c.colorName ? "border-ink" : "border-neutral-200"} ${out ? "opacity-40" : ""}`}
                  >
                    <span className="block h-full w-full rounded-full border border-black/10" style={{ background: c.colorHex }} />
                    {out && <span className="absolute inset-0 m-auto h-0.5 w-full rotate-45 bg-neutral-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => (
                <button key={v.id} disabled={v.stock <= 0} onClick={() => setSize(v.size)} className={`min-w-12 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40 ${size === v.size ? "border-ink bg-ink text-white" : ""}`}>{v.size}</button>
              ))}
            </div>
          </div>
        )}

        {stock > 0 && stock <= 5 && <p className="mt-4 text-sm font-bold text-red-600">⚠️ بقي {stock} قطع فقط — اطلبه قبل نفاد الكمية</p>}

        {/* الكمية والشراء */}
        <div className="mt-6 flex gap-3">
          <div className="flex items-center rounded-xl border">
            <button className="p-3" onClick={() => setQty((q) => Math.min(q + 1, Math.max(1, stock)))} aria-label="زيادة"><PlusIcon /></button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="إنقاص"><MinusIcon /></button>
          </div>
          <button onClick={() => addToCart()} disabled={stock <= 0 || needsSize} className="btn-primary flex-1 py-4 text-base">
            <CartIcon /> {stock <= 0 ? "نفدت الكمية" : needsSize ? "اختر المقاس" : added ? "تمت الإضافة ✓" : "أضف إلى السلة"}
          </button>
          <button onClick={() => toggle(p.id)} className={`btn-outline px-4 ${liked ? "text-red-500" : ""}`} aria-label="المفضلة">
            <HeartIcon className={liked ? "fill-current" : ""} />
          </button>
        </div>
        <button onClick={() => addToCart(true)} disabled={stock <= 0 || needsSize} className="btn-brand mt-3 w-full py-4 text-base">اشترِ الآن</button>
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" className="btn mt-3 w-full border border-[#25d366] text-[#128c4a] hover:bg-[#25d366]/10">
          <WhatsAppIcon className="h-5 w-5" /> اسأل عن المنتج عبر واتساب
        </a>

        {/* التوصيل */}
        <div className="mt-6 space-y-3 rounded-2xl bg-neutral-50 p-4 text-sm">
          <p className="flex items-start gap-2"><TruckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /><span>اطلب الآن ويصلك بين <b>{delivery.from}</b> و <b>{delivery.to}</b> (2-5 أيام عمل) لجميع مدن المملكة عبر سمسا أو أرامكس.</span></p>
          {freeShippingThreshold > 0 && <p className="flex items-start gap-2"><ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /><span>شحن مجاني للطلبات فوق {formatPrice(freeShippingThreshold)}</span></p>}
          <p className="flex items-start gap-2"><ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" /><span>منتج أصلي 100% • الدفع عند الاستلام متاح • استرجاع خلال 7 أيام</span></p>
        </div>

        {p.shortDescription && <p className="prose-ar mt-6">{p.shortDescription}</p>}
      </div>

      {/* شريط الشراء الثابت للجوال */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-white p-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-neutral-500">{p.titles.short || p.name}</p>
          <p className="font-black">{formatPrice(price)}</p>
        </div>
        <button onClick={() => addToCart()} disabled={stock <= 0 || needsSize} className="btn-primary px-6">{stock <= 0 ? "نفدت" : added ? "✓ أُضيف" : "أضف للسلة"}</button>
      </div>
    </div>
  );
}
