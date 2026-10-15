import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProductBySlug, listProducts } from "@/lib/catalog";
import { deliveryWindow } from "@/lib/delivery";
import { formatDate } from "@/lib/format";
import { getSettings, siteUrl } from "@/lib/settings";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ReviewForm } from "@/components/product/ReviewForm";
import { ProductsByIds } from "@/components/product/RecentlyViewed";
import { ProductRail } from "@/components/store/ProductRail";
import { JsonLd } from "@/components/store/JsonLd";
import { Stars } from "@/components/store/Stars";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug(decodeURIComponent((await params).slug));
  if (!p) return {};
  const title = p.seoTitle || p.titles.seo || p.name;
  const description = p.seoDescription || p.shortDescription || p.description.slice(0, 160);
  const url = `/product/${encodeURIComponent(p.slug)}`;
  return {
    title,
    description,
    keywords: p.keywords,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, images: p.images.slice(0, 4).map((src) => ({ url: src, alt: p.name })) },
    twitter: { card: "summary_large_image", title, description, images: p.images[0] ? [p.images[0]] : undefined },
    other: { "product:price:amount": String(p.price), "product:price:currency": "SAR" },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await getProductBySlug(decodeURIComponent((await params).slug));
  if (!p) notFound();
  const [s, reviews, related] = await Promise.all([
    getSettings(),
    prisma.review.findMany({ where: { productId: p.id, approved: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    listProducts({ where: { id: { not: p.id }, category: p.category ? { slug: p.category.slug } : undefined }, orderBy: { salesCount: "desc" }, take: 10 }),
  ]);
  prisma.product.update({ where: { id: p.id }, data: { viewCount: { increment: 1 } } }).catch(() => null);

  const win = deliveryWindow();
  const url = `${siteUrl()}/product/${encodeURIComponent(p.slug)}`;
  const abs = (src: string) => (src.startsWith("http") ? src : `${siteUrl()}${src}`);
  const inStock = p.variants.length ? p.variants.some((v) => v.stock > 0) : p.stock > 0;
  const priceValidUntil = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  const offers = p.variants.length
    ? p.variants.map((v) => ({
        "@type": "Offer",
        sku: v.id,
        name: `${p.name} - ${v.colorName}`,
        price: v.price ?? p.price,
        priceCurrency: "SAR",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url,
        priceValidUntil,
      }))
    : [{ "@type": "Offer", price: p.price, priceCurrency: "SAR", availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url, priceValidUntil }];

  return (
    <div className="container py-6 pb-28 lg:pb-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              name: p.name,
              description: p.seoDescription || p.shortDescription || p.description,
              image: p.images.map(abs),
              sku: p.sku || p.id,
              brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
              category: p.category?.name,
              color: p.variants.map((v) => v.colorName).join(", ") || undefined,
              offers: offers.map((o) => ({
                ...o,
                shippingDetails: {
                  "@type": "OfferShippingDetails",
                  shippingDestination: { "@type": "DefinedRegion", addressCountry: "SA" },
                  deliveryTime: {
                    "@type": "ShippingDeliveryTime",
                    handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
                    transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" },
                  },
                },
                hasMerchantReturnPolicy: {
                  "@type": "MerchantReturnPolicy",
                  applicableCountry: "SA",
                  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                  merchantReturnDays: 7,
                },
              })),
              aggregateRating: p.ratingCount ? { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } : undefined,
              review: reviews.slice(0, 5).map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.name },
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                reviewBody: r.comment,
                datePublished: r.createdAt.toISOString().slice(0, 10),
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl() },
                ...(p.category ? [{ "@type": "ListItem", position: 2, name: p.category.name, item: `${siteUrl()}/category/${encodeURIComponent(p.category.slug)}` }] : []),
                { "@type": "ListItem", position: p.category ? 3 : 2, name: p.name, item: url },
              ],
            },
          ],
        }}
      />

      <nav className="mb-5 text-sm text-neutral-500" aria-label="مسار التنقل">
        <Link href="/">الرئيسية</Link>
        {p.category && <> / <Link href={`/category/${encodeURIComponent(p.category.slug)}`}>{p.category.name}</Link></>}
        {" / "}<span className="text-neutral-800">{p.titles.short || p.name}</span>
      </nav>

      <ProductDetail
        p={p}
        whatsapp={s.whatsapp}
        delivery={{ from: formatDate(win.from), to: formatDate(win.to) }}
        freeShippingThreshold={Number(s.freeShippingThreshold) || 0}
      />

      <section className="mt-14 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-2xl font-extrabold">وصف المنتج</h2>
          <div className="prose-ar">{p.description}</div>
          {p.titles.emotional && <p className="mt-6 rounded-2xl bg-brand-50 p-5 font-bold text-brand-800">{p.titles.emotional}</p>}
        </div>
        <aside className="space-y-4">
          <div className="card p-5 text-sm leading-7">
            <h3 className="mb-2 font-extrabold">الشحن والتوصيل</h3>
            <p>التوصيل خلال 2-5 أيام عمل لجميع مدن المملكة عبر سمسا وأرامكس، مع رقم تتبع يصلك فور شحن الطلب.</p>
          </div>
          <div className="card p-5 text-sm leading-7">
            <h3 className="mb-2 font-extrabold">طرق الدفع</h3>
            <p>مدى • فيزا • ماستركارد • Apple Pay • STC Pay عبر ميسر، التقسيط مع تمارا وتابي، أو الدفع عند الاستلام.</p>
          </div>
        </aside>
      </section>

      <section id="reviews" className="mt-14 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <h2 className="text-2xl font-extrabold">تقييمات العملاء</h2>
          {p.ratingCount > 0 && <span className="flex items-center gap-2"><Stars value={p.ratingAvg} /> <b>{p.ratingAvg.toFixed(1)}</b> من 5 ({p.ratingCount})</span>}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {reviews.length === 0 && <p className="text-neutral-500">لا توجد تقييمات بعد — كن أول من يقيّم هذا المنتج.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-bold">{r.name} {r.city && <span className="text-sm font-normal text-neutral-500">— {r.city}</span>} {r.verified && <span className="badge ms-1 bg-brand-50 text-brand-700">مشتري موثّق</span>}</p>
                  <Stars value={r.rating} />
                </div>
                <p className="leading-7 text-neutral-700">{r.comment}</p>
              </div>
            ))}
          </div>
          <ReviewForm productId={p.id} />
        </div>
      </section>

      <div className="-mx-4 md:mx-0">
        <ProductRail title="منتجات مشابهة" products={related} />
      </div>
      <ProductsByIds title="شاهدتها مؤخراً" excludeId={p.id} />
    </div>
  );
}
