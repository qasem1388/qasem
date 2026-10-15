import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayment } from "@/lib/payments";
import { verifyTamaraNotification } from "@/lib/payments/tamara";

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("tamaraToken") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!(await verifyTamaraNotification(token))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { order_id?: string; order_reference_id?: string };
  const order = body.order_reference_id
    ? await prisma.order.findUnique({ where: { id: body.order_reference_id } })
    : body.order_id
      ? await prisma.order.findFirst({ where: { paymentRef: body.order_id } })
      : null;
  if (order) await verifyPayment(order.id).catch((e) => console.error("tamara webhook", e));
  return NextResponse.json({ ok: true });
}
