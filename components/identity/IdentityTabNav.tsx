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
}: {
  tabs: IdentityTab[];
  activeTab: string;
  basePath: string;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-black/[0.06] bg-[#FBFAF8]/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <nav
        aria-label="Profile sections"
        className="flex gap-1 overflow-x-auto scroll-px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = !tab.href && tab.id === activeTab;
          const href = tab.href ?? `${basePath}?tab=${tab.id}`;
          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-3.5 py-3 text-[13px] font-medium transition-colors",
                isActive ? "text-[#161512]" : "text-[#9A9388] hover:text-[#59544B]",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-colors",
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
