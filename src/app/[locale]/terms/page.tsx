import { LegalPage, legalMetadata } from "@/components/shared/legal-page";

export function generateMetadata({ params }: PageProps<"/[locale]/terms">) {
  return legalMetadata(params, "terms");
}

export default function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage params={params} slug="terms" />;
}
