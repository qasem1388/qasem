import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice, round2 } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/orders";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/pricing";

const PAID = { status: { notIn: ["cancelled", "refunded", "pending"] } };

export default async function Dashboard() {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const since14 = new Date(Date.now() - 13 * 86400000);
  since14.setHours(0, 0, 0, 0);
  const [agg, prevAgg, toShip, lowStock, recent, daily, byMethod, pendingReviews, customers] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: since30 }, ...PAID }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { createdAt: { gte: new Date(Date.now() - 60 * 86400000), lt: since30 }, ...PAID }, _sum: { total: true } }),
    prisma.order.count({ where: { status: { in: ["confirmed", "processing"] } } }),
    prisma.product.findMany({ where: { active: true, stock: { lte: 5 } }, take: 8, orderBy: { stock: "asc" }, select: { id: true, name: true, stock: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.order.findMany({ where: { createdAt: { gte: since14 }, ...PAID }, select: { total: true, createdAt: true } }),
    prisma.order.groupBy({ by: ["paymentMethod"], where: { createdAt: { gte: since30 }, ...PAID }, _sum: { total: true }, _count: true }),
    prisma.review.count({ where: { approved: false } }),
    prisma.customer.count(),
  ]);
  const revenue = agg._sum.total ?? 0;
  const prev = prevAgg._sum.total ?? 0;
  const growth = prev ? Math.round(((revenue - prev) / prev) * 100) : null;
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short" }), total: round2(daily.filter((o) => o.createdAt.toISOString().slice(0, 10) === key).reduce((s, o) => s + o.total, 0)) };
  });
  const max = Math.max(1, ...days.map((d) => d.total));

  const kpis = [
    { label: "مبيعات آخر 30 يوم", value: formatPrice(revenue), sub: growth === null ? "" : `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}% عن الفترة السابقة` },
    { label: "الطلبات المكتملة", value: String(agg._count), sub: `متوسط السلة ${formatPrice(agg._count ? revenue / agg._count : 0)}` },
    { label: "بانتظار الشحن", value: String(toShip), sub: "طلبات مؤكدة", href: "/admin/orders?status=confirmed" },
    { label: "العملاء", value: String(customers), sub: `${pendingReviews} تقييم بانتظار المراجعة`, href: "/admin/reviews" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">نظرة عامة</h1>
        <div className="flex gap-2">
          <Link href="/admin/agent" className="btn-brand">🤖 اسأل الوكيل الذكي</Link>
          <Link href="/admin/products/new" className="btn-primary">+ منتج جديد</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <>
              <p className="text-sm text-neutral-500">{k.label}</p>
              <p className="my-1 text-2xl font-black">{k.value}</p>
              <p className="text-xs text-neutral-500">{k.sub}</p>
            </>
          );
          return k.href ? <Link key={k.label} href={k.href} className="card p-5 hover:border-ink">{body}</Link> : <div key={k.label} className="card p-5">{body}</div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-extrabold">المبيعات اليومية (14 يوم)</h2>
          <div className="flex h-56 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100">{d.total}</span>
                <div className="w-full rounded-t-md bg-brand-600 transition group-hover:bg-ink" style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }} title={`${d.label}: ${formatPrice(d.total)}`} />
                <span className="text-[9px] text-neutral-400">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">طرق الدفع (30 يوم)</h2>
          <ul className="space-y-3 text-sm">
            {byMethod.map((m) => (
              <li key={m.paymentMethod} className="flex justify-between"><span>{PAYMENT_LABELS[m.paymentMethod as PaymentMethod]}</span><b>{m._count} • {formatPrice(m._sum.total ?? 0)}</b></li>
            ))}
            {!byMethod.length && <li className="text-neutral-500">لا توجد بيانات بعد</li>}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-5"><h2 className="font-extrabold">أحدث الطلبات</h2><Link href="/admin/orders" className="text-sm font-bold text-brand-700">الكل ←</Link></div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-bold">#{o.number}</Link></td>
                  <td className="p-3">{o.name}</td>
                  <td className="p-3 text-neutral-500">{o.city}</td>
                  <td className="p-3"><span className="badge bg-neutral-100">{ORDER_STATUSES[o.status]}</span></td>
                  <td className="p-3 font-bold">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">⚠️ مخزون منخفض</h2>
          <ul className="space-y-2 text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex justify-between"><Link href={`/admin/products/${p.id}`} className="line-clamp-1 hover:underline">{p.name}</Link><b className={p.stock === 0 ? "text-red-600" : "text-amber-600"}>{p.stock}</b></li>
            ))}
            {!lowStock.length && <li className="text-neutral-500">كل المنتجات متوفرة ✓</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
