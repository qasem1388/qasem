import type { Metadata } from "next";
import { SAUDI_CITIES } from "@/lib/cities";
import { deliveryWindow } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { gatewayAvailable } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  const all = [
    { id: "moyasar" as const, enabled: s.moyasarEnabled, label: "بطاقة مدى / فيزا / ماستركارد / Apple Pay", note: "دفع آمن عبر بوابة ميسر", badge: "mada • Pay", badgeCls: "bg-white border text-[#1f3f73]" },
    { id: "tamara" as const, enabled: s.tamaraEnabled, label: "تمارا — قسّمها على 4 دفعات", note: "بدون فوائد أو رسوم إضافية", badge: "tamara", badgeCls: "bg-[#ffd3c2]" },
    { id: "tabby" as const, enabled: s.tabbyEnabled, label: "تابي — 4 دفعات بدون فوائد", note: "ادفع ربع المبلغ الآن والباقي على 3 أشهر", badge: "tabby", badgeCls: "bg-[#3effc0]" },
    { id: "cod" as const, enabled: s.codEnabled, label: "الدفع عند الاستلام", note: "ادفع نقداً أو بالشبكة عند وصول الطلب", badge: "COD", badgeCls: "bg-neutral-800 text-white" },
  ];
  const methods = all.filter((m) => m.enabled === "true" && gatewayAvailable(m.id)).map(({ enabled: _e, ...m }) => m);
  const win = deliveryWindow();

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-3xl font-black">إتمام الطلب</h1>
      <CheckoutForm
        cities={SAUDI_CITIES}
        methods={methods}
        shipping={[
          { id: "smsa", label: "سمسا إكسبرس SMSA", price: Number(s.smsaPrice) || 0 },
          { id: "aramex", label: "أرامكس Aramex", price: Number(s.aramexPrice) || 0 },
        ]}
        freeShippingThreshold={Number(s.freeShippingThreshold) || 0}
        codFee={Number(s.codFee) || 0}
        delivery={`التوصيل خلال 2-5 أيام عمل: متوقع بين ${formatDate(win.from)} و ${formatDate(win.to)}`}
      />
    </div>
  );
}
