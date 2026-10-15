import { NextResponse } from "next/server";
import { failOrderPayment } from "@/lib/orders";
import { verifyPayment } from "@/lib/payments";
import { siteUrl } from "@/lib/settings";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const result = url.searchParams.get("result");
  let status: string = "pending";
  if (result === "success") status = await verifyPayment(orderId).catch(() => "pending");
  else {
    await failOrderPayment(orderId, result === "cancel" ? "ألغى العميل التقسيط عبر تابي" : "فشل التقسيط عبر تابي");
    status = "failed";
  }
  return NextResponse.redirect(`${siteUrl()}/order/${encodeURIComponent(orderId)}?payment=${status}`);
}
