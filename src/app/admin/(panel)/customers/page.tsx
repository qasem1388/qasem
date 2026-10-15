import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const customers = await prisma.customer.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { city: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { orders: { select: { total: true, status: true, createdAt: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">العملاء ({customers.length})</h1>
      <form className="flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="الاسم أو الجوال أو المدينة" /><button className="btn-primary">بحث</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500"><tr>{["العميل", "الجوال", "المدينة", "الطلبات", "إجمالي المشتريات", "آخر طلب", ""].map((h, i) => <th key={i} className="p-3 text-start">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {customers.map((c) => {
              const valid = c.orders.filter((o) => !["cancelled", "refunded", "pending"].includes(o.status));
              const last = c.orders.map((o) => o.createdAt).sort((a, b) => b.getTime() - a.getTime())[0];
              return (
                <tr key={c.id}>
                  <td className="p-3 font-bold">{c.name}</td>
                  <td className="p-3" dir="ltr">{c.phone}</td>
                  <td className="p-3">{c.city}</td>
                  <td className="p-3">{c.orders.length}</td>
                  <td className="p-3 font-bold">{formatPrice(valid.reduce((s, o) => s + o.total, 0))}</td>
                  <td className="p-3 text-xs text-neutral-500">{last?.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") ?? "—"}</td>
                  <td className="p-3"><a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener" className="text-[#128c4a] hover:underline">واتساب</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
