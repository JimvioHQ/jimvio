"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FEED_TABS, type FeedTab } from "@/lib/feed/mock-data";

export function FeedTabs({
  value,
  onChange,
}: {
  value?: FeedTab;
  onChange?: (tab: FeedTab) => void;
}) {
  const [uncontrolledTab, setUncontrolledTab] = useState<FeedTab>("For You");
  const activeTab = value ?? uncontrolledTab;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = FEED_TABS.indexOf(activeTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  return (
    <div className="border-b border-[var(--color-border)] bg-transparent px-0.5">
      <div className="flex items-center">
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute bottom-0 h-0.5 rounded-full bg-[#FF5A1F] transition-all duration-200 motion-reduce:transition-none"
            style={{ left: indicator.left, width: indicator.width }}
          />
          <div
            role="tablist"
            aria-label="Feed filters"
            className="flex overflow-x-auto scrollbar-hide"
          >
            {FEED_TABS.map((tab, i) => {
              const selected = activeTab === tab;
              return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  if (value === undefined) setUncontrolledTab(tab);
                  onChange?.(tab);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const dir = e.key === "ArrowRight" ? 1 : -1;
                  const next = (i + dir + FEED_TABS.length) % FEED_TABS.length;
                  const nextTab = FEED_TABS[next];
                  if (!nextTab) return;
                  if (value === undefined) setUncontrolledTab(nextTab);
                  onChange?.(nextTab);
                  tabRefs.current[next]?.focus();
                }}
                className={`min-h-11 shrink-0 px-3 py-2.5 text-[13px] transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 sm:px-3.5 ${
                  selected
                    ? "font-semibold text-[var(--color-text-primary)]"
                    : "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                {tab}
              </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Filter feed"
          className="ml-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
