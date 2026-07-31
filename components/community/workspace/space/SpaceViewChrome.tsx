"use client";

import { cn } from "@/lib/utils";

export type SpaceViewTab =
  | "discussion"
  | "members"
  | "files"
  | "posts"
  | "about";

function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

export function SpaceViewTabs({
  active,
  memberCount,
  onChange,
}: {
  active: SpaceViewTab;
  memberCount: number;
  onChange: (tab: SpaceViewTab) => void;
}) {
  const tabs: { id: SpaceViewTab; label: string; count?: number | null }[] = [
    { id: "discussion", label: "Discussion" },
    {
      id: "members",
      label: "Members",
      count: memberCount > 0 ? memberCount : null,
    },
    { id: "files", label: "Files" },
    { id: "posts", label: "Posts" },
    { id: "about", label: "About" },
  ];

  return (
    <div className="shrink-0 border-b border-gray-100/90 bg-white/95 px-3 backdrop-blur-sm sm:px-5">
      <nav
        className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide"
        aria-label="Space sections"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-3 text-[13px] transition-all duration-200",
                isActive
                  ? "font-semibold text-[var(--color-accent)]"
                  : "font-medium text-gray-500 hover:bg-gray-50/80 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.count != null ? (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {formatCompact(tab.count)}
                </span>
              ) : null}
              <span
                className={cn(
                  "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-accent)] opacity-100"
                    : "bg-transparent opacity-0"
                )}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
