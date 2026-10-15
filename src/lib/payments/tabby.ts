// تابي: قسّمها على 4 دفعات بدون فوائد
// https://docs.tabby.ai/api-reference/checkout/create-a-session
const base = () => (process.env.TABBY_API_URL || "https://api.tabby.ai").replace(/\/$/, "");
export const tabbyConfigured = () => Boolean(process.env.TABBY_SECRET_KEY);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Tabby ${path}: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

type TabbySession = {
  id: string;
  status: "created" | "rejected" | "expired" | "approved";
  payment: { id: string };
  configuration?: { available_products?: { installments?: { web_url: string }[] } };
};

export async function createTabbySession(o: {
  orderId: string;
  orderNumber: number;
  total: number;
  shipping: number;
  discount: number;
  vat: number;
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  postalCode: string;
  items: { productId: string; name: string; quantity: number; price: number; image: string; category: string }[];
  urls: { success: string; cancel: string; failure: string };
}) {
  const session = await call<TabbySession>("/api/v2/checkout", {
    method: "POST",
    body: JSON.stringify({
      payment: {
        amount: o.total.toFixed(2),
        currency: "SAR",
        description: `طلب رقم ${o.orderNumber}`,
        buyer: { phone: o.phone, email: o.email || `${o.phone}@noemail.sa`, name: o.name },
        shipping_address: { city: o.city, address: o.address, zip: o.postalCode || "00000" },
        order: {
          reference_id: o.orderId,
          tax_amount: o.vat.toFixed(2),
          shipping_amount: o.shipping.toFixed(2),
          discount_amount: o.discount.toFixed(2),
          items: o.items.map((i) => ({
            reference_id: i.productId,
            title: i.name,
            quantity: i.quantity,
            unit_price: i.price.toFixed(2),
            category: i.category || "General",
            image_url: i.image,
          })),
        },
        buyer_history: { registered_since: new Date().toISOString(), loyalty_level: 0 },
      },
      lang: "ar",
      merchant_code: process.env.TABBY_MERCHANT_CODE || "SA",
      merchant_urls: o.urls,
    }),
  });
  const webUrl = session.configuration?.available_products?.installments?.[0]?.web_url;
  return { session, webUrl };
}

export async function getTabbyPayment(paymentId: string) {
  return call<{ id: string; status: string; amount: string; order: { reference_id: string } }>(
    `/api/v2/payments/${encodeURIComponent(paymentId)}`,
  );
}

export async function captureTabbyPayment(paymentId: string, amount: number) {
  return call(`/api/v2/payments/${encodeURIComponent(paymentId)}/captures`, {
    method: "POST",
    body: JSON.stringify({ amount: amount.toFixed(2) }),
  });
}
