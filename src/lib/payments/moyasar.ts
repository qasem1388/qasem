// بوابة ميسر: إنشاء فاتورة دفع مستضافة (مدى، فيزا، ماستركارد، Apple Pay، STC Pay)
// https://docs.moyasar.com/api/invoices/01-create-invoice
const API = "https://api.moyasar.com/v1";

function authHeader() {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY غير مضبوط");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export const moyasarConfigured = () => Boolean(process.env.MOYASAR_SECRET_KEY);

export type MoyasarInvoice = { id: string; status: string; amount: number; currency: string; url: string; metadata?: Record<string, string> };

export async function createMoyasarInvoice(params: {
  amount: number;
  description: string;
  orderId: string;
  orderNumber: number;
  successUrl: string;
  backUrl: string;
  callbackUrl: string;
}): Promise<MoyasarInvoice> {
  const res = await fetch(`${API}/invoices`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(params.amount * 100), // بالهللة
      currency: "SAR",
      description: params.description,
      success_url: params.successUrl,
      back_url: params.backUrl,
      callback_url: params.callbackUrl,
      metadata: { order_id: params.orderId, order_number: String(params.orderNumber) },
    }),
  });
  if (!res.ok) throw new Error(`Moyasar: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchMoyasarInvoice(id: string): Promise<MoyasarInvoice> {
  const res = await fetch(`${API}/invoices/${encodeURIComponent(id)}`, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Moyasar: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refundMoyasarPayment(paymentId: string, amount?: number) {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(amount ? { amount: Math.round(amount * 100) } : {}),
  });
  if (!res.ok) throw new Error(`Moyasar refund: ${res.status} ${await res.text()}`);
  return res.json();
}
