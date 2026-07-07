"use client";

import { memo } from "react";
import { Check, Clock, X } from "lucide-react";
import type { AutoPublishCheckItem } from "@/lib/cj/import-intelligence/auto-publish-engine";
import { cn } from "@/lib/utils";

export const AutoPublishChecklist = memo(function AutoPublishChecklist({
  checks,
  compact,
  className,
}: {
  checks: AutoPublishCheckItem[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-x-1 gap-y-0.5",
        compact ? "text-[8px]" : "text-[9px]",
        className
      )}
    >
      {checks.map((item) => (
        <div
          key={item.key}
          className="group/check relative flex items-center gap-0.5 min-w-0 cursor-help"
          title={item.tooltip}
        >
          <span className="shrink-0 leading-none">{item.emoji}</span>
          {item.passed ? (
            <Check className="h-2.5 w-2.5 shrink-0 text-emerald-500" strokeWidth={3} />
          ) : item.pendingEnrichment ? (
            <Clock className="h-2.5 w-2.5 shrink-0 text-sky-400" strokeWidth={2.5} />
          ) : (
            <X className="h-2.5 w-2.5 shrink-0 text-[#D1D5DB]" strokeWidth={2.5} />
          )}
        </div>
      ))}
    </div>
  );
});
