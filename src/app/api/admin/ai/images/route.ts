import { NextResponse } from "next/server";
import { generateProductImages } from "@/lib/ai/images";

export const maxDuration = 300;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "ارفع صورة المنتج (الحد 12MB)" }, { status: 400 });
  try {
    const result = await generateProductImages(Buffer.from(await file.arrayBuffer()), String(form.get("name") || ""));
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "تعذّر توليد الصور، تأكد أن الملف صورة صالحة" }, { status: 400 });
  }
}
