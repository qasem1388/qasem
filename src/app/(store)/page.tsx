import Link from "next/link";
import { prisma } from "@/lib/db";
import { listProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { HeroSlider } from "@/components/store/HeroSlider";
import { ProductRail } from "@/components/store/ProductRail";
import { TrustBar } from "@/components/store/TrustBar";
import { Countdown } from "@/components/store/Countdown";
import { Stars } from "@/components/store/Stars";
import { PaymentBadges } from "@/components/store/PaymentBadges";

export default async function HomePage() {
  const [s, banners, categories, featured, newest, bestsellers, deals, reviews] = await Promise.all([
    getSettings(),
    prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } }),
    listProducts({ where: { featured: true }, take: 10 }),
    listProducts({ orderBy: { createdAt: "desc" }, take: 10 }),
    listProducts({ orderBy: { salesCount: "desc" }, take: 10 }),
    listProducts({ where: { compareAtPrice: { not: null } }, orderBy: { salesCount: "desc" }, take: 10 }),
    prisma.review.findMany({ where: { approved: true, rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: 6, include: { product: { select: { name: true } } } }),
  ]);

  const hero = banners.filter((b) => b.position === "hero");
  const catBanners = banners.filter((b) => b.position === "category");
  const promos = banners.filter((b) => b.position === "promo");
  const flashEnds = s.flashSaleEndsAt && new Date(s.flashSaleEndsAt) > new Date() ? s.flashSaleEndsAt : "";

  return (
    <>
      <HeroSlider slides={hero} />
      <TrustBar />

      {/* التصنيفات الدائرية */}
      <section className="container mt-12">
        <h2 className="section-title mb-6">تسوّق حسب التصنيف</h2>
        <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:px-0">
          {categories.map((c) => (
            <Link key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} className="group flex w-24 shrink-0 flex-col items-center gap-2 md:w-auto">
              <span className="aspect-square w-full overflow-hidden rounded-full bg-neutral-100 ring-2 ring-transparent ring-offset-2 transition group-hover:ring-brand-500">
                {c.image && <img src={c.image} alt={c.name} className="h-full w-full object-cover transition group-hover:scale-110" loading="lazy" />}
              </span>
              <span className="text-center text-sm font-bold">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail title="منتجات مميزة" subtitle="اختياراتنا لك هذا الأسبوع" products={featured} href="/search?sort=bestselling" />

      {/* بنرات التصنيفات */}
      {catBanners.length > 0 && (
        <section className="container mt-14 grid gap-4 md:grid-cols-2">
          {catBanners.slice(0, 4).map((b, i) => (
            <Link key={b.id} href={b.link} className={`group relative overflow-hidden rounded-3xl bg-neutral-100 ${i === 0 && catBanners.length === 3 ? "md:row-span-2" : ""}`}>
              <img src={b.image} alt={b.title} className="aspect-[16/10] h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white">
                {b.subtitle && <p className="text-sm opacity-90">{b.subtitle}</p>}
                <p className="mb-3 text-2xl font-black">{b.title}</p>
                <span className="inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-ink">{b.buttonText}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* عرض محدود بعداد تنازلي */}
      {deals.length > 0 && (
        <section className="container mt-14">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-l from-red-600 to-rose-500 p-6 text-white md:p-10">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-1 text-sm font-bold opacity-90">⚡ عروض لفترة محدودة</p>
                <h2 className="text-3xl font-black">تخفيضات قوية… الكمية محدودة</h2>
              </div>
              {flashEnds && <Countdown endsAt={flashEnds} />}
            </div>
            <div className="no-scrollbar -mx-2 flex gap-3 overflow-x-auto px-2">
              {deals.map((p) => {
                const off = p.compareAtPrice ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
                return (
                  <Link key={p.id} href={`/product/${encodeURIComponent(p.slug)}`} className="w-44 shrink-0 rounded-2xl bg-white p-2 text-ink md:w-52">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                      {p.images[0] && <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                      <span className="badge absolute start-2 top-2 bg-red-500 text-white">-{off}%</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-bold">{p.titles.short || p.name}</p>
                    <p className="text-sm"><b>{p.price} ر.س</b> <s className="text-xs text-neutral-400">{p.compareAtPrice}</s></p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <ProductRail title="الأكثر مبيعاً" subtitle="المنتجات اللي يحبها عملاؤنا" products={bestsellers} href="/search?sort=bestselling" />

      {promos.length > 0 && (
        <section className="container mt-14">
          {promos.slice(0, 1).map((b) => (
            <Link key={b.id} href={b.link} className="group relative block overflow-hidden rounded-3xl">
              <img src={b.image} alt={b.title} className="aspect-[21/7] w-full object-cover max-md:aspect-[16/9]" loading="lazy" />
              <div className="absolute inset-0 flex items-center bg-gradient-to-l from-black/60 to-transparent p-8 md:p-14">
                <div className="text-white">
                  <p className="mb-2 font-bold opacity-90">{b.subtitle}</p>
                  <p className="mb-5 text-3xl font-black md:text-5xl">{b.title}</p>
                  <span className="btn bg-white text-ink">{b.buttonText}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      <ProductRail title="وصل حديثاً" subtitle="أحدث المنتجات في المتجر" products={newest} href="/search?sort=newest" />

      {/* التقسيط */}
      <section className="container mt-14">
        <div className="grid items-center gap-6 rounded-3xl bg-neutral-50 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="section-title mb-3">اشترِ الآن وادفع لاحقاً</h2>
            <p className="mb-5 leading-8 text-neutral-600">قسّم مشترياتك على 4 دفعات بدون فوائد مع تمارا وتابي، أو ادفع بمدى وApple Pay عبر ميسر، أو ادفع نقداً عند الاستلام. التوصيل خلال 2-5 أيام عمل لجميع مدن المملكة.</p>
            <PaymentBadges />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["4 دفعات", "بدون فوائد أو رسوم"],
              ["2-5 أيام", "توصيل لكل المدن"],
              ["سمسا وأرامكس", "شحن موثوق ومتتبع"],
              ["الدفع عند الاستلام", "ادفع لما يوصلك"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-lg font-black text-brand-700">{a}</p>
                <p className="text-xs text-neutral-500">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* آراء العملاء */}
      {reviews.length > 0 && (
        <section className="container mt-14">
          <h2 className="section-title mb-6">ماذا يقول عملاؤنا</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.slice(0, 3).map((r) => (
              <figure key={r.id} className="card p-6">
                <Stars value={r.rating} />
                <blockquote className="my-3 leading-7 text-neutral-700">“{r.comment}”</blockquote>
                <figcaption className="text-sm">
                  <b>{r.name}</b> {r.city && <span className="text-neutral-500">— {r.city}</span>}
                  <p className="text-xs text-neutral-400">اشترى: {r.product.name}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
