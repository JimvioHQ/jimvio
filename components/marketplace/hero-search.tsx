"use client";

import React from "react";
import { Search, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useAIStore } from "@/lib/store/use-ai-store";

/**
 * Homepage hero search — opens the unified Jimvio Command+K experience.
 * Keeps the existing visual input; does not maintain a separate search system.
 */
export function HeroSearch() {
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div className="w-full relative">
      <div className="px-[52px] py-3 border-b border-black/[.07] dark:border-white/[.06] bg-white dark:bg-surface">
        <button
          type="button"
          onClick={() => openCommandCenter()}
          aria-label="Search everything or run a command"
          className={cn(
            "flex w-full items-center h-[52px] rounded-sm transition-all duration-200 overflow-hidden text-left",
            "bg-[#f5f4f1] dark:bg-bg",
            "border border-black/10 dark:border-white/10",
            "hover:border-[#fd5000]/40 focus-visible:outline-none focus-visible:border-[#fd5000]/60 focus-visible:shadow-[0_0_0_4px_rgba(253,80,0,0.1)]",
          )}
        >
          <div className="pl-[22px] pr-[10px] shrink-0">
            <Search className="h-[15px] w-[15px] text-[#b0a898] dark:text-[#a89f93]" strokeWidth={2.5} />
          </div>

          <span className="flex-1 truncate text-[14px] text-[#a89f93] font-medium">
            Search globally or run a command…
          </span>

          <kbd className="mr-3 hidden shrink-0 rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#a89f93] sm:inline dark:border-white/10 dark:bg-transparent">
            ⌘K
          </kbd>

          <span
            role="button"
            tabIndex={0}
            aria-label="Ask Jimvio AI"
            onClick={(e) => {
              e.stopPropagation();
              openAssistant();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                openAssistant();
              }
            }}
            className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#b0a898] transition-colors hover:bg-black/[0.04] hover:text-[#fd5000]"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </div>
  );
}
