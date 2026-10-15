"use client";

import { useState } from "react";

/** تصغير الصورة في المتصفح قبل الرفع (صور الجوال قد تتجاوز 10MB) */
export async function shrinkImage(file: Blob, max = 2400): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 3 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file; // صيغة لا يدعمها المتصفح: نرسلها كما هي
  }
}

/** يقرأ رد الخادم بأمان حتى لو لم يكن JSON */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(res: Response): Promise<Record<string, any>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: res.status === 413 ? "حجم الصورة كبير جداً" : `تعذّر الرفع (خطأ ${res.status})` };
  }
}

export async function uploadImage(file: Blob, folder = "products"): Promise<string> {
  const fd = new FormData();
  fd.append("file", await shrinkImage(file), "image.jpg");
  fd.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await readJson(res);
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
