import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { confirmOrder, failOrderPayment } from "@/lib/orders";
import { testModeFor } from "@/lib/payments";

// متاح فقط في وضع الدفع التجريبي (بيئة التطوير بدون مفاتيح البوابة)
export async function POST(req: Request) {
  const { orderId, approve } = (await req.json().catch(() => ({}))) as { orderId?: string; approve?: boolean };
  const order = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
  if (!order || !testModeFor(order.paymentMethod)) return NextResponse.json({ error: "غير متاح" }, { status: 403 });
  if (approve) await confirmOrder(order.id, { paymentStatus: order.paymentMethod === "moyasar" ? "paid" : "authorized", paymentRef: `TEST-${Date.now()}`, note: "دفع تجريبي" });
  else await failOrderPayment(order.id, "فشل دفع تجريبي");
  return NextResponse.json({ redirect: `/order/${order.id}?payment=${approve ? "paid" : "failed"}` });
}
