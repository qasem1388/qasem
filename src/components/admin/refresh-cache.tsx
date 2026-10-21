"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { refreshSiteCache } from "@/app/admin/actions/settings";

export function RefreshCacheButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMessage((await refreshSiteCache()).message ?? ""))}
        className="rounded-brand border-primary/20 text-primary hover:bg-surface inline-flex h-10 items-center gap-2 border px-4 text-sm font-semibold disabled:opacity-60"
      >
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
        تحديث صفحات الموقع
      </button>
      <p role="status" className="text-sm text-emerald-700">
        {message}
      </p>
    </div>
  );
}
