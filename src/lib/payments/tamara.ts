// تمارا: تقسيط على 4 دفعات بدون فوائد
// https://docs.tamara.co/reference/createcheckoutsession
import { jwtVerify } from "jose";

const base = () => (process.env.TAMARA_API_URL || "https://api-sandbox.tamara.co").replace(/\/$/, "");
export const tamaraConfigured = () => Boolean(process.env.TAMARA_API_TOKEN);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Tamara ${path}: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const money = (amount: number) => ({ amount: Number(amount.toFixed(2)), currency: "SAR" });

export async function createTamaraCheckout(o: {
  orderId: string;
  orderNumber: number;
  total: number;
  vat: number;
  shipping: number;
  discount: number;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  items: { productId: string; name: string; sku: string; quantity: number; price: number; image: string }[];
  urls: { success: string; failure: string; cancel: string; notification: string };
}) {
  const [firstName, ...rest] = o.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const address = { first_name: firstName, last_name: lastName, line1: o.address, city: o.city, country_code: "SA", phone_number: o.phone };
  return call<{ order_id: string; checkout_id: string; checkout_url: string; status: string }>("/checkout", {
    method: "POST",
    body: JSON.stringify({
      order_reference_id: o.orderId,
      order_number: String(o.orderNumber),
      total_amount: money(o.total),
      description: `طلب رقم ${o.orderNumber}`,
      country_code: "SA",
      payment_type: "PAY_BY_INSTALMENTS",
      instalments: 4,
      locale: "ar_SA",
      items: o.items.map((i) => ({
        reference_id: i.productId,
        type: "Physical",
        name: i.name,
        sku: i.sku || i.productId,
        quantity: i.quantity,
        image_url: i.image,
        unit_price: money(i.price),
        total_amount: money(i.price * i.quantity),
      })),
      consumer: { first_name: firstName, last_name: lastName, phone_number: o.phone, email: o.email || `${o.phone}@noemail.sa` },
      shipping_address: address,
      billing_address: address,
      tax_amount: money(o.vat),
      shipping_amount: money(o.shipping),
      discount: { name: "خصم", amount: money(o.discount) },
      merchant_url: o.urls,
    }),
  });
}

export async function authoriseTamaraOrder(tamaraOrderId: string) {
  return call<{ order_id: string; status: string }>(`/orders/${encodeURIComponent(tamaraOrderId)}/authorise`, { method: "POST" });
}

export async function getTamaraOrder(tamaraOrderId: string) {
  return call<{ order_id: string; order_reference_id: string; status: string; total_amount: { amount: number } }>(
    `/merchants/orders/${encodeURIComponent(tamaraOrderId)}`,
  );
}

export async function captureTamaraOrder(tamaraOrderId: string, amount: number, shippingCompany: string, tracking: string) {
  return call("/payments/capture", {
    method: "POST",
    body: JSON.stringify({
      order_id: tamaraOrderId,
      total_amount: money(amount),
      shipping_info: { shipped_at: new Date().toISOString(), shipping_company: shippingCompany, tracking_number: tracking },
    }),
  });
}

/** التحقق من توقيع إشعار تمارا (tamaraToken) */
export async function verifyTamaraNotification(token: string | null): Promise<boolean> {
  const secret = process.env.TAMARA_NOTIFICATION_TOKEN;
  if (!secret || !token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}
