"use client";

import { useState } from "react";

export async function uploadImage(file: File, folder = "products"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.url;
}

export function ImageInput({ value, onChange, folder = "banners" }: { value: string; onChange: (url: string) => void; folder?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-16 w-24 rounded-lg border object-cover" /> : <div className="grid h-16 w-24 place-items-center rounded-lg border border-dashed text-xs text-neutral-400">لا صورة</div>}
      <label className="btn-outline cursor-pointer py-2">
        {loading ? "جاري الرفع…" : "رفع صورة"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setLoading(true);
            try {
              onChange(await uploadImage(f, folder));
            } catch (err) {
              alert(err instanceof Error ? err.message : "فشل الرفع");
            } finally {
              setLoading(false);
            }
          }}
        />
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input flex-1 py-2 text-xs" dir="ltr" placeholder="أو الصق رابط الصورة" />
    </div>
  );
}
