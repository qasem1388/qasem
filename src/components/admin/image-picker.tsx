"use client";

import { ImagePlus, Images, Loader2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { listMedia, uploadMedia, type MediaItem } from "@/app/admin/actions/media";
import { cn } from "@/lib/utils";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg,.ico";

/** Image field: shows a preview, uploads a new image or picks one from the media library. */
export function ImagePicker({
  label,
  value,
  onChange,
  hint,
  allowClear = true,
  aspect = "video",
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  hint?: string;
  allowClear?: boolean;
  aspect?: "video" | "square" | "logo";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    fd.append("files", files[0]);
    setError(undefined);
    start(async () => {
      const res = await uploadMedia(fd);
      if (!res.ok) setError(res.message);
      else if (res.items[0]) onChange(res.items[0].url);
      else setError("الملف غير مقبول: الصيغ المسموحة PNG وJPG وWebP وGIF وSVG وICO بحجم أقصى 5 ميجابايت.");
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <div>
      <p className="text-primary mb-1.5 text-sm font-semibold">{label}</p>
      <div className="rounded-brand border-primary/15 flex flex-col gap-3 border p-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]",
            aspect === "square" ? "size-20" : aspect === "logo" ? "h-20 w-40" : "h-24 w-40",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-chosen URLs, preview only
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="text-muted size-7" aria-hidden />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-muted truncate text-xs" dir="ltr">
            {value || "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="rounded-brand bg-primary inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              رفع صورة
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-brand border-primary/15 text-primary inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-semibold"
            >
              <Images className="size-4" aria-hidden />
              من المكتبة
            </button>
            {allowClear && value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="rounded-brand inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" aria-hidden />
                إزالة
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label={`${label}: رفع صورة`}
            onChange={(e) => upload(e.target.files)}
          />
          {hint && <p className="text-muted text-xs">{hint}</p>}
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
      {open && (
        <MediaDialog
          onClose={() => setOpen(false)}
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function MediaDialog({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
    listMedia().then(setItems);
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="rounded-brand-lg backdrop:bg-primary/60 m-auto w-[min(56rem,94vw)] p-0"
      aria-label="مكتبة الوسائط"
    >
      <div className="border-primary/8 flex items-center justify-between border-b p-4">
        <h2 className="text-primary font-bold">مكتبة الوسائط</h2>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="hover:bg-primary-50 rounded-md p-1">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-4">
        {!items ? (
          <p className="text-muted p-8 text-center">جارٍ التحميل…</p>
        ) : items.length === 0 ? (
          <p className="text-muted p-8 text-center">المكتبة فارغة. ارفع صورة أولًا.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onPick(m.url)}
                  className="rounded-brand border-primary/10 hover:border-secondary focus-visible:border-secondary block w-full overflow-hidden border text-start"
                >
                  <span className="bg-surface flex h-28 items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- media library thumbnails */}
                    <img src={m.url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  </span>
                  <span className="text-muted block truncate px-2 py-1.5 text-xs">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
