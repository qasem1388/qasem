import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeSaudiPhone } from "@/lib/format";

export const metadata: Metadata = { title: "تتبع طلبك", alternates: { canonical: "/track" } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ number?: string; phone?: string }> }) {
  const sp = await searchParams;
  let error = "";
  if (sp.number && sp.phone) {
    const order = await prisma.order.findFirst({ where: { number: Number(sp.number) || 0, phone: normalizeSaudiPhone(sp.phone) } });
    if (order) redirect(`/order/${order.id}`);
    error = "لم نجد طلباً بهذه البيانات، تأكد من رقم الطلب والجوال";
  }
  return (
    <div className="container max-w-md py-16">
      <h1 className="mb-2 text-3xl font-black">تتبع طلبك</h1>
      <p className="mb-6 text-neutral-500">أدخل رقم الطلب ورقم الجوال المستخدم في الطلب</p>
      <form className="card space-y-4 p-6">
        <div><label className="label" htmlFor="number">رقم الطلب</label><input id="number" name="number" required inputMode="numeric" defaultValue={sp.number} className="input" dir="ltr" placeholder="10001" /></div>
        <div><label className="label" htmlFor="phone">رقم الجوال</label><input id="phone" name="phone" required inputMode="tel" defaultValue={sp.phone} className="input" dir="ltr" placeholder="05xxxxxxxx" /></div>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button className="btn-primary w-full">تتبع الطلب</button>
      </form>
    </div>
  );
}
