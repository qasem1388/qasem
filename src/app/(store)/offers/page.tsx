import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/ProductRail";

export const metadata: Metadata = { title: "العروض والتخفيضات", description: "أقوى العروض والتخفيضات على منتجاتنا لفترة محدودة", alternates: { canonical: "/offers" } };

export default async function OffersPage() {
  const products = await listProducts({ where: { compareAtPrice: { not: null } }, orderBy: { salesCount: "desc" }, take: 80 });
  const deals = products.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
  return (
    <div className="container py-10">
      <div className="mb-8 rounded-3xl bg-gradient-to-l from-red-600 to-rose-500 p-8 text-white">
        <h1 className="text-3xl font-black">العروض والتخفيضات 🔥</h1>
        <p className="mt-2 opacity-90">خصومات حقيقية على منتجات مختارة — الكمية محدودة</p>
      </div>
      {deals.length ? <ProductGrid products={deals} /> : <p className="py-20 text-center text-neutral-500">لا توجد عروض حالياً، تابعنا قريباً!</p>}
    </div>
  );
}
