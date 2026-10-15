"use client";

import { useEffect, useRef, useState } from "react";
import { readJson } from "./ImageInput";

type Msg = { role: "user" | "assistant"; text: string; tools?: string[]; actions?: { label: string; ok: boolean; summary: string }[] };
type Convo = { id: string; title: string; updatedAt: string };

const SUGGESTIONS = [
  "أعطني ملخص أداء المتجر آخر 30 يوم مع توصيات لزيادة المبيعات",
  "اعرض الطلبات المؤكدة التي لم تُشحن بعد واصدر لها بوليصات مع سمسا",
  "ما المنتجات التي مخزونها أقل من 5؟",
  "أنشئ كوبون WELCOME15 خصم 15% للطلبات فوق 150 ريال صالح 30 يوم",
  "خفّض أسعار تصنيف العطور 10% واجعلها تظهر كعرض",
  "أعد كتابة عناوين ووصف المنتجات الأكثر مبيعاً بأسلوب تسويقي أقوى",
  "أضف بنر عروض في الرئيسية لعرض نهاية الأسبوع",
  "اعرض التقييمات المعلقة واعتمد الإيجابية منها",
];

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const clean = line.replace(/^\s*[-*•]\s+/, "").replace(/^#+\s*/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <b key={j}>{p.slice(2, -2)}</b> : p));
    if (!clean.trim()) return <div key={i} className="h-2" />;
    return bullet ? <li key={i} className="ms-5 list-disc">{parts}</li> : <p key={i}>{parts}</p>;
  });
}

export function AgentChat() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvos = () => fetch("/api/admin/agent").then((r) => r.json()).then((d) => setConvos(d.items ?? []));
  useEffect(() => {
    loadConvos();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const open = async (cid: string) => {
    const d = await fetch(`/api/admin/agent/${cid}`).then((r) => r.json());
    setId(cid);
    setMessages(d.messages ?? []);
    setError("");
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: id, message: text }) });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error);
      setId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", text: data.reply, actions: data.actions }]);
      loadConvos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (cid: string) => {
    await fetch(`/api/admin/agent/${cid}`, { method: "DELETE" });
    if (cid === id) {
      setId(null);
      setMessages([]);
    }
    loadConvos();
  };

  return (
    <div className="grid h-[calc(100vh-9rem)] gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="card hidden flex-col overflow-hidden lg:flex">
        <button onClick={() => { setId(null); setMessages([]); }} className="btn-primary m-3">+ محادثة جديدة</button>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {convos.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-lg ${c.id === id ? "bg-neutral-100" : "hover:bg-neutral-50"}`}>
              <button onClick={() => open(c.id)} className="flex-1 truncate p-2.5 text-start text-sm">{c.title}</button>
              <button onClick={() => remove(c.id)} className="px-2 text-neutral-400 opacity-0 hover:text-red-500 group-hover:opacity-100" aria-label="حذف">✕</button>
            </div>
          ))}
        </div>
      </aside>

      <section className="card flex flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <p className="mb-2 text-4xl">🤖</p>
              <h2 className="mb-2 text-xl font-black">مساعد المتجر الذكي</h2>
              <p className="mb-6 text-sm text-neutral-500">اطلب أي شيء بلغتك: إدارة المنتجات والأسعار والمخزون، الطلبات والشحن، الكوبونات والعروض، البنرات، التقارير، والإعدادات — وسأنفّذه مباشرة.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border p-3 text-start text-sm hover:border-ink">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${m.role === "user" ? "bg-ink text-white" : "bg-neutral-100"}`}>
                {(m.actions?.length || m.tools?.length) ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.actions
                      ? m.actions.map((a, j) => <span key={j} title={a.summary} className={`badge ${a.ok ? "bg-brand-100 text-brand-800" : "bg-red-100 text-red-700"}`}>{a.ok ? "✓" : "✕"} {a.label}</span>)
                      : m.tools!.map((t, j) => <span key={j} className="badge bg-white text-neutral-600">⚙ {t}</span>)}
                  </div>
                ) : null}
                {m.text && <div className="space-y-1">{renderText(m.text)}</div>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">يعمل الوكيل على طلبك… ⏳</div>
            </div>
          )}
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            className="input resize-none"
            placeholder="اكتب طلبك… مثال: اشحن كل الطلبات المؤكدة مع أرامكس"
          />
          <button disabled={loading || !input.trim()} className="btn-primary px-6">إرسال</button>
        </form>
      </section>
    </div>
  );
}
