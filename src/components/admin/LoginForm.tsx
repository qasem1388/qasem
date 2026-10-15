"use client";

import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }) });
    if (res.ok) window.location.href = next.startsWith("/admin") ? next : "/admin";
    else {
      setError((await res.json()).error);
      setLoading(false);
    }
  };
  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
      <h1 className="text-2xl font-black">تسجيل الدخول</h1>
      <p className="text-sm text-neutral-500">لوحة تحكم المتجر</p>
      <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" name="email" type="email" required className="input" dir="ltr" autoComplete="username" /></div>
      <div><label className="label" htmlFor="password">كلمة المرور</label><input id="password" name="password" type="password" required className="input" dir="ltr" autoComplete="current-password" /></div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "…" : "دخول"}</button>
    </form>
  );
}
