import { NextResponse } from "next/server";
import { shipOrder } from "@/lib/orders";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = (await req.json().catch(() => ({}))) as { company?: "smsa" | "aramex" };
  try {
    const o = await shipOrder(id, company === "aramex" || company === "smsa" ? company : undefined);
    return NextResponse.json({ trackingNumber: o.trackingNumber });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر إنشاء الشحنة" }, { status: 400 });
  }
}
