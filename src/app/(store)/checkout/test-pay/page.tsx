import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { testModeFor } from "@/lib/payments";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/pricing";
import { TestPay } from "@/components/checkout/TestPay";

export const metadata = { robots: { index: false } };

export default async function TestPayPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const id = (await searchParams).order;
  const order = id ? await prisma.order.findUnique({ where: { id } }) : null;
  if (!order || !testModeFor(order.paymentMethod)) notFound();
  return (
    <div className="container max-w-lg py-16">
      <div className="card space-y-5 p-8 text-center">
        <span className="badge bg-amber-100 text-amber-800">وضع تجريبي — لم تُضبط مفاتيح البوابة</span>
        <h1 className="text-2xl font-black">{PAYMENT_LABELS[order.paymentMethod as PaymentMethod]}</h1>
        <p>طلب رقم <b>#{order.number}</b> — المبلغ <b>{formatPrice(order.total)}</b></p>
        <p className="text-sm text-neutral-500">أضف مفاتيح البوابة في ملف .env لتفعيل الدفع الحقيقي.</p>
        <TestPay orderId={order.id} />
      </div>
    </div>
  );
}
