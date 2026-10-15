import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "../db";
import { confirmOrder, failOrderPayment } from "../orders";
import { siteUrl } from "../settings";
import { createMoyasarInvoice, fetchMoyasarInvoice, moyasarConfigured } from "./moyasar";
import { authoriseTamaraOrder, createTamaraCheckout, getTamaraOrder, tamaraConfigured } from "./tamara";
import { createTabbySession, getTabbyPayment, tabbyConfigured } from "./tabby";

/** وضع الدفع التجريبي: يُفعّل تلقائياً في بيئة التطوير إذا لم تُضبط مفاتيح البوابة */
export function testModeFor(method: string): boolean {
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_TEST_MODE !== "true") return false;
  if (method === "moyasar") return !moyasarConfigured();
  if (method === "tamara") return !tamaraConfigured();
  if (method === "tabby") return !tabbyConfigured();
  return false;
}

export function gatewayAvailable(method: string): boolean {
  if (method === "cod") return true;
  if (testModeFor(method)) return true;
  if (method === "moyasar") return moyasarConfigured();
  if (method === "tamara") return tamaraConfigured();
  if (method === "tabby") return tabbyConfigured();
  return false;
}

export const orderPageUrl = (order: Pick<Order, "id">) => `${siteUrl()}/order/${order.id}`;

/** يبدأ عملية الدفع ويعيد الرابط الذي يُوجَّه إليه العميل */
export async function startPayment(order: Order & { items: OrderItem[] }): Promise<string> {
  const site = siteUrl();

  if (order.paymentMethod === "cod") {
    await confirmOrder(order.id, { paymentStatus: "unpaid", note: "طلب دفع عند الاستلام" });
    return orderPageUrl(order);
  }

  if (testModeFor(order.paymentMethod)) return `${site}/checkout/test-pay?order=${order.id}`;

  if (order.paymentMethod === "moyasar") {
    const inv = await createMoyasarInvoice({
      amount: order.total,
      description: `طلب رقم ${order.number}`,
      orderId: order.id,
      orderNumber: order.number,
      successUrl: `${site}/api/payments/moyasar/return?order=${order.id}`,
      backUrl: `${site}/api/payments/moyasar/return?order=${order.id}`,
      callbackUrl: `${site}/api/payments/moyasar/webhook`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: inv.id, paymentUrl: inv.url } });
    return inv.url;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: order.items.map((i) => i.productId) } },
    select: { id: true, sku: true, category: { select: { name: true } } },
  });
  const abs = (src: string) => (src.startsWith("http") ? src : `${site}${src}`);
  const items = order.items.map((i) => {
    const prod = products.find((p) => p.id === i.productId);
    return { productId: i.productId, name: i.variant ? `${i.name} - ${i.variant}` : i.name, sku: prod?.sku ?? "", quantity: i.quantity, price: i.price, image: abs(i.image), category: prod?.category?.name ?? "" };
  });
  const common = {
    orderId: order.id,
    orderNumber: order.number,
    total: order.total,
    vat: order.vat,
    shipping: order.shippingCost + order.codFee,
    discount: order.discount,
    name: order.name,
    phone: `+${order.phone}`,
    email: order.email,
    city: order.city,
    address: `${order.district} ${order.address}`.trim(),
    items,
  };

  if (order.paymentMethod === "tamara") {
    const ret = (r: string) => `${site}/api/payments/tamara/return?order=${order.id}&result=${r}`;
    const res = await createTamaraCheckout({
      ...common,
      urls: { success: ret("success"), failure: ret("failure"), cancel: ret("cancel"), notification: `${site}/api/payments/tamara/webhook` },
    });
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: res.order_id, paymentUrl: res.checkout_url } });
    return res.checkout_url;
  }

  if (order.paymentMethod === "tabby") {
    const ret = (r: string) => `${site}/api/payments/tabby/return?order=${order.id}&result=${r}`;
    const { session, webUrl } = await createTabbySession({
      ...common,
      postalCode: order.postalCode,
      urls: { success: ret("success"), cancel: ret("cancel"), failure: ret("failure") },
    });
    if (session.status === "rejected" || !webUrl) {
      await failOrderPayment(order.id, "رفضت تابي الطلب");
      throw new Error("عذراً، تابي غير متاح لهذا الطلب. جرّب طريقة دفع أخرى.");
    }
    await prisma.order.update({ where: { id: order.id }, data: { paymentRef: session.payment.id, paymentUrl: webUrl } });
    return webUrl;
  }

  throw new Error("طريقة دفع غير مدعومة");
}

/** التحقق من حالة الدفع من البوابة نفسها (لا نثق بمعاملات الرابط) */
export async function verifyPayment(orderId: string): Promise<"paid" | "authorized" | "failed" | "pending"> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return "failed";
  if (order.status !== "pending") return order.paymentStatus === "failed" ? "failed" : order.paymentStatus === "authorized" ? "authorized" : "paid";
  if (!order.paymentRef) return "pending";

  if (order.paymentMethod === "moyasar") {
    const inv = await fetchMoyasarInvoice(order.paymentRef);
    if (inv.status === "paid" && inv.amount === Math.round(order.total * 100)) {
      await confirmOrder(order.id, { paymentStatus: "paid", note: "تم الدفع عبر ميسر" });
      return "paid";
    }
    if (["failed", "canceled", "expired"].includes(inv.status)) {
      await failOrderPayment(order.id, `فشل الدفع عبر ميسر (${inv.status})`);
      return "failed";
    }
    return "pending";
  }

  if (order.paymentMethod === "tamara") {
    const t = await getTamaraOrder(order.paymentRef);
    if (t.order_reference_id !== order.id) return "failed";
    if (t.status === "approved") {
      await authoriseTamaraOrder(order.paymentRef);
      await confirmOrder(order.id, { paymentStatus: "authorized", note: "تمت الموافقة على التقسيط عبر تمارا" });
      return "authorized";
    }
    if (["authorised", "partially_captured", "fully_captured"].includes(t.status)) {
      await confirmOrder(order.id, { paymentStatus: "authorized", note: "تمت الموافقة على التقسيط عبر تمارا" });
      return "authorized";
    }
    if (["declined", "expired", "canceled"].includes(t.status)) {
      await failOrderPayment(order.id, `تمارا: ${t.status}`);
      return "failed";
    }
    return "pending";
  }

  if (order.paymentMethod === "tabby") {
    const p = await getTabbyPayment(order.paymentRef);
    if (p.order?.reference_id && p.order.reference_id !== order.id) return "failed";
    if (["AUTHORIZED", "CLOSED"].includes(p.status) && Math.abs(Number(p.amount) - order.total) < 0.01) {
      await confirmOrder(order.id, { paymentStatus: "authorized", note: "تمت الموافقة على التقسيط عبر تابي" });
      return "authorized";
    }
    if (["REJECTED", "EXPIRED"].includes(p.status)) {
      await failOrderPayment(order.id, `تابي: ${p.status}`);
      return "failed";
    }
    return "pending";
  }
  return "pending";
}
