"use client";

import Link from "next/link";
import { cn } from "@/components/identity/identity-ui";

export interface IdentityTab {
  id: string;
  label: string;
  /** When set, the tab is a real navigation (e.g. owner-only pages) instead of an in-page ?tab= switch. */
  href?: string;
}

export function IdentityTabNav({
  tabs,
  activeTab,
  basePath,
  onTabSelect,
}: {
  tabs: IdentityTab[];
  activeTab: string;
  basePath: string;
  onTabSelect?: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-[#E5E7EB] bg-[#F8FAFC]/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <nav
        aria-label="Profile sections"
        className="flex gap-0.5 overflow-x-auto scroll-px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const href = tab.href ?? `${basePath}?tab=${tab.id}#${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              onClick={(event) => {
                if (!onTabSelect) return;
                event.preventDefault();
                onTabSelect(tab.id);
              }}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3 py-3 text-[12.5px] font-medium transition-colors sm:px-3.5 sm:text-[13px]",
                isActive ? "text-[#111827]" : "text-[#6B7280] hover:text-[#374151]",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-[2.5px] rounded-full transition-colors",
                  isActive ? "bg-[#FF5A1F]" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
