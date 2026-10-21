"use client";

import { Check, Copy, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { deleteMedia, uploadMedia, type MediaItem } from "@/app/admin/actions/media";
import { cn } from "@/lib/utils";

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export function MediaLibrary({ initial, canEdit }: { initial: MediaItem[]; canEdit: boolean }) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [copied, setCopied] = useState<string>();
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    start(async () => {
      const res = await uploadMedia(fd);
      if (!res.ok) return setMessage({ ok: false, text: res.message });
      setItems((prev) => [...res.items, ...prev]);
      setMessage(
        res.rejected.length
          ? { ok: false, text: `تم رفع ${res.items.length} ملف، ورُفض: ${res.rejected.join("، ")} (تحقق من الصيغة والحجم).` }
          : { ok: true, text: `تم رفع ${res.items.length} ملف بنجاح.` },
      );
      if (input.current) input.current.value = "";
    });
  };

  const remove = (m: MediaItem) => {
    if (!confirm(`حذف «${m.name}» نهائيًا؟ تأكد أنه غير مستخدم في الموقع.`)) return;
    start(async () => {
      const res = await deleteMedia(m.id);
      setMessage({ ok: res.ok, text: res.message });
      if (res.ok) setItems((prev) => prev.filter((x) => x.id !== m.id));
    });
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-brand-lg flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed bg-white p-10 text-center transition-colors",
            drag ? "border-secondary bg-secondary-50" : "border-primary/15 hover:border-primary/40",
          )}
        >
          {pending ? (
            <Loader2 className="text-primary size-10 animate-spin" aria-hidden />
          ) : (
            <UploadCloud className="text-primary size-10" aria-hidden />
          )}
          <span className="text-primary font-semibold">اسحب الصور هنا أو اضغط للاختيار</span>
          <span className="text-muted text-xs">PNG، JPG، WebP، GIF، SVG، ICO — حتى 5 ميجابايت للملف، و20 ملفًا في المرة</span>
          <input
            ref={input}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.ico"
            className="sr-only"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      )}
      {message && (
        <p
          role="status"
          className={cn("rounded-brand p-3 text-sm", message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}
        >
          {message.text}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-brand-lg text-muted bg-white p-10 text-center">لا توجد ملفات بعد.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <li key={m.id} className="rounded-brand-lg border-primary/8 overflow-hidden border bg-white">
              <div className="flex h-32 items-center justify-center bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- media thumbnails of arbitrary formats */}
                <img src={m.url} alt={m.name} className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-primary truncate text-xs font-semibold" title={m.name}>
                  {m.name}
                </p>
                <p className="text-muted text-xs">
                  {m.kind.toUpperCase()} · <span dir="ltr">{fmtSize(m.size)}</span>
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(location.origin + m.url);
                      setCopied(m.id);
                      setTimeout(() => setCopied(undefined), 1500);
                    }}
                    className="border-primary/15 text-primary inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border text-xs"
                  >
                    {copied === m.id ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    {copied === m.id ? "تم النسخ" : "نسخ الرابط"}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      aria-label={`حذف ${m.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
