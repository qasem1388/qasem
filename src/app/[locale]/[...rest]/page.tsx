import { staticParams } from "@/lib/static-params";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { RichContent } from "@/components/shared/rich-content";
import { getCustomPage, getCustomPageSlugs } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { formatDate, tr } from "@/lib/utils";

/**
 * Custom pages created in the admin panel live at /{locale}/{slug}.
 * Any other unknown path renders the localized 404 page.
 */
export function generateStaticParams() {
  return staticParams(async () => (await getCustomPageSlugs()).map((slug) => ({ rest: [slug] })));
}

async function load(params: Promise<{ locale: string; rest: string[] }>) {
  const { rest } = await params;
  return rest.length === 1 ? getCustomPage(decodeURIComponent(rest[0])) : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[...rest]">) {
  const { locale } = await pageContext(params);
  const page = await load(params);
  if (!page) return {};
  return pageMetadata({
    locale,
    path: `/${page.slug}`,
    title: tr(page.title, locale),
    description: page.seoDescription ? tr(page.seoDescription, locale) : undefined,
  });
}

export default async function CustomPage({ params }: PageProps<"/[locale]/[...rest]">) {
  const { locale, dict } = await pageContext(params);
  const page = await load(params);
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
          <RichContent value={tr(page.body, locale)} />
        </div>
      </section>
    </>
  );
}
