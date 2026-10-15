import Script from "next/script";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { CartDrawer } from "@/components/store/CartDrawer";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { SocialProof } from "@/components/store/SocialProof";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { JsonLd } from "@/components/store/JsonLd";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function recentPurchases() {
  const items = await prisma.orderItem.findMany({
    where: { order: { status: { notIn: ["cancelled", "refunded", "pending"] } } },
    orderBy: { order: { createdAt: "desc" } },
    take: 12,
    include: { order: { select: { name: true, city: true, createdAt: true } } },
  });
  return items.map((i) => ({
    name: i.order.name.split(" ")[0],
    city: i.order.city,
    product: i.name,
    image: i.image,
    minutesAgo: Math.max(1, Math.round((Date.now() - i.order.createdAt.getTime()) / 60000)),
  }));
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [s, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  // معرّفات البكسل تُدرج داخل سكربت، لذا نسمح فقط بالأحرف الآمنة
  for (const k of ["googleAnalyticsId", "metaPixelId", "snapPixelId", "tiktokPixelId"] as const) s[k] = s[k].replace(/[^\w-]/g, "");
  const proof = s.socialProofEnabled === "true" ? await recentPurchases() : [];
  const url = siteUrl();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${url}/#org`,
              name: s.storeName,
              url,
              contactPoint: { "@type": "ContactPoint", telephone: `+${s.whatsapp}`, contactType: "customer service", areaServed: "SA", availableLanguage: ["Arabic", "English"] },
              sameAs: [s.instagram, s.snapchat, s.tiktok, s.x].filter(Boolean),
            },
            {
              "@type": "WebSite",
              "@id": `${url}/#website`,
              url,
              name: s.storeName,
              inLanguage: "ar-SA",
              potentialAction: { "@type": "SearchAction", target: `${url}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
            },
          ],
        }}
      />
      <AnnouncementBar text={s.announcement} />
      <Header storeName={s.storeName} logoText={s.logoText} categories={categories} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer s={s} categories={categories} />
      <CartDrawer freeShippingThreshold={Number(s.freeShippingThreshold) || 0} />
      <WhatsAppButton number={s.whatsapp} />
      {proof.length > 0 && <SocialProof items={proof} />}

      {s.googleAnalyticsId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${s.googleAnalyticsId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.googleAnalyticsId}');`}</Script>
        </>
      )}
      {s.metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.metaPixelId}');fbq('track','PageView');`}</Script>
      )}
      {s.snapPixelId && (
        <Script id="snap-pixel" strategy="afterInteractive">{`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${s.snapPixelId}',{});snaptr('track','PAGE_VIEW');`}</Script>
      )}
      {s.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;var o=document.createElement("script");o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${s.tiktokPixelId}');ttq.page();}(window,document,'ttq');`}</Script>
      )}
    </>
  );
}
