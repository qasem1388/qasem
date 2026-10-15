import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { claudeConfigured } from "@/lib/ai/claude";
import { generateProductCopy } from "@/lib/ai/titles";
import { uploadPathFromUrl } from "@/lib/storage";

export const maxDuration = 120;

const schema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  details: z.string().optional(),
  price: z.number().optional(),
  colors: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
});

export async function POST(req: Request) {
  if (!claudeConfigured()) return NextResponse.json({ error: "أضف ANTHROPIC_API_KEY في ملف .env لتفعيل الكتابة بالذكاء الاصطناعي" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "اكتب اسم المنتج أولاً" }, { status: 400 });
  const { imageUrl, ...input } = parsed.data;

  let imageBase64: { data: string; mediaType: "image/jpeg" } | undefined;
  const file = imageUrl ? uploadPathFromUrl(imageUrl) : null;
  if (file) {
    const jpeg = await sharp(await readFile(file)).resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer().catch(() => null);
    if (jpeg) imageBase64 = { data: jpeg.toString("base64"), mediaType: "image/jpeg" };
  }
  try {
    return NextResponse.json(await generateProductCopy({ ...input, imageBase64 }));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر التوليد" }, { status: 500 });
  }
}
