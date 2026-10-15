import { prisma } from "./db";
import { parseJson, round2 } from "./format";
import { getSettings, type StoreSettings } from "./settings";

export type CartLine = { productId: string; variantId?: string | null; quantity: number };
export type ShippingCompany = "smsa" | "aramex";
export type PaymentMethod = "moyasar" | "tamara" | "tabby" | "cod";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  moyasar: "بطاقة مدى / فيزا / Apple Pay",
  tamara: "تمارا - قسّمها على 4 دفعات",
  tabby: "تابي - 4 دفعات بدون فوائد",
  cod: "الدفع عند الاستلام",
};

export const SHIPPING_LABELS: Record<ShippingCompany, string> = {
  smsa: "سمسا إكسبرس SMSA",
  aramex: "أرامكس Aramex",
};

export type PricedLine = {
  productId: string;
  variantId: string | null;
  name: string;
  variant: string;
  image: string;
  price: number;
  quantity: number;
  lineTotal: number;
  weightKg: number;
};

export type Quote = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  codFee: number;
  total: number;
  vat: number;
  couponCode: string;
  couponError?: string;
  freeShippingRemaining: number;
  weightKg: number;
};

export class CheckoutError extends Error {}

export function shippingPrice(settings: StoreSettings, company: ShippingCompany) {
  return Number(company === "smsa" ? settings.smsaPrice : settings.aramexPrice) || 0;
}

export async function validateCoupon(code: string, subtotal: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) return { error: "كود الخصم غير صالح" } as const;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: "انتهت صلاحية كود الخصم" } as const;
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { error: "تم استنفاد كود الخصم" } as const;
  if (subtotal < coupon.minOrder) return { error: `الحد الأدنى للطلب ${coupon.minOrder} ر.س` } as const;
  return { coupon } as const;
}

/** يحسب الطلب من أسعار قاعدة البيانات (لا يثق بأسعار المتصفح) */
export async function quoteCart(input: {
  lines: CartLine[];
  couponCode?: string;
  shippingCompany: ShippingCompany;
  paymentMethod: PaymentMethod;
}): Promise<Quote> {
  const settings = await getSettings();
  if (!input.lines.length) throw new CheckoutError("السلة فارغة");

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { variants: true },
  });

  const lines: PricedLine[] = [];
  for (const line of input.lines) {
    const qty = Math.max(1, Math.min(20, Math.floor(line.quantity)));
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new CheckoutError("أحد المنتجات لم يعد متوفراً");
    const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : undefined;
    if (line.variantId && !variant) throw new CheckoutError(`اللون المختار لـ ${product.name} غير متوفر`);
    const available = variant ? variant.stock : product.stock;
    if (available < qty) throw new CheckoutError(`الكمية المتوفرة من ${product.name} هي ${available} فقط`);
    const price = variant?.price ?? product.price;
    const images = parseJson<string[]>(variant?.imagesJson, []);
    const productImages = parseJson<string[]>(product.imagesJson, []);
    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      variant: variant ? [variant.colorName, variant.size].filter(Boolean).join(" / ") : "",
      image: images[0] ?? productImages[0] ?? "",
      price,
      quantity: qty,
      lineTotal: round2(price * qty),
      weightKg: product.weightKg * qty,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  let discount = 0;
  let freeShippingByCoupon = false;
  let couponCode = "";
  let couponError: string | undefined;

  if (input.couponCode?.trim()) {
    const res = await validateCoupon(input.couponCode, subtotal);
    if ("error" in res) couponError = res.error;
    else {
      couponCode = res.coupon.code;
      if (res.coupon.type === "percent") discount = round2((subtotal * Math.min(res.coupon.value, 100)) / 100);
      else if (res.coupon.type === "fixed") discount = Math.min(res.coupon.value, subtotal);
      else if (res.coupon.type === "free_shipping") freeShippingByCoupon = true;
    }
  }

  const threshold = Number(settings.freeShippingThreshold) || 0;
  const afterDiscount = subtotal - discount;
  const freeShipping = freeShippingByCoupon || (threshold > 0 && afterDiscount >= threshold);
  const shippingCost = freeShipping ? 0 : shippingPrice(settings, input.shippingCompany);
  const codFee = input.paymentMethod === "cod" ? Number(settings.codFee) || 0 : 0;
  const total = round2(afterDiscount + shippingCost + codFee);
  // الأسعار شاملة ضريبة القيمة المضافة 15%
  const vat = round2((total * 15) / 115);

  return {
    lines,
    subtotal,
    discount,
    shippingCost,
    codFee,
    total,
    vat,
    couponCode,
    couponError,
    freeShippingRemaining: threshold > 0 ? Math.max(0, round2(threshold - afterDiscount)) : 0,
    weightKg: Math.max(0.5, round2(lines.reduce((s, l) => s + l.weightKg, 0))),
  };
}
