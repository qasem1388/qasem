import { NextResponse } from "next/server";
import { RESOURCES } from "../../resources";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { resource, id } = await params;
  const r = RESOURCES[resource];
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = r.schema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("، ") }, { status: 400 });
  try {
    return NextResponse.json(await r.update(id, parsed.data as Record<string, unknown>));
  } catch {
    return NextResponse.json({ error: "تعذّر الحفظ" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { resource, id } = await params;
  const r = RESOURCES[resource];
  if (!r) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await r.remove(id);
  return NextResponse.json({ ok: true });
}
