import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { claudeConfigured } from "@/lib/ai/claude";
import { moyasarConfigured } from "@/lib/payments/moyasar";
import { tamaraConfigured } from "@/lib/payments/tamara";
import { tabbyConfigured } from "@/lib/payments/tabby";
import { smsaConfigured } from "@/lib/shipping/smsa";
import { aramexConfigured } from "@/lib/shipping/aramex";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">الإعدادات</h1>
      <SettingsForm
        initial={s}
        status={[
          { label: "ميسر (مدى/فيزا/Apple Pay)", ok: moyasarConfigured(), hint: "MOYASAR_SECRET_KEY" },
          { label: "تمارا", ok: tamaraConfigured(), hint: "TAMARA_API_TOKEN" },
          { label: "تابي", ok: tabbyConfigured(), hint: "TABBY_SECRET_KEY" },
          { label: "سمسا", ok: smsaConfigured(), hint: "SMSA_API_KEY" },
          { label: "أرامكس", ok: aramexConfigured(), hint: "ARAMEX_USERNAME / ARAMEX_ACCOUNT_NUMBER" },
          { label: "الذكاء الاصطناعي (Claude)", ok: claudeConfigured(), hint: "ANTHROPIC_API_KEY" },
        ]}
        groups={[
          { title: "معلومات المتجر", fields: [
            { key: "storeName", label: "اسم المتجر" }, { key: "logoText", label: "نص الشعار" },
            { key: "tagline", label: "الشعار النصي / الوصف", type: "textarea" },
            { key: "announcement", label: "شريط الإعلان أعلى الموقع", type: "textarea" },
            { key: "vatNumber", label: "الرقم الضريبي", dir: "ltr" }, { key: "crNumber", label: "السجل التجاري", dir: "ltr" },
          ] },
          { title: "التواصل", fields: [
            { key: "whatsapp", label: "رقم الواتساب (9665xxxxxxxx)", dir: "ltr" }, { key: "phone", label: "الهاتف", dir: "ltr" },
            { key: "email", label: "البريد", dir: "ltr" }, { key: "instagram", label: "رابط إنستقرام", dir: "ltr" },
            { key: "snapchat", label: "رابط سناب شات", dir: "ltr" }, { key: "tiktok", label: "رابط تيك توك", dir: "ltr" }, { key: "x", label: "رابط X", dir: "ltr" },
          ] },
          { title: "الشحن والدفع", fields: [
            { key: "smsaPrice", label: "سعر شحن سمسا (ر.س)" }, { key: "aramexPrice", label: "سعر شحن أرامكس (ر.س)" },
            { key: "freeShippingThreshold", label: "الشحن المجاني للطلبات فوق (0 = معطّل)" }, { key: "codFee", label: "رسوم الدفع عند الاستلام" },
            { key: "moyasarEnabled", label: "تفعيل ميسر", type: "bool" }, { key: "tamaraEnabled", label: "تفعيل تمارا", type: "bool" },
            { key: "tabbyEnabled", label: "تفعيل تابي", type: "bool" }, { key: "codEnabled", label: "تفعيل الدفع عند الاستلام", type: "bool" },
          ] },
          { title: "التسويق", fields: [
            { key: "flashSaleEndsAt", label: "نهاية العرض المحدود (عداد تنازلي)", type: "datetime" },
            { key: "socialProofEnabled", label: "إشعارات (اشترى أحد العملاء مؤخراً)", type: "bool" },
            { key: "googleAnalyticsId", label: "Google Analytics (G-XXXX)", dir: "ltr" }, { key: "metaPixelId", label: "Meta Pixel ID", dir: "ltr" },
            { key: "snapPixelId", label: "Snap Pixel ID", dir: "ltr" }, { key: "tiktokPixelId", label: "TikTok Pixel ID", dir: "ltr" },
          ] },
        ]}
      />
    </div>
  );
}
