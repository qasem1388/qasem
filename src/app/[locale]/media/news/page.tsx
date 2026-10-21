import { KindPage, kindMetadata } from "@/components/media/kind-page";

export function generateMetadata({ params }: PageProps<"/[locale]/media/news">) {
  return kindMetadata(params, "news");
}

export default function NewsPage({ params }: PageProps<"/[locale]/media/news">) {
  return <KindPage params={params} section="news" />;
}
