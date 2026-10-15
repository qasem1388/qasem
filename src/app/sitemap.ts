import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/format";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, imagesJson: true } }),
    prisma.category.findMany({ where: { active: true }, select: { slug: true, createdAt: true } }),
  ]);
  const abs = (src: string) => (src.startsWith("http") ? src : `${url}${src}`);
  return [
    { url, changeFrequency: "daily", priority: 1 },
    { url: `${url}/offers`, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: `${url}/category/${encodeURIComponent(c.slug)}`, lastModified: c.createdAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${url}/product/${encodeURIComponent(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      images: parseJson<string[]>(p.imagesJson, []).slice(0, 6).map(abs),
    })),
    ...["about", "shipping", "returns", "privacy", "terms", "contact"].map((s) => ({ url: `${url}/pages/${s}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
