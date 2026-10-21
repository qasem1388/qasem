import { Briefcase, Calendar, CircleCheck, Clock, GraduationCap, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/forms/application-form";
import { PageHeader } from "@/components/shared/page-header";
import { getJob, getJobs, getSiteSettings } from "@/lib/content";
import { pageContext, trail } from "@/lib/page";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { formatDate, tr } from "@/lib/utils";

export async function generateStaticParams() {
  const jobs = await getJobs();
  return jobs.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/careers/[slug]">) {
  const { locale } = await pageContext(params);
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return {};
  return pageMetadata({ locale, path: `/careers/${slug}`, title: tr(job.title, locale), description: tr(job.summary, locale) });
}

const employmentType = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
} as const;

export default async function JobPage({ params }: PageProps<"/[locale]/careers/[slug]">) {
  const { locale, dict } = await pageContext(params);
  const { slug } = await params;
  const [job, settings] = await Promise.all([getJob(slug), getSiteSettings()]);
  if (!job) notFound();

  const title = tr(job.title, locale);
  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description: [tr(job.summary, locale), ...job.responsibilities.map((r) => tr(r, locale))].join(" "),
    datePosted: job.postedAt,
    employmentType: employmentType[job.type],
    hiringOrganization: { "@type": "Organization", name: tr(settings.name, locale) },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: tr(job.location, locale), addressCountry: "SA" },
    },
  };
  const facts = [
    { icon: Briefcase, label: dict.careers.department, value: tr(job.department, locale) },
    { icon: MapPin, label: dict.careers.location, value: tr(job.location, locale) },
    { icon: Clock, label: dict.careers.type, value: dict.careers.types[job.type] },
    { icon: GraduationCap, label: dict.careers.experience, value: tr(job.experience, locale) },
    { icon: Calendar, label: dict.careers.posted, value: formatDate(job.postedAt, locale) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <PageHeader
        title={title}
        subtitle={tr(job.summary, locale)}
        crumbs={trail(locale, { label: dict.pages.careers.title, href: "/careers" }, { label: title })}
        breadcrumbLabel={dict.breadcrumbHome}
      >
        <a
          href="#apply"
          className="rounded-brand bg-secondary text-primary hover:bg-secondary-700 mt-8 inline-flex h-12 items-center px-6 font-semibold hover:text-white"
        >
          {dict.careers.apply}
        </a>
      </PageHeader>

      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:py-20 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          {(
            [
              [dict.careers.responsibilities, job.responsibilities],
              [dict.careers.requirements, job.requirements],
            ] as const
          ).map(([heading, items]) => (
            <section key={heading}>
              <h2 className="text-primary text-2xl font-bold">{heading}</h2>
              <ul className="mt-6 space-y-3">
                {items.map((i) => (
                  <li key={i.en} className="text-ink/80 flex gap-3 leading-7">
                    <CircleCheck className="text-secondary-700 mt-1 size-5 shrink-0" aria-hidden />
                    {tr(i, locale)}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section
            id="apply"
            aria-labelledby="apply-title"
            className="rounded-brand-lg border-primary/8 shadow-primary/5 border bg-white p-6 shadow-xl sm:p-8"
          >
            <h2 id="apply-title" className="text-primary mb-6 text-2xl font-bold">
              {dict.careers.applyTitle}
            </h2>
            <ApplicationForm dict={dict} job={job.slug} />
          </section>
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ul className="divide-primary/8 rounded-brand-lg border-primary/8 divide-y border bg-white">
            {facts.map(({ icon: I, ...f }) => (
              <li key={f.label} className="flex items-center gap-4 p-5">
                <span className="rounded-brand bg-primary-50 text-primary inline-flex size-11 shrink-0 items-center justify-center">
                  <I className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-muted text-sm">{f.label}</p>
                  <p className="text-primary font-semibold">{f.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
