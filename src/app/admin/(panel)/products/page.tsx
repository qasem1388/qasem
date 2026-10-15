import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { formatPrice, parseJson } from "@/lib/format";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const products = await prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } }, _count: { select: { variants: true } } },
    take: 300,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">المنتجات ({products.length})</h1>
        <Link href="/admin/products/new" className="btn-primary">+ منتج جديد</Link>
      </div>
      <form className="flex max-w-md gap-2"><input name="q" defaultValue={q} className="input" placeholder="بحث بالاسم أو SKU" /><button className="btn-primary">بحث</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>{["", "المنتج", "التصنيف", "السعر", "المخزون", "الألوان", "المبيعات", "الحالة", ""].map((h, i) => <th key={i} className="p-3 text-start">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const img = parseJson<string[]>(p.imagesJson, [])[0];
              return (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="p-3">{img ? <img src={img} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-neutral-100" />}</td>
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="font-bold hover:underline">{p.name}</Link>{p.featured && <span className="badge ms-2 bg-gold-400 text-white">مميز</span>}</td>
                  <td className="p-3">{p.category?.name ?? "—"}</td>
                  <td className="p-3">{formatPrice(p.price)}{p.compareAtPrice && <s className="ms-1 text-xs text-neutral-400">{p.compareAtPrice}</s>}</td>
                  <td className={`p-3 font-bold ${p.stock <= 5 ? "text-red-600" : ""}`}>{p.stock}</td>
                  <td className="p-3">{p._count.variants}</td>
                  <td className="p-3">{p.salesCount}</td>
                  <td className="p-3">{p.active ? <span className="badge bg-brand-50 text-brand-700">منشور</span> : <span className="badge bg-neutral-100 text-neutral-500">مخفي</span>}</td>
                  <td className="whitespace-nowrap p-3">
                    <Link href={`/admin/products/${p.id}`} className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-neutral-100">✏️ تعديل</Link>
                    <DeleteProductButton id={p.id} name={p.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
