"use client";

import type { OpportunityLevel } from "@/lib/cj/import-intelligence/types";
import { OPPORTUNITY_LEVELS } from "@/lib/cj/import-intelligence/opportunity-score";
import { cn } from "@/lib/utils";

export function OpportunityScoreBadge({
  score,
  level,
  className,
  compact = true,
}: {
  score: number;
  level: OpportunityLevel;
  className?: string;
  compact?: boolean;
}) {
  const meta = OPPORTUNITY_LEVELS[level];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-bold backdrop-blur-md",
        "leading-none tabular-nums shrink-0 transition-all duration-500",
        compact ? "h-6 min-w-6 px-0.5 gap-px text-[8.5px]" : "h-7 px-2 gap-1 text-[11px]",
        className
      )}
      style={{ backgroundColor: meta.bg, color: meta.color }}
      title={`${meta.label} — ${score}/100`}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>{score}</span>
    </span>
  );
}
