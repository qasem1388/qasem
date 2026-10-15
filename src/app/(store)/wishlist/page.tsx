import type { Metadata } from "next";
import { WishlistGrid } from "@/components/store/WishlistGrid";

export const metadata: Metadata = { title: "المفضلة", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-2 text-3xl font-black">المفضلة ❤️</h1>
      <WishlistGrid />
    </div>
  );
}
