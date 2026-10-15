import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import type { ProductInput } from "./schema";

export async function saveProduct(input: ProductInput, id?: string) {
  let slug = slugify(input.slug || input.name) || `p-${Date.now().toString(36)}`;
  const clash = await prisma.product.findUnique({ where: { slug } });
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36)}`;

  const stock = input.variants.length ? input.variants.reduce((s, v) => s + v.stock, 0) : input.stock;
  const data = {
    name: input.name,
    slug,
    titlesJson: JSON.stringify(input.titles),
    shortDescription: input.shortDescription,
    description: input.description,
    imagesJson: JSON.stringify(input.images),
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    cost: input.cost ?? null,
    sku: input.sku,
    stock,
    brand: input.brand,
    weightKg: input.weightKg,
    tags: input.tags,
    featured: input.featured,
    isNew: input.isNew,
    bestSeller: input.bestSeller,
    active: input.active,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    keywords: input.keywords,
    categoryId: input.categoryId || null,
  };

  return prisma.$transaction(async (tx) => {
    const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    const keep = input.variants.map((v) => v.id).filter(Boolean) as string[];
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
    for (const [i, v] of input.variants.entries()) {
      const vData = { colorName: v.colorName, colorHex: v.colorHex, size: v.size, sku: v.sku, price: v.price ?? null, stock: v.stock, imagesJson: JSON.stringify(v.images), sortOrder: i };
      if (v.id) await tx.productVariant.update({ where: { id: v.id }, data: vData });
      else await tx.productVariant.create({ data: { ...vData, productId: product.id } });
    }
    return product;
  });
}
