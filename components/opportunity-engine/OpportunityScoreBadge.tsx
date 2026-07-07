"use client";

import { SCORE_LEVEL_STYLES } from "@/lib/opportunity-engine/config";
import type { OpportunityScoreLevel } from "@/lib/opportunity-engine/types";
import { cn } from "@/lib/utils";

export function OpportunityScoreBadge({
  score,
  level,
  className,
}: {
  score: number;
  level: OpportunityScoreLevel;
  className?: string;
}) {
  const style = SCORE_LEVEL_STYLES[level];
  return (
    <div
      className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1", className)}
      style={{ background: style.bg }}
      aria-label={`Opportunity score ${score} out of 100, ${style.label} potential`}
    >
      <span className="text-sm font-black" style={{ color: style.color }}>
        {score}/100
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
        {style.label}
      </span>
    </div>
  );
}
