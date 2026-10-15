"use client";

import { useEffect, useState } from "react";
import type { ProductView } from "@/lib/catalog";
import { useCart } from "@/lib/cart-store";
import { ProductCard } from "../store/ProductCard";

export function ProductsByIds({ ids, title, excludeId, empty }: { ids?: string[]; title?: string; excludeId?: string; empty?: React.ReactNode }) {
  const recently = useCart((s) => s.recentlyViewed);
  const wanted = (ids ?? recently).filter((id) => id !== excludeId).slice(0, 12);
  const key = wanted.join(",");
  const [products, setProducts] = useState<ProductView[] | null>(null);

  useEffect(() => {
    if (!key) {
      setProducts([]);
      return;
    }
    fetch(`/api/products?ids=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [key]);

  if (products === null) return null;
  if (!products.length) return <>{empty ?? null}</>;
  return (
    <section className="mt-14">
      {title && <h2 className="section-title mb-6">{title}</h2>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
