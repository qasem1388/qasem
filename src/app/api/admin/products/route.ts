import { NextResponse } from "next/server";
import { productSchema } from "./schema";
import { saveProduct } from "./save";

export async function POST(req: Request) {
  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("، ") }, { status: 400 });
  const p = await saveProduct(parsed.data);
  return NextResponse.json({ id: p.id, slug: p.slug });
}
