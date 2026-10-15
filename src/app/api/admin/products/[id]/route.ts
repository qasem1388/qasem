import { NextResponse } from "next/server";
import { deleteProduct } from "@/lib/products";
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
  const { archived } = await deleteProduct(id);
  return NextResponse.json({ ok: true, archived });
}
