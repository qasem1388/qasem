"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartTotal, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "../icons";

export function FreeShippingBar({ total, threshold }: { total: number; threshold: number }) {
  if (!threshold) return null;
  const remaining = Math.max(0, threshold - total);
  const pct = Math.min(100, (total / threshold) * 100);
  return (
    <div className="rounded-xl bg-brand-50 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-bold text-brand-800">
        <TruckIcon className="h-5 w-5" />
        {remaining > 0 ? <span>أضف {formatPrice(remaining)} واحصل على شحن مجاني!</span> : <span>مبروك! طلبك مؤهل للشحن المجاني 🎉</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartDrawer({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const { items, open, setOpen, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  if (!mounted || !open) return null;
  const total = cartTotal(items);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="سلة التسوق">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-extrabold">سلة التسوق ({items.length})</h2>
          <button onClick={() => setOpen(false)} aria-label="إغلاق"><CloseIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-5 pb-0"><FreeShippingBar total={total} threshold={freeShippingThreshold} /></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {items.length === 0 && (
            <div className="py-16 text-center text-neutral-500">
              <p className="mb-4">سلتك فارغة</p>
              <button onClick={() => setOpen(false)} className="btn-primary">تابع التسوق</button>
            </div>
          )}
          {items.map((i) => (
            <div key={i.key} className="flex gap-3">
              <Link href={`/product/${encodeURIComponent(i.slug)}`} onClick={() => setOpen(false)} className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-bold">{i.name}</p>
                  <button onClick={() => remove(i.key)} className="text-neutral-400 hover:text-red-500" aria-label="حذف"><TrashIcon className="h-4 w-4" /></button>
                </div>
                {i.variant && <p className="text-xs text-neutral-500">{i.variant}</p>}
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border">
                    <button className="p-1.5" onClick={() => setQty(i.key, i.quantity + 1)} aria-label="زيادة"><PlusIcon className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-bold">{i.quantity}</span>
                    <button className="p-1.5" onClick={() => setQty(i.key, i.quantity - 1)} aria-label="إنقاص"><MinusIcon className="h-4 w-4" /></button>
                  </div>
                  <span className="font-extrabold">{formatPrice(i.price * i.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="space-y-3 border-t p-5">
            <div className="flex justify-between text-lg font-extrabold">
              <span>المجموع</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-neutral-500">شامل ضريبة القيمة المضافة • قسّمها على 4 دفعات مع تمارا وتابي ({formatPrice(total / 4)} شهرياً)</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary w-full py-4 text-base">إتمام الطلب</Link>
            <Link href="/cart" onClick={() => setOpen(false)} className="btn-outline w-full">عرض السلة</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
