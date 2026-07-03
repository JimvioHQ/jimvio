"use client";

import type { HealthLabel } from "@/lib/cj/import-intelligence/types";
import { HEALTH_LABELS } from "@/lib/cj/import-intelligence/product-utils";
import { cn } from "@/lib/utils";

export function HealthScoreCircle({
  score,
  label,
  size = 28,
  className,
}: {
  score: number;
  label: HealthLabel;
  size?: number;
  className?: string;
}) {
  const meta = HEALTH_LABELS[label];
  const ring = Math.max(2, Math.round(size * 0.07));

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-white/95 font-bold tabular-nums shadow-sm backdrop-blur-md",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        color: meta.color,
        boxShadow: `0 0 0 ${ring}px ${meta.color}30, 0 2px 8px rgba(17,24,39,0.08)`,
      }}
      title={`Health ${score}`}
    >
      {score}
    </div>
  );
}
