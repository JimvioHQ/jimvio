import type { HealthLabel } from "@/lib/cj/import-intelligence/types";
import { HEALTH_LABELS } from "@/lib/cj/import-intelligence/product-utils";
import { cn } from "@/lib/utils";

export function HealthScoreBadge({
  score,
  label,
  compact = false,
  className,
}: {
  score: number;
  label: HealthLabel;
  compact?: boolean;
  className?: string;
}) {
  const meta = HEALTH_LABELS[label];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-semibold backdrop-blur-md",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
      style={{
        backgroundColor: `${meta.color}18`,
        color: meta.color,
        border: `1px solid ${meta.color}40`,
      }}
      title={`Health score: ${score}/100`}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
      {!compact && <span className="tabular-nums opacity-80">{score}</span>}
    </span>
  );
}
