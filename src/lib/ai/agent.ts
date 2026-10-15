import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { parseJson } from "../format";
import { CLAUDE_MODEL, FALLBACK_BETA, claude } from "./claude";
import { TOOL_LABELS, runTool, toolDefinitions, type ToolName } from "./agent-tools";

type Msg = Anthropic.Beta.BetaMessageParam;

export type AgentAction = { tool: string; label: string; ok: boolean; summary: string };

const MAX_STEPS = 15;

function systemPrompt() {
  return `أنت "مساعد المتجر" — وكيل ذكي يدير لوحة تحكم متجر إلكتروني سعودي نيابةً عن مالك المتجر.
لديك أدوات للوصول إلى كل أجزاء المتجر: المنتجات والألوان، الطلبات والشحن (سمسا/أرامكس)، العملاء، الكوبونات، التصنيفات، السلايدرات والبنرات، التقييمات، الإعدادات، والتقارير.

طريقة العمل:
- نفّذ الطلب فعلياً باستخدام الأدوات بدل شرح الخطوات للمالك. اقرأ البيانات أولاً عند الحاجة لمعرفة المعرّفات قبل التعديل.
- قبل أي عملية لا يمكن التراجع عنها بسهولة أو تمس عدداً كبيراً من السجلات (حذف، إلغاء طلبات، تغيير أسعار جماعي، تعديل إعدادات الدفع) اعرض ما ستفعله بالضبط واطلب التأكيد، إلا إذا كان المالك قد طلبه صراحةً وبوضوح.
- إذا فشلت أداة فاقرأ رسالة الخطأ وصحّح المدخلات أو أبلغ المالك بالسبب.
- الأسعار بالريال السعودي وشاملة الضريبة.
- اختم بملخص قصير بالعربية لما تم تنفيذه فعلاً، مع الأرقام المهمة (أرقام الطلبات، الأسعار الجديدة، أكواد الخصم، أرقام التتبع). استخدم قوائم نقطية عند الحاجة، وتجنب الإطالة.
- عند طلب أفكار تسويقية، قدّم اقتراحات عملية مبنية على بيانات المتجر الحقيقية (الأكثر مبيعاً، المخزون، الطلبات) ويمكنك تنفيذها مباشرة (كوبونات، عروض، بنرات، تمييز منتجات).

تاريخ اليوم: ${new Date().toISOString().slice(0, 10)}.`;
}

function summarize(content: string) {
  return content.length > 160 ? `${content.slice(0, 160)}…` : content;
}

export async function runAgentTurn(conversationId: string | null, userText: string) {
  const convo = conversationId
    ? await prisma.agentConversation.findUnique({ where: { id: conversationId } })
    : await prisma.agentConversation.create({ data: { title: userText.slice(0, 60) } });
  if (!convo) throw new Error("المحادثة غير موجودة");

  // سجل المحادثة يُلحق به فقط ويُرسل كما هو (بما فيه كتل التفكير) للحفاظ على سلامة السياق
  const messages = parseJson<Msg[]>(convo.messagesJson, []);
  messages.push({ role: "user", content: userText });

  const tools = toolDefinitions();
  const actions: AgentAction[] = [];
  let reply = "";

  const save = () =>
    prisma.agentConversation.update({ where: { id: convo.id }, data: { messagesJson: JSON.stringify(messages) } });

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await claude().beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      system: systemPrompt(),
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) reply = text;

    if (response.stop_reason === "refusal") {
      reply = "عذراً، لا يمكنني تنفيذ هذا الطلب.";
      break;
    }
    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason === "max_tokens") {
      reply ||= "توقف الرد لأنه تجاوز الحد المسموح. اطلب جزءاً أصغر من المهمة.";
      break;
    }

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results = await Promise.all(
      toolUses.map(async (t) => {
        const r = await runTool(t.name, t.input);
        actions.push({ tool: t.name, label: TOOL_LABELS[t.name as ToolName] ?? t.name, ok: r.ok, summary: summarize(r.content) });
        return { type: "tool_result" as const, tool_use_id: t.id, content: r.content, is_error: !r.ok };
      }),
    );
    // كل نتائج الأدوات في رسالة واحدة
    messages.push({ role: "user", content: results });
    await save();

    if (step === MAX_STEPS - 1) reply ||= "وصلت للحد الأقصى من الخطوات في هذه المهمة. اكتب (أكمل) للمتابعة.";
  }

  await save();
  return { conversationId: convo.id, reply, actions };
}

/** يحوّل السجل المخزّن إلى رسائل قابلة للعرض في الواجهة */
export function displayMessages(messagesJson: string) {
  const messages = parseJson<Msg[]>(messagesJson, []);
  const out: { role: "user" | "assistant"; text: string; tools?: string[] }[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (typeof m.content === "string") {
      out.push({ role: m.role, text: m.content });
      continue;
    }
    if (m.role === "user") continue; // نتائج أدوات
    const text = m.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.Beta.BetaTextBlockParam).text)
      .join("\n")
      .trim();
    const tools = m.content
      .filter((b) => b.type === "tool_use")
      .map((b) => TOOL_LABELS[(b as Anthropic.Beta.BetaToolUseBlockParam).name as ToolName] ?? (b as Anthropic.Beta.BetaToolUseBlockParam).name);
    if (text || tools.length) out.push({ role: "assistant", text, tools });
  }
  return out;
}
