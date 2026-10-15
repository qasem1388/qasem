import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { claudeConfigured } from "@/lib/ai/claude";
import { runAgentTurn } from "@/lib/ai/agent";

export const maxDuration = 300;

export async function GET() {
  const items = await prisma.agentConversation.findMany({ orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true, updatedAt: true } });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!claudeConfigured()) return NextResponse.json({ error: "أضف ANTHROPIC_API_KEY في ملف .env لتفعيل الوكيل الذكي" }, { status: 400 });
  const { conversationId, message } = (await req.json().catch(() => ({}))) as { conversationId?: string | null; message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "اكتب طلبك" }, { status: 400 });
  try {
    return NextResponse.json(await runAgentTurn(conversationId ?? null, message.trim().slice(0, 8000)));
  } catch (e) {
    console.error("agent error", e);
    const msg =
      e instanceof Anthropic.RateLimitError ? "تم تجاوز حد الطلبات، حاول بعد قليل"
      : e instanceof Anthropic.AuthenticationError ? "مفتاح ANTHROPIC_API_KEY غير صحيح"
      : e instanceof Anthropic.APIError ? `خطأ من خدمة الذكاء الاصطناعي (${e.status})`
      : e instanceof Error ? e.message : "حدث خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
