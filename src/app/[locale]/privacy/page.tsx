import { LegalPage, legalMetadata } from "@/components/shared/legal-page";

export function generateMetadata({ params }: PageProps<"/[locale]/privacy">) {
  return legalMetadata(params, "privacy");
}

export default function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  return <LegalPage params={params} slug="privacy" />;
}
