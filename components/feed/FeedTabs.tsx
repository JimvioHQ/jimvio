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
    <div className="border-b border-gray-200/80 bg-transparent px-0.5">
      <div className="flex items-center">
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute bottom-0 h-0.5 rounded-full bg-orange-500 transition-all duration-200"
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
                className={`shrink-0 px-3 py-3 text-[13px] transition-colors sm:px-3.5 ${
                  activeTab === tab
                    ? "font-semibold text-gray-900"
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
          className="ml-1 shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
