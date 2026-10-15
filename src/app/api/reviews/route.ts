import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  name: z.string().trim().min(2).max(40),
  city: z.string().trim().max(30).optional().default(""),
  comment: z.string().trim().min(5).max(600),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "تحقق من البيانات المدخلة" }, { status: 400 });
  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "المنتج غير موجود" }, { status: 404 });
  // التقييمات تظهر بعد موافقة الإدارة
  await prisma.review.create({ data: { ...parsed.data, approved: false } });
  return NextResponse.json({ ok: true });
}
