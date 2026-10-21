import { CircleCheck, Mail } from "lucide-react";
import { JobCard } from "@/components/cards/job-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { getJobs, getSiteSettings } from "@/lib/content";
import { pageContext, requireSection, trail } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";
import { localizeHref, tr } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/careers">) {
  const { locale, dict } = await pageContext(params);
  return pageMetadata({ locale, path: "/careers", title: dict.pages.careers.title, description: dict.pages.careers.subtitle });
}

export default async function CareersPage({ params }: PageProps<"/[locale]/careers">) {
  const { locale, dict } = await pageContext(params);
  await requireSection("careers");
  const [jobs, settings] = await Promise.all([getJobs(), getSiteSettings()]);
  return (
    <>
      <PageHeader
        title={dict.pages.careers.title}
        subtitle={dict.pages.careers.subtitle}
        crumbs={trail(locale, { label: dict.pages.careers.title })}
        breadcrumbLabel={dict.breadcrumbHome}
      />
      <section aria-labelledby="why-title" className="bg-surface py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading id="why-title" title={dict.careers.why} />
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.careers.perks.map((p) => (
              <li key={p} className="rounded-brand-lg text-primary flex items-center gap-3 bg-white p-5 font-medium" data-reveal>
                <CircleCheck className="text-secondary-700 size-6 shrink-0" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="jobs-title" className="py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading id="jobs-title" title={dict.careers.openings} />
          {jobs.length ? (
            <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {jobs.map((j) => (
                <li key={j.slug} data-reveal>
                  <JobCard
                    href={localizeHref(`/careers/${j.slug}`, locale)}
                    title={tr(j.title, locale)}
                    department={tr(j.department, locale)}
                    location={tr(j.location, locale)}
                    type={dict.careers.types[j.type]}
                    summary={tr(j.summary, locale)}
                    cta={dict.careers.viewDetails}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-brand-lg bg-surface text-muted mt-10 p-10 text-center">{dict.careers.noJobs}</p>
          )}
          <p className="text-muted mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-sm">
            <Mail className="size-4" aria-hidden />
            {dict.careers.generalCv}
            <a
              href={`mailto:${settings.contact.email}`}
              className="text-primary decoration-secondary font-semibold underline underline-offset-4"
            >
              {settings.contact.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
