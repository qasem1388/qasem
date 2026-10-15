import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-5-5";
// عند رفض النموذج لأسباب سياسات الأمان يُعاد الطلب تلقائياً على النموذج البديل الافتراضي
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY غير مضبوط في ملف .env");
  client ??= new Anthropic();
  return client;
}

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** طلب يعيد JSON مطابقاً للمخطط (structured outputs) */
export async function claudeJson<T>(opts: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const response = await claude().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: opts.system,
    output_config: { effort: opts.effort ?? "medium", format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.content }],
  });
  if (response.stop_reason === "refusal") throw new Error("تعذّر على الذكاء الاصطناعي إكمال الطلب، جرّب صياغة مختلفة");
  if (response.stop_reason === "max_tokens") throw new Error("الرد أطول من المسموح، حاول مرة أخرى");
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  if (!text) throw new Error("لم يصل رد من الذكاء الاصطناعي");
  return JSON.parse(text) as T;
}
