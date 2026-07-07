"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FEED_TABS, type FeedTab } from "@/lib/feed/mock-data";

export function FeedTabs() {
  const [activeTab, setActiveTab] = useState<FeedTab>("For You");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = FEED_TABS.indexOf(activeTab);
    const el = tabRefs.current[idx];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  return (
    <div className="rounded-t-sm border border-gray-200 bg-white px-2 shadow-sm">
      <div className="flex items-center">
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute bottom-0 h-[3px] rounded-full bg-orange-500 transition-all duration-200"
            style={{ left: indicator.left, width: indicator.width }}
          />
          <div className="flex overflow-x-auto scrollbar-hide">
            {FEED_TABS.map((tab, i) => (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-3 py-3.5 text-sm transition-colors sm:px-4 ${
                  activeTab === tab
                    ? "font-semibold text-orange-500"
                    : "font-medium text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Filter feed"
          className="ml-1 shrink-0 p-2.5 text-gray-400 transition-colors hover:text-gray-600"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
