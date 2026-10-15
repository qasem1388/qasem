import { z } from "zod";
import { prisma } from "@/lib/db";
import { round2, slugify } from "@/lib/format";

/** موارد لوحة التحكم البسيطة (تصنيفات، بنرات، كوبونات، تقييمات) بواجهة CRUD موحّدة */
type Resource = {
  schema: z.ZodObject;
  list: () => Promise<unknown[]>;
  create: (data: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

async function refreshRating(productId: string) {
  const agg = await prisma.review.aggregate({ where: { productId, approved: true }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: productId }, data: { ratingAvg: round2(agg._avg.rating ?? 0), ratingCount: agg._count } });
}

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().default(""),
  description: z.string().default(""),
  image: z.string().default(""),
  bannerImage: z.string().default(""),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
});

const bannerSchema = z.object({
  position: z.enum(["hero", "category", "promo"]),
  title: z.string().min(1),
  subtitle: z.string().default(""),
  image: z.string().min(1),
  link: z.string().default("/"),
  buttonText: z.string().default("تسوق الآن"),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
});

const couponSchema = z.object({
  code: z.string().min(3).transform((s) => s.trim().toUpperCase()),
  type: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0).default(0),
  minOrder: z.coerce.number().min(0).default(0),
  maxUses: z.coerce.number().int().min(0).default(0),
  expiresAt: z.string().optional().transform((s) => (s ? new Date(s) : null)),
  active: z.boolean().default(true),
});

const reviewSchema = z.object({ approved: z.boolean() });

export const RESOURCES: Record<string, Resource> = {
  categories: {
    schema: categorySchema,
    list: () => prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    create: (d) => prisma.category.create({ data: { ...(d as z.infer<typeof categorySchema>), slug: slugify(String(d.slug || d.name)) } }),
    update: (id, d) => prisma.category.update({ where: { id }, data: { ...(d as z.infer<typeof categorySchema>), slug: slugify(String(d.slug || d.name)) } }),
    remove: (id) => prisma.category.delete({ where: { id } }),
  },
  banners: {
    schema: bannerSchema,
    list: () => prisma.banner.findMany({ orderBy: [{ position: "asc" }, { sortOrder: "asc" }] }),
    create: (d) => prisma.banner.create({ data: d as z.infer<typeof bannerSchema> }),
    update: (id, d) => prisma.banner.update({ where: { id }, data: d as z.infer<typeof bannerSchema> }),
    remove: (id) => prisma.banner.delete({ where: { id } }),
  },
  coupons: {
    schema: couponSchema,
    list: () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    create: (d) => prisma.coupon.create({ data: d as z.infer<typeof couponSchema> }),
    update: (id, d) => prisma.coupon.update({ where: { id }, data: d as z.infer<typeof couponSchema> }),
    remove: (id) => prisma.coupon.delete({ where: { id } }),
  },
  reviews: {
    schema: reviewSchema,
    list: () => prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { product: { select: { name: true } } } }),
    create: async () => {
      throw new Error("غير مدعوم");
    },
    update: async (id, d) => {
      const r = await prisma.review.update({ where: { id }, data: d as z.infer<typeof reviewSchema> });
      await refreshRating(r.productId);
      return r;
    },
    remove: async (id) => {
      const r = await prisma.review.delete({ where: { id } });
      await refreshRating(r.productId);
      return r;
    },
  },
};
