import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-primary text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="text-muted mt-2 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-brand-lg border-primary/8 border bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="border-primary/8 flex items-center justify-between gap-4 border-b px-5 py-4">
          {title && <h2 className="text-primary font-bold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  gold: "bg-secondary-50 text-secondary-700",
  blue: "bg-primary-50 text-primary",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  return (
    <div className="rounded-brand-lg border-primary/8 overflow-x-auto border bg-white">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-surface text-muted text-xs">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 text-start font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-primary/5 divide-y">{children}</tbody>
      </table>
      {empty && <p className="text-muted p-8 text-center">{empty}</p>}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
