import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productSchema } from "../schema";
import { saveProduct } from "../save";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("، ") }, { status: 400 });
  const p = await saveProduct(parsed.data, id);
  return NextResponse.json({ id: p.id, slug: p.slug });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const hasOrders = await prisma.orderItem.count({ where: { productId: id } });
  // المنتجات التي لها طلبات تُخفى بدل الحذف للحفاظ على سجل الطلبات
  if (hasOrders) await prisma.product.update({ where: { id }, data: { active: false } });
  else await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, archived: hasOrders > 0 });
}
