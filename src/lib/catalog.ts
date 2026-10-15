import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { parseJson } from "./format";

export type ProductTitles = {
  seo?: string;
  marketing?: string;
  emotional?: string;
  short?: string;
  luxury?: string;
  ad?: string;
  social?: string;
  question?: string;
};

export type VariantView = {
  id: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: number | null;
  stock: number;
  images: string[];
};

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  titles: ProductTitles;
  shortDescription: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
  brand: string;
  sku: string;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  category: { slug: string; name: string } | null;
  variants: VariantView[];
};

const productInclude = {
  category: { select: { slug: true, name: true } },
  variants: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function toProductView(p: ProductRow): ProductView {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    titles: parseJson<ProductTitles>(p.titlesJson, {}),
    shortDescription: p.shortDescription,
    description: p.description,
    images: parseJson<string[]>(p.imagesJson, []),
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    brand: p.brand,
    sku: p.sku,
    featured: p.featured,
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    salesCount: p.salesCount,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    keywords: p.keywords,
    category: p.category,
    variants: p.variants.map((v) => ({
      id: v.id,
      colorName: v.colorName,
      colorHex: v.colorHex,
      size: v.size,
      price: v.price,
      stock: v.stock,
      images: parseJson<string[]>(v.imagesJson, []),
    })),
  };
}

export async function listProducts(opts: {
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
  take?: number;
  skip?: number;
} = {}): Promise<ProductView[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, ...opts.where },
    orderBy: opts.orderBy ?? { createdAt: "desc" },
    take: opts.take,
    skip: opts.skip,
    include: productInclude,
  });
  return rows.map(toProductView);
}

export async function getProductBySlug(slug: string): Promise<ProductView | null> {
  const row = await prisma.product.findFirst({ where: { slug, active: true }, include: productInclude });
  return row ? toProductView(row) : null;
}

export async function getProductById(id: string): Promise<ProductView | null> {
  const row = await prisma.product.findUnique({ where: { id }, include: productInclude });
  return row ? toProductView(row) : null;
}

export const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }> = {
  newest: { label: "الأحدث", orderBy: { createdAt: "desc" } },
  bestselling: { label: "الأكثر مبيعاً", orderBy: { salesCount: "desc" } },
  "price-asc": { label: "السعر: من الأقل", orderBy: { price: "asc" } },
  "price-desc": { label: "السعر: من الأعلى", orderBy: { price: "desc" } },
  rating: { label: "الأعلى تقييماً", orderBy: { ratingAvg: "desc" } },
};
