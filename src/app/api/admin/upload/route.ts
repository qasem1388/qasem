import { NextResponse } from "next/server";
import { getSharp, sniffImage } from "@/lib/sharp-loader";
import { saveUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "حجم الصورة كبير جداً، جرّب صورة أصغر من 10MB" }, { status: 413 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "ملف غير صالح (الحد 12MB)" }, { status: 400 });
  const folder = String(form.get("folder") || "products").replace(/[^a-z]/g, "") || "products";
  const input = Buffer.from(await file.arrayBuffer());
  const type = sniffImage(input);
  if (!type) return NextResponse.json({ error: "الملف ليس صورة صالحة (JPG / PNG / WEBP)" }, { status: 400 });

  const sharp = await getSharp();
  if (!sharp) {
    // بدون sharp: المتصفح صغّر الصورة مسبقاً، نحفظها كما هي
    return NextResponse.json({ url: await saveUpload(input, type.ext, folder) });
  }
  try {
    const buf = await sharp(input).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    return NextResponse.json({ url: await saveUpload(buf, "webp", folder) });
  } catch {
    return NextResponse.json({ url: await saveUpload(input, type.ext, folder) });
  }
}
