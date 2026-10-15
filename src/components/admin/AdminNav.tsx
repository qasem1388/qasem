"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "../icons";

const LINKS = [
  { href: "/admin", label: "الرئيسية", icon: "📊" },
  { href: "/admin/agent", label: "الوكيل الذكي", icon: "🤖" },
  { href: "/admin/orders", label: "الطلبات", icon: "🧾" },
  { href: "/admin/products", label: "المنتجات", icon: "📦" },
  { href: "/admin/categories", label: "التصنيفات", icon: "🗂️" },
  { href: "/admin/banners", label: "السلايدرات والبنرات", icon: "🖼️" },
  { href: "/admin/coupons", label: "الكوبونات", icon: "🏷️" },
  { href: "/admin/customers", label: "العملاء", icon: "👥" },
  { href: "/admin/reviews", label: "التقييمات", icon: "⭐" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
];

export function AdminNav({ storeName }: { storeName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition ${active ? "bg-white text-ink" : "text-neutral-300 hover:bg-white/10"}`}>
            <span>{l.icon}</span> {l.label}
          </Link>
        );
      })}
      <hr className="my-3 border-white/10" />
      <Link href="/" target="_blank" className="rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-300 hover:bg-white/10">🛍️ عرض المتجر</Link>
      <button onClick={logout} className="rounded-xl px-4 py-2.5 text-start text-sm font-bold text-neutral-300 hover:bg-white/10">🚪 تسجيل الخروج</button>
    </nav>
  );
  return (
    <>
      <div className="flex items-center justify-between bg-ink p-4 text-white lg:hidden">
        <span className="font-black">{storeName} — لوحة التحكم</span>
        <button onClick={() => setOpen(!open)} aria-label="القائمة"><MenuIcon className="h-6 w-6" /></button>
      </div>
      {open && <div className="bg-ink p-4 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-ink p-5 lg:block">
        <p className="mb-1 text-xl font-black text-white">{storeName}</p>
        <p className="mb-6 text-xs text-neutral-400">لوحة التحكم</p>
        {nav}
      </aside>
    </>
  );
}
