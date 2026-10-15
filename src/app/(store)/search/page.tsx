import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, SORTS } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/ProductRail";

export const metadata: Metadata = { title: "البحث", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const sort = SORTS[sp.sort ?? ""] ? sp.sort! : "newest";
  const products = await listProducts({
    where: q
      ? { OR: [{ name: { contains: q } }, { tags: { contains: q } }, { keywords: { contains: q } }, { description: { contains: q } }, { brand: { contains: q } }] }
      : {},
    orderBy: SORTS[sort].orderBy,
    take: 60,
  });
  return (
    <div className="container py-10">
      <form className="mx-auto mb-8 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="ابحث عن منتج، ماركة، تصنيف…" autoFocus />
        <button className="btn-primary">بحث</button>
      </form>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{q ? `نتائج البحث عن "${q}" (${products.length})` : "جميع المنتجات"}</h1>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SORTS).map(([k, v]) => (
            <Link key={k} href={`/search?q=${encodeURIComponent(q)}&sort=${k}`} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${k === sort ? "border-ink bg-ink text-white" : ""}`}>{v.label}</Link>
          ))}
        </div>
      </div>
      {products.length ? <ProductGrid products={products} /> : <p className="py-20 text-center text-neutral-500">لم نجد نتائج مطابقة، جرّب كلمات أخرى</p>}
    </div>
  );
}
