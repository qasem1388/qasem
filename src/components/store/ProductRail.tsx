import Link from "next/link";
import type { ProductView } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

export function ProductRail({ title, subtitle, products, href }: { title: string; subtitle?: string; products: ProductView[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="container mt-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-neutral-500">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="shrink-0 text-sm font-bold text-brand-700 hover:underline">عرض الكل ←</Link>}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {products.map((p, i) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-auto">
            <ProductCard p={p} priority={i < 2} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductGrid({ products }: { products: ProductView[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < 4} />
      ))}
    </div>
  );
}
