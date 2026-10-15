"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { discountPercent, formatPrice } from "@/lib/format";
import { CartIcon, HeartIcon, StarIcon } from "../icons";

export function ProductCard({ p, priority = false }: { p: ProductView; priority?: boolean }) {
  const add = useCart((s) => s.add);
  const wishlist = useCart((s) => s.wishlist);
  const toggle = useCart((s) => s.toggleWishlist);
  const [mounted, setMounted] = useState(false);
  const [hoverImg, setHoverImg] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const off = discountPercent(p.price, p.compareAtPrice);
  const title = p.titles.short || p.name;
  const href = `/product/${encodeURIComponent(p.slug)}`;
  const outOfStock = p.stock <= 0;
  const liked = mounted && wishlist.includes(p.id);

  const quickAdd = () => {
    if (p.variants.length > 1) {
      window.location.href = href;
      return;
    }
    const v = p.variants[0];
    add({
      productId: p.id,
      variantId: v?.id ?? null,
      slug: p.slug,
      name: p.name,
      variant: v ? v.colorName : "",
      image: v?.images[0] ?? p.images[0] ?? "",
      price: v?.price ?? p.price,
      maxStock: v?.stock ?? p.stock,
    });
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100" onMouseEnter={() => setHoverImg(true)} onMouseLeave={() => setHoverImg(false)}>
        <Link href={href} aria-label={p.name}>
          {p.images[0] && (
            <img src={hoverImg && p.images[1] ? p.images[1] : p.images[0]} alt={p.name} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          )}
        </Link>
        <div className="absolute start-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <span className="badge bg-red-500 text-white">-{off}%</span>}
          {p.isNew && <span className="badge bg-white text-ink">جديد</span>}
          {p.bestSeller && <span className="badge bg-gold-500 text-white">الأكثر مبيعاً</span>}
          {outOfStock && <span className="badge bg-neutral-800 text-white">نفدت الكمية</span>}
        </div>
        <button
          onClick={() => toggle(p.id)}
          className={`absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition ${liked ? "text-red-500" : "text-neutral-600 hover:text-red-500"}`}
          aria-label={liked ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          <HeartIcon className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
        </button>
        {!outOfStock && (
          <button
            onClick={quickAdd}
            className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-bold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100 max-md:py-2.5"
          >
            <CartIcon className="h-4 w-4" /> {p.variants.length > 1 ? "اختر اللون" : "أضف للسلة"}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        {p.category && <p className="text-xs text-neutral-500">{p.category.name}</p>}
        <h3 className="line-clamp-2 text-sm font-bold leading-6 md:text-[15px]"><Link href={href}>{title}</Link></h3>
        {p.ratingCount > 0 && (
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            <StarIcon className="h-3.5 w-3.5 text-gold-500" /> {p.ratingAvg.toFixed(1)} ({p.ratingCount})
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="text-base font-extrabold">{formatPrice(p.price)}</span>
          {p.compareAtPrice && p.compareAtPrice > p.price && <span className="text-xs text-neutral-400 line-through">{formatPrice(p.compareAtPrice)}</span>}
        </div>
        {p.variants.length > 1 && (
          <div className="flex gap-1.5 pt-1">
            {p.variants.slice(0, 6).map((v) => (
              <span key={v.id} title={v.colorName} className="h-4 w-4 rounded-full border border-neutral-300" style={{ background: v.colorHex }} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
