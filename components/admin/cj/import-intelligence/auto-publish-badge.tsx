"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { AutoPublishStatus } from "@/lib/cj/import-intelligence/auto-publish-engine";

const BADGE_STYLES: Record<
  AutoPublishStatus,
  { label: string; className: string }
> = {
  READY: {
    label: "🚀 AUTO PUBLISH READY",
    className: "bg-emerald-500/15 text-emerald-700",
  },
  PENDING_ENRICHMENT: {
    label: "⏳ Pending Enrichment",
    className: "bg-sky-500/12 text-sky-800",
  },
  REQUIREMENTS_MISSING: {
    label: "⚠ Requirements Missing",
    className: "bg-amber-500/12 text-amber-800",
  },
  PUBLISHED_BY_ADMIN: {
    label: "👤 Published by Admin",
    className: "bg-violet-500/12 text-violet-800",
  },
};

export const AutoPublishBadge = memo(function AutoPublishBadge({
  status,
  score,
  className,
}: {
  status: AutoPublishStatus;
  score: number;
  className?: string;
}) {
  const style = BADGE_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5",
        "text-[8px] font-bold uppercase tracking-wide",
        style.className,
        className
      )}
      title={`Score: ${score}/100 (informational)`}
    >
      {style.label}
    </span>
  );
});
