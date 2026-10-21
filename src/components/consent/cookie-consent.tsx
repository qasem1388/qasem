"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_COOKIE, type AnalyticsConfig, type ConsentChoice } from "@/lib/analytics";

export const OPEN_CONSENT_EVENT = "consent:open";
const MAX_AGE = 60 * 60 * 24 * 180; // 6 months

function readChoice(): ConsentChoice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(granted|denied)`));
  return (m?.[1] as ConsentChoice | undefined) ?? null;
}

function writeChoice(choice: ConsentChoice) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** Removes cookies set by analytics tools (GA sets them on the registrable domain). */
function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (!/^_ga/.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
  }
}

let loaded = false;
function loadAnalytics({ ga4Id, plausibleDomain }: AnalyticsConfig) {
  if (loaded) return;
  loaded = true;
  if (ga4Id) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(s);
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() {
      // gtag.js expects the arguments object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("config", ga4Id, { anonymize_ip: true });
  }
  if (plausibleDomain) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://plausible.io/js/script.js";
    s.dataset.domain = plausibleDomain;
    document.head.appendChild(s);
  }
}

type Labels = { region: string; text: string; accept: string; reject: string; policy: string };

export function CookieConsent({ config, labels, policyHref }: { config: AnalyticsConfig; labels: Labels; policyHref: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const choice = readChoice();
    if (choice === "granted") loadAnalytics(config);
    // Deferred so the banner does not render during hydration.
    else if (choice === null) queueMicrotask(() => setOpen(true));
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, [config]);

  if (!open) return null;

  const decide = (choice: ConsentChoice) => {
    const previous = readChoice();
    writeChoice(choice);
    setOpen(false);
    if (choice === "granted") loadAnalytics(config);
    else if (previous === "granted" || loaded) {
      // Scripts already running cannot be unloaded; clear their cookies and reload clean.
      clearAnalyticsCookies();
      location.reload();
    }
  };

  return (
    <section
      role="region"
      aria-label={labels.region}
      className="rounded-brand-lg border-primary/10 fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl border bg-white p-4 shadow-xl sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <p className="text-ink/85 text-sm leading-7">
        {labels.text}{" "}
        <Link href={policyHref} className="text-accent font-semibold underline-offset-4 hover:underline">
          {labels.policy}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => decide("denied")}
          className="rounded-brand border-primary/20 text-primary hover:bg-surface h-10 border px-5 text-sm font-semibold"
        >
          {labels.reject}
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          className="rounded-brand bg-primary hover:bg-primary-900 h-10 px-5 text-sm font-semibold text-white"
        >
          {labels.accept}
        </button>
      </div>
    </section>
  );
}

export function ManageCookiesButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      {label}
    </button>
  );
}
