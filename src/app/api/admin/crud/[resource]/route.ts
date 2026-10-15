import { NextResponse } from "next/server";
import { RESOURCES } from "../resources";

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = RESOURCES[(await params).resource];
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ items: await r.list() });
}

export async function POST(req: Request, { params }: Ctx) {
  const r = RESOURCES[(await params).resource];
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = r.schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("، ") }, { status: 400 });
  try {
    return NextResponse.json(await r.create(parsed.data as Record<string, unknown>));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error && e.message.includes("Unique") ? "القيمة مستخدمة مسبقاً" : "تعذّر الحفظ" }, { status: 400 });
  }
}
