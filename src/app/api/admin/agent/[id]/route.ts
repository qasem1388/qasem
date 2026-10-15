import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { displayMessages } from "@/lib/ai/agent";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const c = await prisma.agentConversation.findUnique({ where: { id: (await params).id } });
  if (!c) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ id: c.id, title: c.title, messages: displayMessages(c.messagesJson) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await prisma.agentConversation.delete({ where: { id: (await params).id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
