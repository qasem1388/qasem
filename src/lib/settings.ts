import { prisma } from "./db";

export const DEFAULT_SETTINGS = {
  storeName: "متجر قاسم",
  tagline: "تسوّق بثقة… جودة أصلية وتوصيل سريع لكل مدن المملكة",
  logoText: "قاسم",
  whatsapp: "966500000000",
  phone: "920000000",
  email: "support@store.sa",
  instagram: "",
  snapchat: "",
  tiktok: "",
  x: "",
  announcement: "🚚 شحن مجاني للطلبات فوق 299 ر.س | التوصيل خلال 2-5 أيام عمل لجميع مدن المملكة",
  freeShippingThreshold: "299",
  smsaPrice: "25",
  aramexPrice: "29",
  codFee: "15",
  codEnabled: "true",
  tamaraEnabled: "true",
  tabbyEnabled: "true",
  moyasarEnabled: "true",
  vatNumber: "300000000000003",
  crNumber: "1010000000",
  flashSaleEndsAt: "",
  socialProofEnabled: "true",
  metaPixelId: "",
  snapPixelId: "",
  tiktokPixelId: "",
  googleAnalyticsId: "",
  googleVerification: "",
  bingVerification: "",
};

export type StoreSettings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof StoreSettings;

export async function getSettings(): Promise<StoreSettings> {
  const rows = await prisma.setting.findMany();
  const merged: StoreSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in merged) merged[row.key as SettingKey] = row.value;
  }
  return merged;
}

export async function updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const entries = Object.entries(patch).filter(([k, v]) => k in DEFAULT_SETTINGS && typeof v === "string");
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: value as string }, update: { value: value as string } }),
    ),
  );
  return getSettings();
}

// يُقرأ وقت التشغيل (وليس وقت البناء) ليعمل نفس البناء على أي نطاق
export const siteUrl = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// نطاق تجريبي: منع محركات البحث من الأرشفة
export const noIndex = () => process.env.SITE_NOINDEX === "true";

/** يقبل رمز التحقق وحده أو وسم meta كاملاً منسوخاً من Google/Bing */
export function verificationCode(value: string) {
  const v = value.trim();
  return (v.match(/content\s*=\s*["']([^"']+)["']/i)?.[1] ?? v).trim();
}
