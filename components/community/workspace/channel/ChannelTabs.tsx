"use client";

import { cn } from "@/lib/utils";
import { CHANNEL_TABS, type ChannelTabId } from "@/lib/community/workspace";

export function ChannelTabs({
  active,
  onChange,
  className,
}: {
  active: ChannelTabId;
  onChange: (id: ChannelTabId) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Channel sections"
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 scrollbar-hide sm:px-4",
        className
      )}
    >
      {CHANNEL_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`channel-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] font-semibold transition-colors",
              isActive
                ? "text-[#fd5000]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#fd5000]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
