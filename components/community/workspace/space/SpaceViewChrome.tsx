"use client";

import { cn } from "@/lib/utils";

export type SpaceViewTab = "discussion" | "members" | "files" | "events";
export type SpaceFeedFilter = "all" | "latest" | "popular" | "unanswered";

const FEED_FILTERS: { id: SpaceFeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "latest", label: "Latest" },
  { id: "popular", label: "Popular" },
  { id: "unanswered", label: "Unanswered" },
];

export function SpaceViewTabs({
  active,
  memberCount,
  onChange,
}: {
  active: SpaceViewTab;
  memberCount: number;
  onChange: (tab: SpaceViewTab) => void;
}) {
  const tabs: { id: SpaceViewTab; label: string }[] = [
    { id: "discussion", label: "Discussion" },
    {
      id: "members",
      label: `Members${memberCount > 0 ? ` ${memberCount}` : ""}`,
    },
    { id: "files", label: "Files" },
    { id: "events", label: "Events" },
  ];

  return (
    <div className="shrink-0 border-b border-gray-100 bg-white px-4 sm:px-6">
      <nav className="-mb-px flex gap-5 overflow-x-auto" aria-label="Space sections">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative shrink-0 whitespace-nowrap py-3 text-[13px] font-semibold transition-colors",
                isActive ? "text-[#fd5000]" : "text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#fd5000]" />
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function SpaceFeedFilters({
  active,
  onChange,
  sort = "newest",
  onSortChange,
}: {
  active: SpaceFeedFilter;
  onChange: (filter: SpaceFeedFilter) => void;
  sort?: "newest" | "oldest";
  onSortChange?: (sort: "newest" | "oldest") => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-50 bg-white px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-1.5">
        {FEED_FILTERS.map((f) => {
          const isActive = active === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold transition",
                isActive
                  ? "bg-[#fd5000] text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <label className="relative inline-flex items-center">
        <span className="sr-only">Sort</span>
        <select
          value={sort}
          onChange={(e) =>
            onSortChange?.(e.target.value === "oldest" ? "oldest" : "newest")
          }
          className="h-8 appearance-none rounded-lg border border-gray-200 bg-white py-1 pl-3 pr-8 text-[12px] font-semibold text-gray-600 outline-none focus:border-[#fd5000]/40"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <span className="pointer-events-none absolute right-2 text-[10px] text-gray-400">
          ▾
        </span>
      </label>
    </div>
  );
}
