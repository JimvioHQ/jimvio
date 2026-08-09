"use client";

import { Command, Search } from "lucide-react";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

/** Opens the universal Command + K palette — not a separate search implementation. */
export function FeedSearchBar() {
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

  return (
    <button
      type="button"
      onClick={() => openCommandCenter()}
      className="relative flex h-11 min-w-0 w-full items-center rounded-2xl border-0 bg-white pl-11 pr-16 text-left text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_0_0_1px_rgba(253,80,0,0.35),0_0_0_4px_rgba(253,80,0,0.08)] focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_rgba(253,80,0,0.35),0_0_0_4px_rgba(253,80,0,0.08)]"
      aria-label="Open command search"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <span className="truncate text-gray-400">
        Search or jump — creators, communities, products…
      </span>
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400 sm:inline-flex">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}
