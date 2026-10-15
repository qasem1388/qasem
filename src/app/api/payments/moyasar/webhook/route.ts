import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayment } from "@/lib/payments";

// إشعار ميسر: نحدد الطلب ثم نتحقق من حالة الفاتورة مباشرة من ميسر
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; invoice_id?: string; data?: { id?: string; invoice_id?: string }; metadata?: { order_id?: string } };
  const ref = body.invoice_id || body.data?.invoice_id || body.id || body.data?.id;
  const order = body.metadata?.order_id
    ? await prisma.order.findUnique({ where: { id: body.metadata.order_id } })
    : ref
      ? await prisma.order.findFirst({ where: { paymentRef: ref } })
      : null;
  if (order) await verifyPayment(order.id).catch((e) => console.error("moyasar webhook", e));
  return NextResponse.json({ ok: true });
}
