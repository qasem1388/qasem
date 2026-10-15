import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بريد غير صحيح" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  await prisma.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  return NextResponse.json({ ok: true });
}
