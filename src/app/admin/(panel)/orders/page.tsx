import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orders";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/pricing";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { city: { contains: q } }, ...(Number(q) ? [{ number: Number(q) }] : [])] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">الطلبات</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`rounded-full border px-4 py-1.5 text-sm font-bold ${!status ? "bg-ink text-white" : "bg-white"}`}>الكل</Link>
        {Object.entries(ORDER_STATUSES).map(([k, v]) => (
          <Link key={k} href={`/admin/orders?status=${k}`} className={`rounded-full border px-4 py-1.5 text-sm font-bold ${status === k ? "bg-ink text-white" : "bg-white"}`}>{v}</Link>
        ))}
      </div>
      <form className="flex max-w-md gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} className="input" placeholder="رقم الطلب، الاسم، الجوال، المدينة" />
        <button className="btn-primary">بحث</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>{["الطلب", "العميل", "المدينة", "الدفع", "الحالة", "الشحن", "الإجمالي", "التاريخ"].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-50">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-bold text-brand-700">#{o.number}</Link></td>
                <td className="p-3">{o.name}<br /><span className="text-xs text-neutral-500" dir="ltr">{o.phone}</span></td>
                <td className="p-3">{o.city}</td>
                <td className="p-3 text-xs">{PAYMENT_LABELS[o.paymentMethod as PaymentMethod]}<br /><span className="text-neutral-500">{PAYMENT_STATUSES[o.paymentStatus]}</span></td>
                <td className="p-3"><span className="badge bg-neutral-100">{ORDER_STATUSES[o.status]}</span></td>
                <td className="p-3 text-xs">{o.shippingCompany === "smsa" ? "سمسا" : "أرامكس"}<br /><span dir="ltr">{o.trackingNumber}</span></td>
                <td className="p-3 font-bold">{formatPrice(o.total)}</td>
                <td className="p-3 text-xs text-neutral-500">{o.createdAt.toLocaleString("ar-SA-u-ca-gregory-nu-latn")}</td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={8} className="p-8 text-center text-neutral-500">لا توجد طلبات</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
