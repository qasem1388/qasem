import Image from "next/image";
import { SectionHeading } from "@/components/ui/section-heading";
import { getClients } from "@/lib/content";
import { tr } from "@/lib/utils";
import type { SectionProps } from "./types";

export async function ClientsSection({ locale, home }: SectionProps) {
  const clients = await getClients();
  return (
    <section aria-labelledby="clients-title" className="border-primary/5 border-b py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading id="clients-title" eyebrow={tr(home.clients.eyebrow, locale)} title={tr(home.clients.title, locale)} />
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4" data-reveal>
          {clients.map((c) => (
            <li
              key={c.id}
              className="rounded-brand border-primary/8 hover:border-secondary/50 flex h-24 items-center justify-center border bg-white px-6 grayscale transition-all duration-300 hover:shadow-md hover:grayscale-0 sm:h-28"
            >
              <Image
                src={c.logo}
                alt={tr(c.name, locale)}
                width={180}
                height={60}
                className="h-10 w-auto opacity-70 transition-opacity hover:opacity-100 sm:h-12"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
