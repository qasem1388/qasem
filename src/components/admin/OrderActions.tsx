"use client";

import { readJson } from "./ImageInput";
import { useState } from "react";

export function OrderActions({ id, status, statuses, carrier, hasTracking, labelUrl }: { id: string; status: string; statuses: Record<string, string>; carrier: string; hasTracking: boolean; labelUrl: string }) {
  const [s, setS] = useState(status);
  const [note, setNote] = useState("");
  const [company, setCompany] = useState(carrier);
  const [loading, setLoading] = useState(false);

  const update = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s, note }) });
    if (!res.ok) alert((await readJson(res)).error);
    location.reload();
  };
  const ship = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}/ship`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company }) });
    if (!res.ok) {
      alert((await readJson(res)).error);
      setLoading(false);
      return;
    }
    location.reload();
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-5">
        <h3 className="font-extrabold">تحديث الحالة</h3>
        <select value={s} onChange={(e) => setS(e.target.value)} className="input">
          {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="ملاحظة (اختياري)" />
        <button onClick={update} disabled={loading || s === status} className="btn-primary w-full">حفظ الحالة</button>
      </div>
      <div className="card space-y-3 p-5">
        <h3 className="font-extrabold">الشحن</h3>
        {hasTracking ? (
          labelUrl ? <a href={labelUrl} target="_blank" rel="noopener" download={labelUrl.startsWith("data:") ? "label.pdf" : undefined} className="btn-outline w-full">طباعة البوليصة</a> : <p className="text-sm text-neutral-500">تم إنشاء الشحنة</p>
        ) : (
          <>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="input">
              <option value="smsa">سمسا إكسبرس</option>
              <option value="aramex">أرامكس</option>
            </select>
            <button onClick={ship} disabled={loading} className="btn-brand w-full">إصدار بوليصة الشحن</button>
          </>
        )}
      </div>
    </div>
  );
}
