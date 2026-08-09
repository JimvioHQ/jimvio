"use client";

import { Command, Search } from "lucide-react";
import { OS_SEARCH_CATEGORIES } from "@/lib/jimvio-os";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import type { CommandCenterFilter } from "@/lib/store/use-command-center-store";

const FILTER_MAP: Partial<Record<(typeof OS_SEARCH_CATEGORIES)[number]["id"], CommandCenterFilter>> = {
  products: "products",
  communities: "communities",
  campaigns: "campaigns",
  ai: "ai",
};

export function OsSearchBridge() {
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => openCommandCenter()}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2.5 text-left transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        style={{ willChange: "transform" }}
      >
        <Search className="size-4 text-[var(--color-text-muted)]" />
        <span className="flex-1 text-[13px] text-[var(--color-text-muted)]">
          Search or jump — products, orders, communities, AI…
        </span>
        <kbd className="hidden items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] sm:inline-flex">
          <Command className="size-3" />K
        </kbd>
      </button>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Search categories">
        {OS_SEARCH_CATEGORIES.slice(1).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              openCommandCenter({
                filter: FILTER_MAP[cat.id] ?? "all",
                query: "",
              })
            }
            className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] transition-[transform,background-color] hover:scale-[1.02] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
