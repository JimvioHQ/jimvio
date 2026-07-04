"use client";

import { Search } from "lucide-react";
import { CreateMenuDropdown } from "@/components/feed/CreateQuickLaunch";

export function FeedSearchBar() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search creators, clips, spaces, courses, lives, missions..."
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-16 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-400 sm:inline-flex">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}
