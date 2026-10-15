"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { ProductsByIds } from "../product/RecentlyViewed";

export function WishlistGrid() {
  const wishlist = useCart((s) => s.wishlist);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  const empty = (
    <div className="py-20 text-center text-neutral-500">
      <p className="mb-4">لم تضف أي منتج للمفضلة بعد</p>
      <Link href="/" className="btn-primary">تصفح المنتجات</Link>
    </div>
  );
  if (!wishlist.length) return empty;
  return <ProductsByIds ids={wishlist} empty={empty} />;
}
