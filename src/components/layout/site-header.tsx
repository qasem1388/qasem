"use client";

import { ChevronDown, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ResolvedNavItem = {
  id: string;
  label: string;
  href: string;
  children?: ResolvedNavItem[];
};

type Labels = { open: string; close: string; main: string; call: string };

function isActive(pathname: string, href: string, homeHref: string) {
  if (href.includes("#")) return false;
  if (href === homeHref) return pathname === homeHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({
  logo,
  items,
  homeHref,
  cta,
  phone,
  labels,
  languageSwitcher,
}: {
  logo: ReactNode;
  items: ResolvedNavItem[];
  homeHref: string;
  cta: { label: string; href: string };
  phone: string;
  labels: Labels;
  languageSwitcher: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow duration-300 supports-[backdrop-filter]:bg-white/85",
          scrolled ? "border-transparent shadow-[0_8px_30px_-12px_rgb(11_31_58/0.25)]" : "border-primary/5",
        )}
      >
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
          {logo}

          <nav aria-label={labels.main} className="hidden xl:block">
            <ul className="flex items-center gap-0.5">
              {items.map((item) => {
                const active =
                  isActive(pathname, item.href, homeHref) || !!item.children?.some((c) => isActive(pathname, c.href, homeHref));
                return (
                  <li key={item.id} className="group relative">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-[0.92rem] font-medium whitespace-nowrap transition-colors 2xl:px-3",
                        "after:bg-secondary after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:transition-transform",
                        "hover:text-primary hover:after:scale-x-100",
                        active ? "text-primary after:scale-x-100" : "text-ink/75",
                      )}
                    >
                      {item.label}
                      {item.children && (
                        <ChevronDown className="size-3.5 opacity-60 transition-transform group-hover:rotate-180" aria-hidden />
                      )}
                    </Link>
                    {item.children && (
                      <div className="invisible absolute start-0 top-full z-50 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                        <ul className="rounded-brand border-primary/5 shadow-primary/10 min-w-56 border bg-white p-2 shadow-xl">
                          {item.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={child.href}
                                className="text-ink/80 hover:bg-primary-50 hover:text-primary block rounded-md px-3 py-2.5 text-sm transition-colors"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <Link href={cta.href} className={buttonClasses("secondary", "sm")}>
                {cta.label}
              </Link>
            </div>
            <a
              href={`tel:${phone}`}
              aria-label={labels.call}
              className="rounded-brand border-primary/10 text-primary inline-flex size-11 items-center justify-center border sm:hidden"
            >
              <Phone className="size-5" aria-hidden />
            </a>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={labels.open}
              className="rounded-brand bg-primary inline-flex size-11 items-center justify-center text-white xl:hidden"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — kept outside <header>: its backdrop-filter would trap `position: fixed`. */}
      <div
        className={cn("fixed inset-0 z-50 overflow-hidden xl:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={cn(
            "bg-primary/60 absolute inset-0 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={close}
        />
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={labels.main}
          className={cn(
            "absolute inset-y-0 start-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
          )}
        >
          <div className="border-primary/5 flex h-[4.5rem] items-center justify-between border-b px-4">
            {logo}
            <button
              type="button"
              onClick={close}
              aria-label={labels.close}
              className="rounded-brand text-primary hover:bg-primary-50 inline-flex size-11 shrink-0 items-center justify-center"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label={labels.main} className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, item.href, homeHref) ? "page" : undefined}
                      className="text-ink/85 hover:bg-primary-50 aria-[current=page]:bg-primary-50 aria-[current=page]:text-primary flex-1 rounded-md px-3 py-3 font-medium"
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        aria-expanded={expanded === item.id}
                        aria-controls={`sub-${item.id}`}
                        aria-label={item.label}
                        className="text-muted hover:bg-primary-50 inline-flex size-11 items-center justify-center rounded-md"
                      >
                        <ChevronDown
                          className={cn("size-4 transition-transform", expanded === item.id && "rotate-180")}
                          aria-hidden
                        />
                      </button>
                    )}
                  </div>
                  {item.children && expanded === item.id && (
                    <ul id={`sub-${item.id}`} className="border-secondary/40 ms-3 mt-1 space-y-1 border-s-2 ps-3">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="text-ink/75 hover:bg-primary-50 hover:text-primary block rounded-md px-3 py-2.5 text-sm"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-primary/5 space-y-3 border-t p-4">
            <Link href={cta.href} onClick={() => setOpen(false)} className={buttonClasses("primary", "md", "w-full")}>
              {cta.label}
            </Link>
            <div className="text-primary flex items-center justify-between text-sm">
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2 font-medium">
                <Phone className="size-4" aria-hidden />
                {labels.call}
              </a>
              {languageSwitcher}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
