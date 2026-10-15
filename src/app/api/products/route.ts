import { NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 40);
  if (!ids.length) return NextResponse.json({ products: [] });
  const products = await listProducts({ where: { id: { in: ids } } });
  products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return NextResponse.json({ products });
}
