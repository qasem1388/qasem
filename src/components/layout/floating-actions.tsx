"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

export function FloatingActions({
  whatsappHref,
  whatsappLabel,
  backToTopLabel,
}: {
  whatsappHref: string;
  whatsappLabel: string;
  backToTopLabel: string;
}) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed end-4 bottom-5 z-30 flex flex-col items-center gap-3 sm:end-6">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0 })}
        aria-label={backToTopLabel}
        tabIndex={showTop ? 0 : -1}
        className={cn(
          "bg-primary hover:bg-primary-900 inline-flex size-11 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp className="size-5" aria-hidden />
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={whatsappLabel}
        className="group relative inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="relative size-7" />
      </a>
    </div>
  );
}
