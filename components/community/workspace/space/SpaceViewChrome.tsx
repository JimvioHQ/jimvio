"use client";

import { cn } from "@/lib/utils";

export type SpaceViewTab = "discussion" | "members" | "files" | "events";

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
