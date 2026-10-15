import { NextResponse } from "next/server";
import { CheckoutError, quoteCart } from "@/lib/pricing";
import { quoteSchema } from "../schema";

export async function POST(req: Request) {
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  try {
    return NextResponse.json(await quoteCart(parsed.data));
  } catch (e) {
    const msg = e instanceof CheckoutError ? e.message : "تعذّر حساب الطلب";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
