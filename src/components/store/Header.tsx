"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount, useCart } from "@/lib/cart-store";
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon } from "../icons";

type Cat = { slug: string; name: string };

export function Header({ storeName, logoText, categories }: { storeName: string; logoText: string; categories: Cat[] }) {
  const items = useCart((s) => s.items);
  const wishlist = useCart((s) => s.wishlist);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = mounted ? cartCount(items) : 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setMenu(false);
  };

  return (
    <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur transition-shadow ${scrolled ? "shadow-[0_6px_24px_-12px_rgba(0,0,0,.18)]" : ""}`}>
      <div className="container flex h-16 items-center gap-3 md:h-20">
        <button className="btn-ghost -ms-2 p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="القائمة">
          <MenuIcon className="h-6 w-6" />
        </button>
        <Link href="/" className="flex items-center gap-2" aria-label={storeName}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lg font-black text-white">{logoText.slice(0, 1)}</span>
          <span className="text-xl font-black tracking-tight">{logoText}</span>
        </Link>

        <nav className="mx-6 hidden items-center gap-6 text-[15px] font-bold lg:flex">
          <Link href="/" className="hover:text-brand-600">الرئيسية</Link>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.slug} href={`/category/${encodeURIComponent(c.slug)}`} className="hover:text-brand-600">{c.name}</Link>
          ))}
          <Link href="/offers" className="text-red-600 hover:text-red-700">العروض 🔥</Link>
        </nav>

        <form onSubmit={submit} className="relative ms-auto hidden w-full max-w-xs md:block">
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input py-2.5 pe-10" placeholder="ابحث عن منتج…" aria-label="بحث" />
          <button className="absolute inset-y-0 end-3 text-neutral-500" aria-label="بحث"><SearchIcon /></button>
        </form>

        <div className="ms-auto flex items-center gap-1 md:ms-2">
          <Link href="/search" className="btn-ghost p-2.5 md:hidden" aria-label="بحث"><SearchIcon className="h-6 w-6" /></Link>
          <Link href="/wishlist" className="btn-ghost relative p-2.5" aria-label="المفضلة">
            <HeartIcon className="h-6 w-6" />
            {mounted && wishlist.length > 0 && <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">{wishlist.length}</span>}
          </Link>
          <button onClick={() => setOpen(true)} className="btn-ghost relative p-2.5" aria-label="السلة">
            <CartIcon className="h-6 w-6" />
            {count > 0 && <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] text-white">{count}</span>}
          </button>
        </div>
      </div>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-[85%] max-w-sm flex-col bg-white p-5 animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-black">{storeName}</span>
              <button onClick={() => setMenu(false)} aria-label="إغلاق"><CloseIcon className="h-6 w-6" /></button>
            </div>
            <form onSubmit={submit} className="mb-4">
              <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="ابحث عن منتج…" />
            </form>
            <nav className="flex flex-col divide-y text-base font-bold">
              <Link href="/" onClick={() => setMenu(false)} className="py-3">الرئيسية</Link>
              {categories.map((c) => (
                <Link key={c.slug} href={`/category/${encodeURIComponent(c.slug)}`} onClick={() => setMenu(false)} className="py-3">{c.name}</Link>
              ))}
              <Link href="/offers" onClick={() => setMenu(false)} className="py-3 text-red-600">العروض</Link>
              <Link href="/track" onClick={() => setMenu(false)} className="py-3">تتبع طلبك</Link>
              <Link href="/pages/contact" onClick={() => setMenu(false)} className="py-3">تواصل معنا</Link>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
