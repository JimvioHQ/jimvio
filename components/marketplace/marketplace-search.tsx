"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Merge query params; reset to page 1 unless `updates` includes a `page` key. */
export function marketplaceHref(
  current: Record<string, string | undefined>,
  updates: Record<string, string | undefined | null>,
): string {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) {
    if (v != null && v !== "") out[k] = v;
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "") delete out[k];
    else out[k] = v;
  }

  const pageExplicit = Object.prototype.hasOwnProperty.call(updates, "page");
  if (!pageExplicit) out.page = "1";
  else if (updates.page === null || updates.page === "") delete out.page;

  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(out)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `/marketplace?${s}` : "/marketplace";
}

export function MarketplaceSearch({
  currentParams,
  className,
}: {
  currentParams: Record<string, string | undefined>;
  className?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? "");

  useEffect(() => {
    setQ(currentParams.q ?? "");
  }, [currentParams.q]);

  return (
    <form
      className={cn("relative flex-1 min-w-[200px] max-w-xl", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        const href = marketplaceHref(currentParams, { q: term || null });
        router.push(href);
      }}
    >
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none" />
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        autoComplete="off"
        className="w-full h-11 sm:h-12 pl-10 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/25 focus:border-[var(--color-accent)]"
      />
    </form>
  );
}
