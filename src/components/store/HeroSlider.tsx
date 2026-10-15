"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronIcon, ChevronLeftIcon } from "../icons";

type Slide = { id: string; title: string; subtitle: string; image: string; link: string; buttonText: string };

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);

  return (
    <section className="container pt-4" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-neutral-100 sm:aspect-[16/9] lg:aspect-[21/8]">
        {slides.map((s, idx) => (
          <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={idx !== i}>
            <img src={s.image} alt={s.title} className="h-full w-full object-cover" loading={idx === 0 ? "eager" : "lazy"} fetchPriority={idx === 0 ? "high" : "auto"} />
            <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/25 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 sm:items-center sm:p-12 lg:p-16">
              <div className={`max-w-xl text-white ${idx === i ? "animate-fade-up" : ""}`}>
                {s.subtitle && <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">{s.subtitle}</p>}
                <h2 className="mb-6 text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">{s.title}</h2>
                <Link href={s.link} className="btn bg-white px-8 py-4 text-base text-ink hover:bg-neutral-100">{s.buttonText}</Link>
              </div>
            </div>
          </div>
        ))}
        {slides.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute start-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-3 shadow sm:block" aria-label="السابق"><ChevronLeftIcon className="h-5 w-5 rotate-180" /></button>
            <button onClick={() => go(1)} className="absolute end-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-3 shadow sm:block" aria-label="التالي"><ChevronIcon className="h-5 w-5 rotate-180" /></button>
            <div className="absolute bottom-4 start-1/2 flex -translate-x-1/2 gap-2 rtl:translate-x-1/2">
              {slides.map((s, idx) => (
                <button key={s.id} onClick={() => setI(idx)} className={`h-2 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-2 bg-white/50"}`} aria-label={`شريحة ${idx + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
