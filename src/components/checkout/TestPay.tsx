"use client";

import { useState } from "react";

export function TestPay({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const act = async (approve: boolean) => {
    setLoading(true);
    const res = await fetch("/api/payments/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, approve }) });
    const data = await res.json();
    if (data.redirect) window.location.href = data.redirect;
    else setLoading(false);
  };
  return (
    <div className="flex gap-3">
      <button disabled={loading} onClick={() => act(true)} className="btn-brand flex-1">محاكاة دفع ناجح</button>
      <button disabled={loading} onClick={() => act(false)} className="btn-outline flex-1">محاكاة فشل الدفع</button>
    </div>
  );
}
