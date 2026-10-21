import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPage } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { formatDate, tr } from "@/lib/utils";
import type { LegalPage as LegalPageData } from "@/types/content";
import { PageHeader } from "./page-header";
import { Prose } from "./prose";

type Slug = LegalPageData["slug"];

export async function legalMetadata(params: Promise<{ locale: string }>, slug: Slug): Promise<Metadata> {
  const { locale } = await pageContext(params);
  const page = await getLegalPage(slug);
  return page ? pageMetadata({ locale, path: `/${slug}`, title: tr(page.title, locale) }) : {};
}

export async function LegalPage({ params, slug }: { params: Promise<{ locale: string }>; slug: Slug }) {
  const { locale, dict } = await pageContext(params);
  const page = await getLegalPage(slug);
  if (!page) notFound();
  const title = tr(page.title, locale);
  return (
    <>
      <PageHeader title={title} crumbs={trail(locale, { label: title })} breadcrumbLabel={dict.breadcrumbHome}>
        <p className="mt-4 text-sm text-white/70">
          {dict.legal.updated}: <time dateTime={page.updatedAt}>{formatDate(page.updatedAt, locale)}</time>
        </p>
      </PageHeader>
      <section className="py-14 sm:py-16">
        <div className="container-page max-w-3xl">
          <Prose text={tr(page.body, locale)} />
        </div>
      </section>
    </>
  );
}
