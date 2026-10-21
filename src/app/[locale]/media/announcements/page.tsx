import { KindPage, kindMetadata } from "@/components/media/kind-page";

export function generateMetadata({ params }: PageProps<"/[locale]/media/announcements">) {
  return kindMetadata(params, "announcements");
}

export default function AnnouncementsPage({ params }: PageProps<"/[locale]/media/announcements">) {
  return <KindPage params={params} section="announcements" />;
}
