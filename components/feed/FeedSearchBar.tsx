"use client";

import { Search } from "lucide-react";

export function FeedSearchBar() {
  return (
    <div className="relative min-w-0 w-full">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        placeholder="Search creators, clips, spaces, courses, lives, missions..."
        className="h-11 w-full rounded-2xl border-0 bg-white pl-11 pr-16 text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] outline-none transition-shadow placeholder:text-gray-400 focus:shadow-[0_0_0_1px_rgba(253,80,0,0.35),0_0_0_4px_rgba(253,80,0,0.08)]"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400 sm:inline-flex">
        ⌘K
      </kbd>
    </div>
  );
}
