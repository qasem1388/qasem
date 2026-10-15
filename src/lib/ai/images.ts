import type SharpType from "sharp";
import { getSharp } from "../sharp-loader";
import { saveUpload } from "../storage";
import { claudeConfigured, claudeJson } from "./claude";

/**
 * توليد 6 صور احترافية للمنتج من صورة واحدة مرفوعة.
 * - local: تصاميم استوديو احترافية عبر sharp (خلفيات، ظلال، منصات عرض، لقطة تفاصيل) — مجاني ولا يحتاج مفاتيح.
 * - openai: يحلل Claude الصورة ويكتب 6 مشاهد تصوير مخصّصة للمنتج، ثم يولّد نموذج الصور مشاهد واقعية تحافظ على شكل المنتج.
 */

const SIZE = 1200;

/** يُرمى عندما لا يعمل sharp على الخادم، فيتولى المتصفح توليد الصور */
export class SharpUnavailableError extends Error {}

let sharp!: typeof SharpType;

export type GeneratedImage = { url: string; style: string };

const STYLES = [
  "استوديو أبيض نقي",
  "تدرّج ناعم مع إضاءة",
  "منصة عرض بلون العلامة",
  "خلفية دافئة عصرية",
  "فخامة داكنة",
  "لقطة مقرّبة للتفاصيل",
] as const;

function svg(body: string) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`);
}

const BACKGROUNDS: string[] = [
  `<rect width="100%" height="100%" fill="#ffffff"/>`,
  `<defs><radialGradient id="g" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e9ee"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfece6"/><stop offset="1" stop-color="#94beaf"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><ellipse cx="600" cy="1010" rx="430" ry="70" fill="#ffffff" opacity=".85"/><ellipse cx="600" cy="1000" rx="430" ry="70" fill="#f2f7f5"/>`,
  `<rect width="100%" height="100%" fill="#f6efe6"/><polygon points="0,820 1200,620 1200,1200 0,1200" fill="#ead9c4"/><circle cx="980" cy="230" r="170" fill="#f1e3d1"/>`,
  `<defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3a3f3d"/><stop offset="1" stop-color="#121413"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="600" cy="560" r="420" fill="none" stroke="#c99a45" stroke-width="3" opacity=".55"/>`,
  `<rect width="100%" height="100%" fill="#fafafa"/>`,
];

async function prepareProduct(input: Buffer) {
  // إزالة الحواف ذات اللون الموحّد (مثل الخلفية البيضاء) لإبراز المنتج
  const base = sharp(input).rotate();
  try {
    return await base.clone().trim({ threshold: 18 }).png().toBuffer();
  } catch {
    return base.png().toBuffer();
  }
}

async function roundedCard(img: Buffer, w: number, h: number, radius: number) {
  const mask = svg(`<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/>`);
  const resized = await sharp(img).resize(w, h, { fit: "cover" }).png().toBuffer();
  const maskBuf = await sharp(mask).resize(w, h).png().toBuffer();
  return sharp(resized).composite([{ input: maskBuf, blend: "dest-in" }]).png().toBuffer();
}

async function shadowFor(w: number, h: number, opacity: number, blur: number) {
  const pad = blur * 3;
  const shape = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w + pad * 2}" height="${h + pad * 2}"><rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="36" fill="rgba(0,0,0,${opacity})"/></svg>`,
  );
  return { buf: await sharp(shape).blur(blur).png().toBuffer(), pad };
}

async function composeLocal(product: Buffer, styleIndex: number): Promise<Buffer> {
  const background = sharp(svg(BACKGROUNDS[styleIndex])).png();
  const meta = await sharp(product).metadata();
  const hasAlpha = Boolean(meta.hasAlpha);
  const ratio = (meta.width || 1) / (meta.height || 1);

  if (styleIndex === 5) {
    // لقطة مقرّبة: تكبير منتصف المنتج مع زيادة الحدة
    const w = meta.width || SIZE;
    const h = meta.height || SIZE;
    const side = Math.floor(Math.min(w, h) * 0.62);
    const crop = await sharp(product)
      .extract({ left: Math.floor((w - side) / 2), top: Math.floor((h - side) / 2), width: side, height: side })
      .resize(1040, 1040)
      .sharpen({ sigma: 1.1 })
      .modulate({ saturation: 1.06 })
      .png()
      .toBuffer();
    const card = await roundedCard(crop, 1040, 1040, 40);
    const shadow = await shadowFor(1040, 1040, 0.18, 22);
    return background
      .composite([
        { input: shadow.buf, left: 80 - shadow.pad, top: 92 - shadow.pad },
        { input: card, left: 80, top: 80 },
      ])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  }

  const maxW = styleIndex === 0 ? 900 : 820;
  const maxH = styleIndex === 2 ? 760 : 860;
  let w = maxW;
  let h = Math.round(w / ratio);
  if (h > maxH) {
    h = maxH;
    w = Math.round(h * ratio);
  }
  const left = Math.round((SIZE - w) / 2);
  const top = styleIndex === 2 ? 990 - h : Math.round((SIZE - h) / 2) - 20;

  const subject = hasAlpha
    ? await sharp(product).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    : await roundedCard(product, w, h, 36);

  const tuned = await sharp(subject)
    .modulate({ brightness: styleIndex === 4 ? 1.04 : 1.02, saturation: 1.05 })
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer();

  const shadow = await shadowFor(w, Math.max(40, Math.round(h * (hasAlpha ? 0.08 : 1))), styleIndex === 4 ? 0.55 : 0.22, 26);
  const shadowTop = hasAlpha ? top + h - 30 - shadow.pad : top + 18 - shadow.pad;

  return background
    .composite([
      { input: shadow.buf, left: left - shadow.pad, top: shadowTop },
      { input: tuned, left, top },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

type ScenePlan = { productSummary: string; scenes: { style: string; prompt: string }[] };

async function planScenes(imageJpeg: Buffer, productName: string): Promise<ScenePlan> {
  return claudeJson<ScenePlan>({
    system:
      "You are an e-commerce art director. Look at the product photo and write exactly 6 distinct professional product-photography scene prompts in English for an image-editing model. Every prompt must keep the exact same product (shape, color, logo, proportions) and only change background, lighting, props and camera angle. Cover: clean white studio packshot, soft gradient hero, lifestyle in use (Saudi/Gulf context where natural), flat lay with tasteful props, premium dark luxury mood, macro detail close-up. The 'style' field is a short Arabic label.",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageJpeg.toString("base64") } },
      { type: "text", text: `Product name: ${productName || "unknown"}` },
    ],
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["productSummary", "scenes"],
      properties: {
        productSummary: { type: "string" },
        scenes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["style", "prompt"],
            properties: { style: { type: "string" }, prompt: { type: "string" } },
          },
        },
      },
    },
    effort: "low",
  });
}

async function openAiEdit(image: Buffer, prompt: string): Promise<Buffer> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("image", new Blob([new Uint8Array(image)], { type: "image/png" }), "product.png");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Image API: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { b64_json: string }[] };
  return sharp(Buffer.from(data.data[0].b64_json, "base64")).resize(SIZE, SIZE).jpeg({ quality: 90 }).toBuffer();
}

export async function generateProductImages(input: Buffer, productName = ""): Promise<{ original: string; images: GeneratedImage[]; provider: string }> {
  const loaded = await getSharp();
  if (!loaded) throw new SharpUnavailableError();
  sharp = loaded;
  const normalized = await sharp(input).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).toBuffer();
  const original = await saveUpload(await sharp(normalized).jpeg({ quality: 90 }).toBuffer(), "jpg");
  const product = await prepareProduct(normalized);

  const useAi = process.env.IMAGE_PROVIDER === "openai" && process.env.OPENAI_API_KEY && claudeConfigured();
  if (useAi) {
    try {
      const plan = await planScenes(await sharp(normalized).resize(1024, 1024, { fit: "inside" }).jpeg().toBuffer(), productName);
      const png = await sharp(normalized).resize(1024, 1024, { fit: "contain", background: "#ffffff" }).png().toBuffer();
      const results = await Promise.all(
        plan.scenes.slice(0, 6).map(async (scene) => ({ url: await saveUpload(await openAiEdit(png, scene.prompt), "jpg"), style: scene.style })),
      );
      if (results.length === 6) return { original, images: results, provider: "ai" };
    } catch (err) {
      console.error("AI image generation failed, falling back to studio compositions:", err);
    }
  }

  const images: GeneratedImage[] = [];
  for (let i = 0; i < 6; i++) {
    images.push({ url: await saveUpload(await composeLocal(product, i), "jpg"), style: STYLES[i] });
  }
  return { original, images, provider: "studio" };
}
