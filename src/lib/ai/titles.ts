import { claudeJson } from "./claude";
import type { ProductTitles } from "../catalog";

export type GeneratedCopy = {
  titles: Required<ProductTitles>;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  slug: string;
};

const str = { type: "string" } as const;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["titles", "shortDescription", "description", "seoTitle", "seoDescription", "keywords", "slug"],
  properties: {
    titles: {
      type: "object",
      additionalProperties: false,
      required: ["seo", "marketing", "emotional", "short", "luxury", "ad", "social", "question"],
      properties: { seo: str, marketing: str, emotional: str, short: str, luxury: str, ad: str, social: str, question: str },
    },
    shortDescription: str,
    description: str,
    seoTitle: str,
    seoDescription: str,
    keywords: { type: "array", items: str },
    slug: str,
  },
};

const SYSTEM = `أنت كاتب محتوى تسويقي وخبير SEO للتجارة الإلكترونية في السوق السعودي.
تكتب بالعربية الفصحى المبسطة القريبة من لهجة المتسوق السعودي، بدون مبالغات كاذبة أو ادعاءات طبية أو وعود غير قابلة للتحقق.

اكتب 8 عناوين للمنتج تختلف جذرياً عن بعضها في الزاوية والصياغة والطول والكلمات الافتتاحية — لا تكرر نفس البداية أو نفس التركيب في عنوانين:
- seo: عنوان بحثي يبدأ بالكلمة المفتاحية الرئيسية ويتضمن النوع والميزة الأبرز (50-65 حرفاً).
- marketing: عنوان بيعي يبرز الفائدة الأقوى للمشتري.
- emotional: عنوان يخاطب الشعور والتجربة ونمط الحياة.
- short: اسم مختصر جداً للبطاقات (2-4 كلمات).
- luxury: صياغة راقية بأسلوب العلامات الفاخرة.
- ad: عنوان إعلان Google/Snap لا يتجاوز 30 حرفاً.
- social: عنوان لمنشور إنستقرام/تيك توك مع إيموجي واحد مناسب.
- question: عنوان على شكل سؤال يثير الفضول.

ثم: shortDescription (جملتان)، description (وصف تفصيلي منظم بفقرات ونقاط مميزات باستخدام • وسطور جديدة، 120-220 كلمة، يتضمن المواصفات والاستخدام ومحتويات العبوة إن عُرفت)،
seoTitle (أقل من 60 حرفاً)، seoDescription (140-160 حرفاً تتضمن دعوة للشراء)، keywords (8-12 كلمة مفتاحية يبحث بها السعوديون فعلاً، عربية وإنجليزية)،
slug (رابط عربي قصير بكلمات مفصولة بشرطات بدون رموز).`;

export async function generateProductCopy(input: {
  name: string;
  category?: string;
  details?: string;
  price?: number;
  colors?: string[];
  imageBase64?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
}): Promise<GeneratedCopy> {
  const brief = [
    `اسم المنتج المبدئي: ${input.name}`,
    input.category && `التصنيف: ${input.category}`,
    input.price && `السعر: ${input.price} ر.س`,
    input.colors?.length && `الألوان المتوفرة: ${input.colors.join("، ")}`,
    input.details && `معلومات إضافية من التاجر: ${input.details}`,
  ]
    .filter(Boolean)
    .join("\n");

  const content = input.imageBase64
    ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: input.imageBase64.mediaType, data: input.imageBase64.data } },
        { type: "text" as const, text: `${brief}\n\nاستفد من صورة المنتج المرفقة لاستخراج الشكل والخامة واللون.` },
      ]
    : brief;

  return claudeJson<GeneratedCopy>({ system: SYSTEM, content, schema, effort: "medium" });
}
