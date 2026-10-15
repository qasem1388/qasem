import { NextResponse } from "next/server";
import sharp from "sharp";
import { saveUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "ملف غير صالح (الحد 12MB)" }, { status: 400 });
  try {
    const buf = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    return NextResponse.json({ url: await saveUpload(buf, "webp", String(form.get("folder") || "products").replace(/[^a-z]/g, "") || "products") });
  } catch {
    return NextResponse.json({ error: "الملف ليس صورة صالحة" }, { status: 400 });
  }
}
