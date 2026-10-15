"use client";

import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setState(res.ok ? "done" : "error");
  };
  if (state === "done") return <p className="rounded-xl bg-white/10 p-4 text-sm text-white">شكراً لاشتراكك! ستصلك أحدث العروض أولاً 🎁</p>;
  return (
    <form onSubmit={submit} className="flex max-w-md gap-2">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="بريدك الإلكتروني لأقوى العروض" className="input border-white/20 bg-white/5 text-white placeholder:text-neutral-400" />
      <button className="btn bg-white text-ink hover:bg-neutral-200" disabled={state === "loading"}>اشترك</button>
    </form>
  );
}
