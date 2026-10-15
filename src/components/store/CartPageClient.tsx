"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartTotal, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { MinusIcon, PlusIcon, TrashIcon } from "../icons";
import { FreeShippingBar } from "./CartDrawer";
import { PaymentBadges } from "./PaymentBadges";

export function CartPageClient({ threshold }: { threshold: number }) {
  const { items, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  if (!items.length)
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-neutral-500">سلتك فارغة</p>
        <Link href="/" className="btn-primary">تابع التسوق</Link>
      </div>
    );
  const total = cartTotal(items);
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {items.map((i) => (
          <div key={i.key} className="card flex gap-4 p-4">
            <Link href={`/product/${encodeURIComponent(i.slug)}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-bold">{i.name}</p>
                  {i.variant && <p className="text-sm text-neutral-500">{i.variant}</p>}
                </div>
                <button onClick={() => remove(i.key)} className="text-neutral-400 hover:text-red-500" aria-label="حذف"><TrashIcon /></button>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-lg border">
                  <button className="p-2" onClick={() => setQty(i.key, i.quantity + 1)} aria-label="زيادة"><PlusIcon className="h-4 w-4" /></button>
                  <span className="w-8 text-center font-bold">{i.quantity}</span>
                  <button className="p-2" onClick={() => setQty(i.key, i.quantity - 1)} aria-label="إنقاص"><MinusIcon className="h-4 w-4" /></button>
                </div>
                <span className="text-lg font-extrabold">{formatPrice(i.price * i.quantity)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="card h-fit space-y-4 p-6">
        <FreeShippingBar total={total} threshold={threshold} />
        <div className="flex justify-between text-xl font-black"><span>المجموع</span><span>{formatPrice(total)}</span></div>
        <p className="text-xs text-neutral-500">شامل الضريبة • تُحسب رسوم الشحن والخصومات في الخطوة التالية</p>
        <Link href="/checkout" className="btn-primary w-full py-4 text-base">إتمام الطلب</Link>
        <PaymentBadges compact />
      </aside>
    </div>
  );
}
