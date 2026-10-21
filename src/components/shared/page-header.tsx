import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

/** Shared hero band for inner pages: title, intro and breadcrumbs. */
export function PageHeader({
  title,
  subtitle,
  crumbs,
  breadcrumbLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs: Crumb[];
  breadcrumbLabel: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-primary relative isolate overflow-hidden text-white">
      <div className="absolute inset-0 -z-20 bg-[url('/demo/page-header.svg')] bg-cover bg-center opacity-35" aria-hidden />
      <div className="from-primary/70 via-primary/80 to-primary absolute inset-0 -z-10 bg-gradient-to-b" aria-hidden />
      <div className="bg-pattern absolute inset-0 -z-10 opacity-30" aria-hidden />
      <div className="container-page py-14 sm:py-20">
        <Breadcrumbs items={crumbs} label={breadcrumbLabel} />
        <h1 className="mt-5 max-w-3xl text-3xl leading-tight font-bold text-balance sm:text-4xl lg:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{subtitle}</p>}
        {children}
      </div>
      <div
        className="from-secondary via-secondary/50 absolute inset-x-0 bottom-0 h-1 bg-gradient-to-l to-transparent"
        aria-hidden
      />
    </section>
  );
}
