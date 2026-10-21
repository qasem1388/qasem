"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type MapBranch = { id: string; name: string; lat: number; lng: number };

function embedUrl({ lat, lng }: MapBranch) {
  const d = 0.008;
  const bbox = [lng - d, lat - d / 1.6, lng + d, lat + d / 1.6].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/** OpenStreetMap embed (no API key, no tracking cookies) with a branch switcher. */
export function BranchMap({ branches, title, openLabel }: { branches: MapBranch[]; title: string; openLabel: string }) {
  const [active, setActive] = useState(branches[0]);
  if (!active) return null;
  return (
    <div className="rounded-brand-lg border-primary/8 overflow-hidden border bg-white">
      {branches.length > 1 && (
        <div role="group" aria-label={title} className="border-primary/8 flex flex-wrap gap-2 border-b p-3">
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.id === active.id}
              onClick={() => setActive(b)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                b.id === active.id ? "bg-primary text-white" : "bg-primary-50 text-primary hover:bg-primary-100",
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
      <iframe
        key={active.id}
        src={embedUrl(active)}
        title={`${title} — ${active.name}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="bg-surface block h-80 w-full sm:h-[26rem]"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${active.lat}&mlon=${active.lng}#map=16/${active.lat}/${active.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:bg-primary-50 border-primary/8 block border-t p-3 text-center text-sm font-semibold"
      >
        {openLabel}
      </a>
    </div>
  );
}
