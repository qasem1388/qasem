import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().optional().default(""),
  titles: z.record(z.string(), z.string()).default({}),
  shortDescription: z.string().default(""),
  description: z.string().default(""),
  images: z.array(z.string()).max(20).default([]),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  sku: z.string().default(""),
  stock: z.number().int().min(0).default(0),
  brand: z.string().default(""),
  weightKg: z.number().min(0.01).default(0.5),
  tags: z.string().default(""),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(true),
  bestSeller: z.boolean().default(false),
  active: z.boolean().default(true),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  keywords: z.string().default(""),
  categoryId: z.string().nullable().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        colorName: z.string().trim().min(1),
        colorHex: z.string().default("#000000"),
        size: z.string().default(""),
        sku: z.string().default(""),
        price: z.number().positive().nullable().optional(),
        stock: z.number().int().min(0).default(0),
        images: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
