import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice, parseJson } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/orders";
import { PAYMENT_LABELS, SHIPPING_LABELS, type PaymentMethod, type ShippingCompany } from "@/lib/pricing";
import { trackingUrl } from "@/lib/shipping";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "تفاصيل الطلب", robots: { index: false } };

const STEPS = ["confirmed", "processing", "shipped", "delivered"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string }> }) {
  const [{ id }, sp, s] = await Promise.all([params, searchParams, getSettings()]);
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const failed = order.paymentStatus === "failed" || sp.payment === "failed";
  const stepIdx = STEPS.indexOf(order.status);
  const track = trackingUrl(order.shippingCompany, order.trackingNumber);
  const history = parseJson<{ at: string; note: string }[]>(order.history, []);

  return (
    <div className="container max-w-3xl py-10">
      {failed ? (
        <div className="mb-8 rounded-3xl bg-red-50 p-8 text-center">
          <p className="mb-2 text-4xl">⚠️</p>
          <h1 className="mb-2 text-2xl font-black text-red-700">لم تكتمل عملية الدفع</h1>
          <p className="mb-5 text-red-700/80">لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى بطريقة دفع مختلفة.</p>
          <Link href="/" className="btn-primary">العودة للمتجر</Link>
        </div>
      ) : (
        <div className="mb-8 rounded-3xl bg-brand-50 p-8 text-center">
          <p className="mb-2 text-5xl">🎉</p>
          <h1 className="mb-2 text-2xl font-black text-brand-800">{order.status === "pending" ? "طلبك قيد المعالجة" : "شكراً لك! تم استلام طلبك"}</h1>
          <p className="text-brand-800/80">رقم الطلب <b>#{order.number}</b> — سنرسل لك رقم التتبع فور الشحن</p>
          {order.deliveryFrom && order.deliveryTo && (
            <p className="mt-3 font-bold">موعد التوصيل المتوقع: بين {formatDate(order.deliveryFrom)} و {formatDate(order.deliveryTo)}</p>
          )}
        </div>
      )}

      {!failed && stepIdx >= 0 && (
        <ol className="mb-8 grid grid-cols-4 gap-2 text-center text-xs font-bold">
          {STEPS.map((st, i) => (
            <li key={st} className={`rounded-xl p-3 ${i <= stepIdx ? "bg-ink text-white" : "bg-neutral-100 text-neutral-500"}`}>{ORDER_STATUSES[st]}</li>
          ))}
        </ol>
      )}

      <div className="card divide-y">
        <div className="grid gap-4 p-6 text-sm sm:grid-cols-2">
          <div><p className="text-neutral-500">الحالة</p><p className="font-bold">{ORDER_STATUSES[order.status]}</p></div>
          <div><p className="text-neutral-500">طريقة الدفع</p><p className="font-bold">{PAYMENT_LABELS[order.paymentMethod as PaymentMethod]}</p></div>
          <div><p className="text-neutral-500">شركة الشحن</p><p className="font-bold">{SHIPPING_LABELS[order.shippingCompany as ShippingCompany]}</p></div>
          <div>
            <p className="text-neutral-500">رقم التتبع</p>
            <p className="font-bold" dir="ltr">{order.trackingNumber ? (track ? <a href={track} target="_blank" rel="noopener" className="text-brand-700 underline">{order.trackingNumber}</a> : order.trackingNumber) : "—"}</p>
          </div>
          <div className="sm:col-span-2"><p className="text-neutral-500">عنوان التوصيل</p><p className="font-bold">{order.name} — {order.city}، {order.district}، {order.address}</p></div>
        </div>
        <ul className="space-y-3 p-6">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              {i.image && <img src={i.image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
              <span className="flex-1 text-sm"><b>{i.name}</b>{i.variant && <span className="text-neutral-500"> — {i.variant}</span>} × {i.quantity}</span>
              <span className="font-bold">{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 p-6 text-sm">
          <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-brand-700"><dt>الخصم {order.couponCode && `(${order.couponCode})`}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt>الشحن</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : "مجاني"}</dd></div>
          {order.codFee > 0 && <div className="flex justify-between"><dt>رسوم الدفع عند الاستلام</dt><dd>{formatPrice(order.codFee)}</dd></div>}
          <div className="flex justify-between border-t pt-3 text-lg font-black"><dt>الإجمالي</dt><dd>{formatPrice(order.total)}</dd></div>
          <p className="text-xs text-neutral-500">شامل ضريبة القيمة المضافة {formatPrice(order.vat)}</p>
        </dl>
        {history.length > 0 && (
          <ol className="space-y-2 p-6 text-sm">
            {history.slice().reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-4"><span>{h.note}</span><span className="shrink-0 text-neutral-400">{new Date(h.at).toLocaleString("ar-SA-u-ca-gregory-nu-latn")}</span></li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">متابعة التسوق</Link>
        <a href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`استفسار عن الطلب رقم ${order.number}`)}`} target="_blank" rel="noopener" className="btn-outline">تواصل معنا عبر واتساب</a>
      </div>
    </div>
  );
}
