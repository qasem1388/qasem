"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = parts(now === null ? 0 : end - now);
  const box = (v: number, label: string) => (
    <div className="flex min-w-14 flex-col items-center rounded-xl bg-white/15 px-2 py-2 backdrop-blur">
      <span className="text-2xl font-black tabular-nums">{now === null ? "--" : String(v).padStart(2, "0")}</span>
      <span className="text-[10px] opacity-80">{label}</span>
    </div>
  );
  return (
    <div className="flex gap-2" dir="ltr">
      {box(p.d, "يوم")}
      {box(p.h, "ساعة")}
      {box(p.m, "دقيقة")}
      {box(p.s, "ثانية")}
    </div>
  );
}
