"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  key: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variant: string;
  image: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  wishlist: string[];
  recentlyViewed: string[];
  add: (item: Omit<CartItem, "key" | "quantity">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  toggleWishlist: (productId: string) => void;
  viewed: (productId: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      wishlist: [],
      recentlyViewed: [],
      add: (item, qty = 1) =>
        set((s) => {
          const key = `${item.productId}:${item.variantId ?? ""}`;
          const existing = s.items.find((i) => i.key === key);
          const items = existing
            ? s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.quantity + qty, item.maxStock) } : i))
            : [...s.items, { ...item, key, quantity: Math.min(qty, item.maxStock) }];
          return { items, open: true };
        }),
      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
      toggleWishlist: (id) =>
        set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] })),
      viewed: (id) => set((s) => ({ recentlyViewed: [id, ...s.recentlyViewed.filter((r) => r !== id)].slice(0, 12) })),
    }),
    { name: "store-cart", partialize: (s) => ({ items: s.items, wishlist: s.wishlist, recentlyViewed: s.recentlyViewed }) },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((s, i) => s + i.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.quantity, 0);
