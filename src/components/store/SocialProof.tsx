"use client";

import { useEffect, useState } from "react";

type Item = { name: string; city: string; product: string; image: string; minutesAgo: number };

/** إشعارات "اشترى أحد العملاء مؤخراً" مبنية على طلبات حقيقية */
export function SocialProof({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(-1);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!items.length) return;
    let i = 0;
    const show = () => {
      setIdx(i % items.length);
      setVisible(true);
      i++;
      setTimeout(() => setVisible(false), 5000);
    };
    const first = setTimeout(show, 8000);
    const loop = setInterval(show, 25000);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, [items]);
  if (idx < 0) return null;
  const it = items[idx];
  const ago = it.minutesAgo < 60 ? `قبل ${it.minutesAgo} دقيقة` : it.minutesAgo < 1440 ? `قبل ${Math.round(it.minutesAgo / 60)} ساعة` : "مؤخراً";
  return (
    <div className={`fixed bottom-24 start-4 z-30 flex max-w-xs items-center gap-3 rounded-2xl border bg-white p-3 shadow-xl transition-all duration-500 md:bottom-6 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} role="status">
      {it.image && <img src={it.image} alt="" className="h-14 w-14 rounded-xl object-cover" />}
      <div className="text-xs leading-5">
        <p><b>{it.name}</b> من {it.city}</p>
        <p className="line-clamp-1 text-neutral-600">اشترى {it.product}</p>
        <p className="text-neutral-400">{ago} ✓</p>
      </div>
    </div>
  );
}
