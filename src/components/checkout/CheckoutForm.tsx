"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cartTotal, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { FreeShippingBar } from "../store/CartDrawer";
import { ShieldIcon } from "../icons";

type Quote = { subtotal: number; discount: number; shippingCost: number; codFee: number; total: number; vat: number; couponCode: string; couponError?: string };
type Method = { id: "moyasar" | "tamara" | "tabby" | "cod"; label: string; note: string; badge: string; badgeCls: string };

type Props = {
  cities: readonly string[];
  methods: Method[];
  shipping: { id: "smsa" | "aramex"; label: string; price: number }[];
  freeShippingThreshold: number;
  delivery: string;
  codFee: number;
};

export function CheckoutForm({ cities, methods, shipping, freeShippingThreshold, delivery, codFee }: Props) {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [mounted, setMounted] = useState(false);
  const [payment, setPayment] = useState<Method["id"]>(methods[0]?.id ?? "cod");
  const [carrier, setCarrier] = useState<"smsa" | "aramex">(shipping[0]?.id ?? "smsa");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));
  const linesKey = JSON.stringify(lines);

  const refresh = useCallback(async () => {
    if (!lines.length) return;
    const res = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, couponCode: appliedCoupon || undefined, shippingCompany: carrier, paymentMethod: payment }),
    });
    const data = await res.json();
    if (res.ok) {
      setQuote(data);
      setError(data.couponError ?? "");
    } else setError(data.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, appliedCoupon, carrier, payment]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const customer = Object.fromEntries(["name", "phone", "email", "city", "district", "address", "postalCode", "notes"].map((k) => [k, String(fd.get(k) ?? "")]));
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, couponCode: appliedCoupon || undefined, shippingCompany: carrier, paymentMethod: payment, customer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      clear();
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      setLoading(false);
    }
  };

  if (!mounted) return null;
  if (!items.length)
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-neutral-500">سلتك فارغة</p>
        <Link href="/" className="btn-primary">تابع التسوق</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <section className="card p-5 md:p-6">
          <h2 className="mb-4 text-lg font-extrabold">1. بيانات التوصيل</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="name">الاسم الكامل *</label><input id="name" name="name" required minLength={3} className="input" autoComplete="name" /></div>
            <div><label className="label" htmlFor="phone">رقم الجوال *</label><input id="phone" name="phone" required inputMode="tel" placeholder="05xxxxxxxx" className="input" dir="ltr" autoComplete="tel" /></div>
            <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" className="input" dir="ltr" autoComplete="email" /></div>
            <div>
              <label className="label" htmlFor="city">المدينة *</label>
              <select id="city" name="city" required className="input" defaultValue="">
                <option value="" disabled>اختر المدينة</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="district">الحي *</label><input id="district" name="district" required className="input" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="address">العنوان (الشارع، رقم المبنى) *</label><input id="address" name="address" required minLength={5} className="input" autoComplete="street-address" /></div>
            <div><label className="label" htmlFor="postalCode">الرمز البريدي / العنوان الوطني</label><input id="postalCode" name="postalCode" className="input" dir="ltr" /></div>
            <div><label className="label" htmlFor="notes">ملاحظات</label><input id="notes" name="notes" className="input" /></div>
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="mb-1 text-lg font-extrabold">2. شركة الشحن</h2>
          <p className="mb-4 text-sm text-neutral-500">{delivery}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {shipping.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 ${carrier === s.id ? "border-ink bg-neutral-50" : "border-neutral-200"}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="carrier" checked={carrier === s.id} onChange={() => setCarrier(s.id)} className="accent-ink" />
                  <span className="font-bold">{s.label}</span>
                </span>
                <span className="text-sm font-bold">{quote && quote.shippingCost === 0 ? <span className="text-brand-700">مجاني</span> : formatPrice(s.price)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="mb-4 text-lg font-extrabold">3. طريقة الدفع</h2>
          <div className="space-y-3">
            {methods.map((m) => (
              <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${payment === m.id ? "border-ink bg-neutral-50" : "border-neutral-200"}`}>
                <input type="radio" name="payment" checked={payment === m.id} onChange={() => setPayment(m.id)} className="accent-ink" />
                <span className="flex-1">
                  <span className="block font-bold">{m.label}</span>
                  <span className="text-xs text-neutral-500">{m.id === "cod" && codFee > 0 ? `${m.note} (رسوم ${formatPrice(codFee)})` : m.note}</span>
                  {(m.id === "tamara" || m.id === "tabby") && quote && <span className="block text-xs font-bold text-brand-700">{formatPrice(quote.total / 4)} × 4 دفعات</span>}
                </span>
                <span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${m.badgeCls}`} dir="ltr">{m.badge}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="lg:col-span-2">
        <div className="card sticky top-24 space-y-4 p-5 md:p-6">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>
          <FreeShippingBar total={quote ? quote.subtotal - quote.discount : cartTotal(items)} threshold={freeShippingThreshold} />
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {items.map((i) => (
              <li key={i.key} className="flex gap-3">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute -end-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] text-white">{i.quantity}</span>
                </span>
                <span className="flex-1 text-sm">
                  <span className="line-clamp-1 font-bold">{i.name}</span>
                  {i.variant && <span className="text-xs text-neutral-500">{i.variant}</span>}
                </span>
                <span className="text-sm font-bold">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} className="input py-2.5" placeholder="كود الخصم" dir="ltr" />
            <button type="button" onClick={() => setAppliedCoupon(coupon.trim())} className="btn-outline shrink-0">تطبيق</button>
          </div>
          {quote?.couponCode && <p className="text-sm font-bold text-brand-700">✓ تم تطبيق الكود {quote.couponCode}</p>}
          {quote && (
            <dl className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatPrice(quote.subtotal)}</dd></div>
              {quote.discount > 0 && <div className="flex justify-between text-brand-700"><dt>الخصم</dt><dd>-{formatPrice(quote.discount)}</dd></div>}
              <div className="flex justify-between"><dt>الشحن</dt><dd>{quote.shippingCost ? formatPrice(quote.shippingCost) : "مجاني"}</dd></div>
              {quote.codFee > 0 && <div className="flex justify-between"><dt>رسوم الدفع عند الاستلام</dt><dd>{formatPrice(quote.codFee)}</dd></div>}
              <div className="flex justify-between border-t pt-3 text-lg font-black"><dt>الإجمالي</dt><dd>{formatPrice(quote.total)}</dd></div>
              <p className="text-xs text-neutral-500">يشمل ضريبة القيمة المضافة {formatPrice(quote.vat)}</p>
            </dl>
          )}
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={loading || !quote} className="btn-primary w-full py-4 text-base">
            {loading ? "جاري المعالجة…" : payment === "cod" ? "تأكيد الطلب" : "المتابعة للدفع"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500"><ShieldIcon className="h-4 w-4" /> بياناتك محمية ومشفرة بالكامل</p>
        </div>
      </aside>
    </form>
  );
}
