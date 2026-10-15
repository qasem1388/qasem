import { NextResponse } from "next/server";
import { setOrderStatus } from "@/lib/orders";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status, note } = (await req.json().catch(() => ({}))) as { status?: string; note?: string };
  try {
    await setOrderStatus(id, String(status), note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 400 });
  }
}
