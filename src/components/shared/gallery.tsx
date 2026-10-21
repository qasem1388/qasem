"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryItem = { src: string; caption?: string; meta?: string };

/** Responsive image grid with an accessible lightbox (keyboard: ←/→/Esc). */
export function Gallery({
  items,
  labels,
  columns = 3,
}: {
  items: GalleryItem[];
  labels: { close: string; prev: string; next: string; open: string };
  columns?: 2 | 3;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) {
      dialog.close();
      lastTrigger.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index === null ? null : items[index];

  return (
    <>
      <ul className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
        {items.map((item, i) => (
          <li key={`${item.src}-${i}`}>
            <button
              type="button"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setIndex(i);
              }}
              className="group rounded-brand-lg relative block w-full overflow-hidden text-start"
              aria-label={`${labels.open}: ${item.caption ?? i + 1}`}
            >
              <Image
                src={item.src}
                alt={item.caption ?? ""}
                width={800}
                height={600}
                className="aspect-[4/3] h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {item.caption && (
                <span className="from-primary/90 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-4 pt-10 text-sm font-medium text-white">
                  {item.meta && <span className="text-secondary block text-xs">{item.meta}</span>}
                  {item.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="backdrop:bg-primary/90 m-auto max-h-[92vh] w-[min(64rem,94vw)] overflow-visible bg-transparent p-0 backdrop:backdrop-blur-sm"
        aria-label={current?.caption}
      >
        {current && (
          <figure className="relative">
            <Image
              src={current.src}
              alt={current.caption ?? ""}
              width={1280}
              height={960}
              className="rounded-brand-lg max-h-[80vh] w-full object-contain"
            />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-white">
              <span>{current.caption}</span>
              <span dir="ltr" className="text-white/60">
                {(index ?? 0) + 1} / {items.length}
              </span>
            </figcaption>
            <button
              type="button"
              onClick={close}
              aria-label={labels.close}
              className="text-primary absolute -top-3 inline-flex size-11 items-center justify-center rounded-full bg-white shadow-lg ltr:-right-3 rtl:-left-3"
              autoFocus
            >
              <X className="size-5" aria-hidden />
            </button>
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={labels.prev}
                  className="text-primary absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow ltr:left-3 rtl:right-3"
                >
                  <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={labels.next}
                  className="text-primary absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow ltr:right-3 rtl:left-3"
                >
                  <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
                </button>
              </>
            )}
          </figure>
        )}
      </dialog>
    </>
  );
}
