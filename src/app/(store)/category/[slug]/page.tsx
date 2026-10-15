import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listProducts, SORTS } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/ProductRail";
import { JsonLd } from "@/components/store/JsonLd";
import { siteUrl } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; page?: string }> };
const PER_PAGE = 24;

async function getCategory(slug: string) {
  return prisma.category.findFirst({ where: { slug: decodeURIComponent(slug), active: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return {
    title: c.seoTitle || c.name,
    description: c.seoDescription || c.description,
    alternates: { canonical: `/category/${encodeURIComponent(c.slug)}` },
    openGraph: { title: c.seoTitle || c.name, description: c.seoDescription || c.description, images: c.bannerImage || c.image ? [c.bannerImage || c.image] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await getCategory((await params).slug);
  if (!c) notFound();
  const sp = await searchParams;
  const sort = SORTS[sp.sort ?? ""] ? sp.sort! : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { categoryId: c.id, active: true };
  const [products, total] = await Promise.all([
    listProducts({ where, orderBy: SORTS[sort].orderBy, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    prisma.product.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const base = `/category/${encodeURIComponent(c.slug)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: c.name, item: `${siteUrl()}${base}` },
          ],
        }}
      />
      <section className="relative">
        {c.bannerImage ? (
          <div className="relative h-56 overflow-hidden md:h-80">
            <img src={c.bannerImage} alt={c.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center bg-black/45">
              <div className="container text-white">
                <h1 className="text-3xl font-black md:text-5xl">{c.name}</h1>
                {c.description && <p className="mt-2 max-w-xl opacity-90">{c.description}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="container pt-10">
            <h1 className="text-3xl font-black">{c.name}</h1>
            {c.description && <p className="mt-2 text-neutral-500">{c.description}</p>}
          </div>
        )}
      </section>
      <div className="container mt-8">
        <nav className="mb-6 text-sm text-neutral-500" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link> / <span>{c.name}</span></nav>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">{total} منتج</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SORTS).map(([k, v]) => (
              <Link key={k} href={`${base}?sort=${k}`} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${k === sort ? "border-ink bg-ink text-white" : "hover:border-ink"}`}>{v.label}</Link>
            ))}
          </div>
        </div>
        {products.length ? <ProductGrid products={products} /> : <p className="py-20 text-center text-neutral-500">لا توجد منتجات في هذا التصنيف حالياً</p>}
        {pages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`${base}?sort=${sort}&page=${n}`} className={`grid h-10 w-10 place-items-center rounded-xl border font-bold ${n === page ? "bg-ink text-white" : ""}`}>{n}</Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
