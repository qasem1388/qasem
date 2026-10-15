import { AgentChat } from "@/components/admin/AgentChat";
import { claudeConfigured } from "@/lib/ai/claude";

export default function AgentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">🤖 الوكيل الذكي</h1>
      {!claudeConfigured() && <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-800">أضف ANTHROPIC_API_KEY في ملف ‎.env‎ لتفعيل الوكيل الذكي.</p>}
      <AgentChat />
    </div>
  );
}
