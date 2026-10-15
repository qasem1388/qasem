import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/format";
import { siteUrl } from "@/lib/settings";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const [p, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: (await params).id }, include: { variants: { orderBy: { sortOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">تعديل: {p.name}</h1>
      <ProductEditor
        categories={categories}
        siteUrl={siteUrl()}
        initial={{
          id: p.id, name: p.name, slug: p.slug, titles: parseJson(p.titlesJson, {}), shortDescription: p.shortDescription, description: p.description,
          images: parseJson(p.imagesJson, []), price: p.price, compareAtPrice: p.compareAtPrice, cost: p.cost, sku: p.sku, stock: p.stock, brand: p.brand,
          weightKg: p.weightKg, tags: p.tags, featured: p.featured, isNew: p.isNew, bestSeller: p.bestSeller, active: p.active, seoTitle: p.seoTitle,
          seoDescription: p.seoDescription, keywords: p.keywords, categoryId: p.categoryId,
          variants: p.variants.map((v) => ({ id: v.id, colorName: v.colorName, colorHex: v.colorHex, size: v.size, sku: v.sku, price: v.price, stock: v.stock, images: parseJson(v.imagesJson, []) })),
        }}
      />
    </div>
  );
}
