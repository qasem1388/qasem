"use client";

import { useState } from "react";

type Group = { title: string; fields: { key: string; label: string; type?: "text" | "bool" | "textarea" | "datetime"; dir?: "ltr" }[] };

export function SettingsForm({ initial, groups, status }: { initial: Record<string, string>; groups: Group[]; status: { label: string; ok: boolean; hint: string }[] }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const save = async () => {
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    setMsg(res.ok ? "تم الحفظ ✓" : "تعذّر الحفظ");
    setTimeout(() => setMsg(""), 3000);
  };
  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="mb-3 font-extrabold">حالة الربط مع الخدمات</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {status.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm">
              <span className="font-bold">{s.label}</span>
              <span className={`badge ${s.ok ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-800"}`} title={s.hint}>{s.ok ? "مفعّل" : "تجريبي"}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">مفاتيح البوابات وشركات الشحن تُضبط في ملف ‎.env‎ على الخادم (لأسباب أمنية لا تُحفظ في قاعدة البيانات).</p>
      </section>
      {groups.map((g) => (
        <section key={g.title} className="card p-5">
          <h2 className="mb-4 font-extrabold">{g.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                {f.type === "bool" ? (
                  <label className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm font-bold">
                    {f.label}
                    <input type="checkbox" checked={v[f.key] === "true"} onChange={(e) => setV({ ...v, [f.key]: String(e.target.checked) })} className="h-5 w-5 accent-ink" />
                  </label>
                ) : (
                  <>
                    <label className="label">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} rows={2} className="input" />
                    ) : (
                      <input type={f.type === "datetime" ? "datetime-local" : "text"} value={f.type === "datetime" ? (v[f.key] ?? "").slice(0, 16) : v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="input" dir={f.dir} />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="sticky bottom-0 flex items-center gap-3 border-t bg-white/95 py-3 backdrop-blur">
        <button onClick={save} className="btn-primary px-10">حفظ الإعدادات</button>
        {msg && <span className="text-sm font-bold text-brand-700">{msg}</span>}
      </div>
    </div>
  );
}
