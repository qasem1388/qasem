"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readJson } from "./ImageInput";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!confirm(`حذف المنتج "${name}"؟`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "تعذّر حذف المنتج");
      if (data.archived) alert("المنتج مرتبط بطلبات سابقة، تم إخفاؤه بدلاً من حذفه");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذّر حذف المنتج");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={remove} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
      {busy ? "…" : "🗑 حذف"}
    </button>
  );
}
