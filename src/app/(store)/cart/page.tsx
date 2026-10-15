import type { Metadata } from "next";
import { CartPageClient } from "@/components/store/CartPageClient";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "سلة التسوق", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="container py-8">
      <h1 className="mb-6 text-3xl font-black">سلة التسوق</h1>
      <CartPageClient threshold={Number(s.freeShippingThreshold) || 0} />
    </div>
  );
}
