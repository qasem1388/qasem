import { prisma } from "./db";
import { deliveryWindow } from "./delivery";
import { parseJson } from "./format";
import { createShipment } from "./shipping";
import { captureTamaraOrder } from "./payments/tamara";
import { captureTabbyPayment } from "./payments/tabby";
import type { PaymentMethod, Quote, ShippingCompany } from "./pricing";

export const ORDER_STATUSES: Record<string, string> = {
  pending: "بانتظار الدفع/التأكيد",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترجع",
};

export const PAYMENT_STATUSES: Record<string, string> = {
  unpaid: "غير مدفوع",
  authorized: "مصرّح",
  paid: "مدفوع",
  failed: "فشل الدفع",
  refunded: "مسترجع",
};

type HistoryEntry = { at: string; status: string; note: string };

function pushHistory(json: string, status: string, note: string): string {
  const h = parseJson<HistoryEntry[]>(json, []);
  h.push({ at: new Date().toISOString(), status, note });
  return JSON.stringify(h);
}

export async function createOrder(input: {
  quote: Quote;
  paymentMethod: PaymentMethod;
  shippingCompany: ShippingCompany;
  customer: { name: string; phone: string; email: string; city: string; district: string; address: string; postalCode: string; notes: string };
}) {
  const { quote, customer } = input;
  const window = deliveryWindow();

  return prisma.$transaction(async (tx) => {
    const c = await tx.customer.upsert({
      where: { phone: customer.phone },
      create: { name: customer.name, phone: customer.phone, email: customer.email, city: customer.city },
      update: { name: customer.name, email: customer.email || undefined, city: customer.city },
    });

    // حجز المخزون فوراً (يُعاد عند الإلغاء أو فشل الدفع)
    for (const line of quote.lines) {
      if (line.variantId) {
        const r = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (r.count === 0) throw new Error(`نفدت الكمية من ${line.name}`);
      }
      const r = await tx.product.updateMany({
        where: { id: line.productId, ...(line.variantId ? {} : { stock: { gte: line.quantity } }) },
        data: { stock: { decrement: line.quantity } },
      });
      if (r.count === 0) throw new Error(`نفدت الكمية من ${line.name}`);
    }

    const number = await (async () => {
      const last = await tx.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
      return (last?.number ?? 10000) + 1;
    })();

    return tx.order.create({
      data: {
        number,
        customerId: c.id,
        status: "pending",
        paymentMethod: input.paymentMethod,
        shippingCompany: input.shippingCompany,
        subtotal: quote.subtotal,
        discount: quote.discount,
        shippingCost: quote.shippingCost,
        codFee: quote.codFee,
        vat: quote.vat,
        total: quote.total,
        couponCode: quote.couponCode,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        district: customer.district,
        address: customer.address,
        postalCode: customer.postalCode,
        notes: customer.notes,
        deliveryFrom: window.from,
        deliveryTo: window.to,
        history: pushHistory("[]", "pending", "تم إنشاء الطلب"),
        items: {
          create: quote.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            variant: l.variant,
            image: l.image,
            price: l.price,
            quantity: l.quantity,
          })),
        },
      },
      include: { items: true },
    });
  });
}

/** يؤكد الطلب بعد نجاح الدفع أو اختيار الدفع عند الاستلام */
export async function confirmOrder(orderId: string, opts: { paymentStatus: "paid" | "authorized" | "unpaid"; paymentRef?: string; note: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== "pending") return order;
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "confirmed",
        paymentStatus: opts.paymentStatus,
        paymentRef: opts.paymentRef || order.paymentRef,
        history: pushHistory(order.history, "confirmed", opts.note),
      },
    });
    for (const item of order.items) {
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } }).catch(() => null);
    }
    if (order.couponCode) {
      await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => null);
    }
  });
  return prisma.order.findUnique({ where: { id: orderId } });
}

async function restock(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } }).catch(() => null);
    if (item.variantId) {
      await prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } }).catch(() => null);
    }
  }
}

export async function failOrderPayment(orderId: string, note: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "pending") return;
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "cancelled", paymentStatus: "failed", history: pushHistory(order.history, "cancelled", note) },
  });
  await restock(orderId);
}

export async function setOrderStatus(orderId: string, status: string, note = "") {
  if (!(status in ORDER_STATUSES)) throw new Error("حالة غير صحيحة");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("الطلب غير موجود");
  const wasActive = !["cancelled", "refunded"].includes(order.status);
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      paymentStatus: status === "delivered" && order.paymentMethod === "cod" ? "paid" : undefined,
      history: pushHistory(order.history, status, note || ORDER_STATUSES[status]),
    },
  });
  if (wasActive && ["cancelled", "refunded"].includes(status)) await restock(orderId);
  return updated;
}

/** إنشاء بوليصة شحن مع سمسا أو أرامكس + تحصيل مبلغ التقسيط عند الشحن */
export async function shipOrder(orderId: string, company?: "smsa" | "aramex") {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("الطلب غير موجود");
  if (order.trackingNumber) return order;
  if (["cancelled", "refunded"].includes(order.status)) throw new Error("لا يمكن شحن طلب ملغي");
  if (order.paymentMethod !== "cod" && order.paymentStatus === "unpaid") throw new Error("الطلب غير مدفوع بعد");

  const carrier = company || (order.shippingCompany as "smsa" | "aramex");
  const products = await prisma.product.findMany({ where: { id: { in: order.items.map((i) => i.productId) } }, select: { id: true, weightKg: true } });
  const weight = order.items.reduce((s, i) => s + (products.find((p) => p.id === i.productId)?.weightKg ?? 0.5) * i.quantity, 0);

  const shipment = await createShipment(carrier, {
    orderNumber: order.number,
    name: order.name,
    phone: order.phone,
    city: order.city,
    district: order.district,
    address: order.address,
    postalCode: order.postalCode,
    weightKg: Math.max(0.5, Math.round(weight * 100) / 100),
    pieces: 1,
    declaredValue: order.total,
    codAmount: order.paymentMethod === "cod" ? order.total : 0,
    description: order.items.map((i) => `${i.name} x${i.quantity}`).join("، "),
  });

  if (order.paymentRef && order.paymentStatus === "authorized") {
    if (order.paymentMethod === "tamara") await captureTamaraOrder(order.paymentRef, order.total, carrier, shipment.trackingNumber).catch(() => null);
    if (order.paymentMethod === "tabby") await captureTabbyPayment(order.paymentRef, order.total).catch(() => null);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "shipped",
      shippingCompany: carrier,
      trackingNumber: shipment.trackingNumber,
      labelUrl: shipment.labelUrl,
      paymentStatus: order.paymentStatus === "authorized" ? "paid" : undefined,
      history: pushHistory(order.history, "shipped", `تم الشحن عبر ${carrier === "smsa" ? "سمسا" : "أرامكس"} - رقم التتبع ${shipment.trackingNumber}${shipment.test ? " (وضع تجريبي)" : ""}`),
    },
  });
}
