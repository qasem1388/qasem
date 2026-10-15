import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments";
import { siteUrl } from "@/lib/settings";

export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("order") ?? "";
  const result = await verifyPayment(orderId).catch(() => "pending" as const);
  return NextResponse.redirect(`${siteUrl()}/order/${encodeURIComponent(orderId)}?payment=${result}`);
}
