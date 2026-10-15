import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayment } from "@/lib/payments";

// إشعار تابي: لا نثق بمحتوى الإشعار، نتحقق من حالة الدفعة عبر API تابي
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (body.id) {
    const order = await prisma.order.findFirst({ where: { paymentRef: body.id } });
    if (order) await verifyPayment(order.id).catch((e) => console.error("tabby webhook", e));
  }
  return NextResponse.json({ ok: true });
}
