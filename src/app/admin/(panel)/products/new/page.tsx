import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/settings";
import { ProductEditor, type ProductForm } from "@/components/admin/ProductEditor";

const EMPTY: ProductForm = {
  name: "", slug: "", titles: {}, shortDescription: "", description: "", images: [], price: 0, compareAtPrice: null, cost: null,
  sku: "", stock: 0, brand: "", weightKg: 0.5, tags: "", featured: false, isNew: true, bestSeller: false, active: true,
  seoTitle: "", seoDescription: "", keywords: "", categoryId: null, variants: [],
};

export default async function NewProduct() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">منتج جديد</h1>
      <ProductEditor initial={EMPTY} categories={categories} siteUrl={siteUrl()} />
    </div>
  );
}
