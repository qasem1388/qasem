import { KindPage, kindMetadata } from "@/components/media/kind-page";

export function generateMetadata({ params }: PageProps<"/[locale]/media/articles">) {
  return kindMetadata(params, "articles");
}

export default function ArticlesPage({ params }: PageProps<"/[locale]/media/articles">) {
  return <KindPage params={params} section="articles" />;
}
