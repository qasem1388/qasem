import { KindPage, kindMetadata } from "@/components/media/kind-page";

export function generateMetadata({ params }: PageProps<"/[locale]/media/events">) {
  return kindMetadata(params, "events");
}

export default function EventsPage({ params }: PageProps<"/[locale]/media/events">) {
  return <KindPage params={params} section="events" />;
}
