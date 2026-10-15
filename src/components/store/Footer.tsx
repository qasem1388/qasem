import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import { PaymentBadges } from "./PaymentBadges";
import { Newsletter } from "./Newsletter";

export function Footer({ s, categories }: { s: StoreSettings; categories: { slug: string; name: string }[] }) {
  const socials = [
    { href: s.instagram, label: "إنستقرام" },
    { href: s.snapchat, label: "سناب شات" },
    { href: s.tiktok, label: "تيك توك" },
    { href: s.x, label: "X" },
  ].filter((x) => x.href);

  return (
    <footer className="mt-20 bg-ink text-neutral-300">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="mb-3 text-2xl font-black text-white">{s.storeName}</p>
          <p className="mb-6 max-w-sm leading-7">{s.tagline}</p>
          <Newsletter />
        </div>
        <div>
          <p className="mb-4 font-extrabold text-white">التصنيفات</p>
          <ul className="space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.slug}><Link className="hover:text-white" href={`/category/${encodeURIComponent(c.slug)}`}>{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 font-extrabold text-white">خدمة العملاء</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/track">تتبع طلبك</Link></li>
            <li><Link className="hover:text-white" href="/pages/shipping">الشحن والتوصيل</Link></li>
            <li><Link className="hover:text-white" href="/pages/returns">الاستبدال والاسترجاع</Link></li>
            <li><Link className="hover:text-white" href="/pages/privacy">سياسة الخصوصية</Link></li>
            <li><Link className="hover:text-white" href="/pages/terms">الشروط والأحكام</Link></li>
            <li><Link className="hover:text-white" href="/pages/about">من نحن</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-4 font-extrabold text-white">تواصل معنا</p>
          <ul className="space-y-2.5 text-sm">
            <li><a className="hover:text-white" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener">واتساب: <span dir="ltr">+{s.whatsapp}</span></a></li>
            <li><a className="hover:text-white" href={`tel:${s.phone}`}>الهاتف: <span dir="ltr">{s.phone}</span></a></li>
            <li><a className="hover:text-white" href={`mailto:${s.email}`}>{s.email}</a></li>
            {socials.map((x) => (
              <li key={x.label}><a className="hover:text-white" href={x.href} target="_blank" rel="noopener">{x.label}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 text-xs md:flex-row">
          <p>© {new Date().getFullYear()} {s.storeName} — الرقم الضريبي {s.vatNumber} • السجل التجاري {s.crNumber}</p>
          <PaymentBadges compact />
        </div>
      </div>
    </footer>
  );
}
