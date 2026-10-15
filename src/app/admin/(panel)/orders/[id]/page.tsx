import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice, parseJson } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orders";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/pricing";
import { trackingUrl } from "@/lib/shipping";
import { OrderActions } from "@/components/admin/OrderActions";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const o = await prisma.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!o) notFound();
  const history = parseJson<{ at: string; note: string }[]>(o.history, []);
  const track = trackingUrl(o.shippingCompany, o.trackingNumber);
  const wa = `https://wa.me/${o.phone}?text=${encodeURIComponent(`مرحباً ${o.name}، بخصوص طلبك رقم ${o.number}${o.trackingNumber ? ` — رقم التتبع ${o.trackingNumber}` : ""}`)}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">طلب #{o.number} <span className="badge ms-2 bg-neutral-200 align-middle text-sm">{ORDER_STATUSES[o.status]}</span></h1>
        <div className="flex gap-2">
          <a href={wa} target="_blank" rel="noopener" className="btn bg-[#25d366] text-white">مراسلة العميل واتساب</a>
          <Link href="/admin/orders" className="btn-outline">رجوع</Link>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card divide-y">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 p-4">
                {i.image && <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div className="flex-1 text-sm"><b>{i.name}</b>{i.variant && <span className="text-neutral-500"> — {i.variant}</span>}<br />{formatPrice(i.price)} × {i.quantity}</div>
                <b>{formatPrice(i.price * i.quantity)}</b>
              </div>
            ))}
            <dl className="space-y-1.5 p-4 text-sm">
              <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatPrice(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt>الخصم ({o.couponCode})</dt><dd>-{formatPrice(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>الشحن</dt><dd>{formatPrice(o.shippingCost)}</dd></div>
              {o.codFee > 0 && <div className="flex justify-between"><dt>رسوم COD</dt><dd>{formatPrice(o.codFee)}</dd></div>}
              <div className="flex justify-between text-base font-black"><dt>الإجمالي</dt><dd>{formatPrice(o.total)}</dd></div>
              <div className="flex justify-between text-neutral-500"><dt>منها ضريبة القيمة المضافة</dt><dd>{formatPrice(o.vat)}</dd></div>
            </dl>
          </section>
          <section className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div><p className="text-neutral-500">العميل</p><p className="font-bold">{o.name}</p><p dir="ltr" className="text-end">{o.phone}</p><p>{o.email}</p></div>
            <div><p className="text-neutral-500">العنوان</p><p className="font-bold">{o.city} — {o.district}</p><p>{o.address}</p><p>{o.postalCode}</p></div>
            <div><p className="text-neutral-500">الدفع</p><p className="font-bold">{PAYMENT_LABELS[o.paymentMethod as PaymentMethod]}</p><p>{PAYMENT_STATUSES[o.paymentStatus]} {o.paymentRef && <span className="text-xs text-neutral-400" dir="ltr">({o.paymentRef})</span>}</p></div>
            <div><p className="text-neutral-500">الشحن</p><p className="font-bold">{o.shippingCompany === "smsa" ? "سمسا إكسبرس" : "أرامكس"}</p><p dir="ltr" className="text-end">{track ? <a href={track} target="_blank" rel="noopener" className="text-brand-700 underline">{o.trackingNumber}</a> : o.trackingNumber || "—"}</p></div>
            {o.notes && <div className="sm:col-span-2"><p className="text-neutral-500">ملاحظات العميل</p><p>{o.notes}</p></div>}
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-extrabold">سجل الطلب</h2>
            <ol className="space-y-2 text-sm">
              {history.slice().reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-4"><span>{h.note}</span><span className="shrink-0 text-xs text-neutral-400">{new Date(h.at).toLocaleString("ar-SA-u-ca-gregory-nu-latn")}</span></li>
              ))}
            </ol>
          </section>
        </div>
        <OrderActions id={o.id} status={o.status} statuses={ORDER_STATUSES} carrier={o.shippingCompany} hasTracking={Boolean(o.trackingNumber)} labelUrl={o.labelUrl} />
      </div>
    </div>
  );
}
