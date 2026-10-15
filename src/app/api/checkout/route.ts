import { NextResponse } from "next/server";
import { isValidSaudiPhone, normalizeSaudiPhone } from "@/lib/format";
import { createOrder } from "@/lib/orders";
import { gatewayAvailable, startPayment } from "@/lib/payments";
import { CheckoutError, quoteCart } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { checkoutSchema } from "./schema";

export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" }, { status: 400 });
  const data = parsed.data;

  if (!isValidSaudiPhone(data.customer.phone)) return NextResponse.json({ error: "رقم الجوال غير صحيح (مثال: 05xxxxxxxx)" }, { status: 400 });

  const s = await getSettings();
  const enabled = { moyasar: s.moyasarEnabled, tamara: s.tamaraEnabled, tabby: s.tabbyEnabled, cod: s.codEnabled }[data.paymentMethod];
  if (enabled !== "true" || !gatewayAvailable(data.paymentMethod)) {
    return NextResponse.json({ error: "طريقة الدفع غير متاحة حالياً" }, { status: 400 });
  }

  try {
    const quote = await quoteCart(data);
    if (quote.couponError) return NextResponse.json({ error: quote.couponError }, { status: 400 });
    const order = await createOrder({
      quote,
      paymentMethod: data.paymentMethod,
      shippingCompany: data.shippingCompany,
      customer: { ...data.customer, phone: normalizeSaudiPhone(data.customer.phone) },
    });
    const redirect = await startPayment(order);
    return NextResponse.json({ orderId: order.id, number: order.number, redirect });
  } catch (e) {
    console.error("checkout failed", e);
    const msg = e instanceof CheckoutError || (e instanceof Error && /[؀-ۿ]/.test(e.message)) ? e.message : "تعذّر إتمام الطلب، حاول مرة أخرى";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
