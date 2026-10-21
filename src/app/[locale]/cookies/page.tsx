import { LegalPage, legalMetadata } from "@/components/shared/legal-page";

export function generateMetadata({ params }: PageProps<"/[locale]/cookies">) {
  return legalMetadata(params, "cookies");
}

export default function CookiesPage({ params }: PageProps<"/[locale]/cookies">) {
  return <LegalPage params={params} slug="cookies" />;
}
