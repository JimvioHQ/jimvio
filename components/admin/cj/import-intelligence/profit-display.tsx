import type { ProfitMetrics } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";

export function ProfitDisplay({
  profit,
  compact = false,
  className,
}: {
  profit: ProfitMetrics;
  compact?: boolean;
  className?: string;
}) {
  const profitable = profit.estimatedProfit > 0;
  return (
    <div
      className={cn(
        "rounded-sm border border-[#FF5A1F]/15 bg-[#FF5A1F]/[0.04] backdrop-blur-sm",
        compact ? "p-1.5 space-y-0.5" : "p-2 space-y-1",
        className
      )}
    >
      <div className={cn("grid gap-x-2 gap-y-0.5", compact ? "grid-cols-2 text-[9px]" : "grid-cols-2 text-[10px]")}>
        <ProfitRow label="CJ Cost" value={`$${profit.cjCost.toFixed(2)}`} />
        <ProfitRow label="Shipping" value={`$${profit.shippingCost.toFixed(2)}`} />
        <ProfitRow label="Sell at" value={`$${profit.suggestedSelling.toFixed(2)}`} highlight />
        <ProfitRow
          label="Profit"
          value={`$${profit.estimatedProfit.toFixed(2)}`}
          highlight={profitable}
          accent
        />
      </div>
      <div className={cn("flex items-center justify-between pt-0.5 border-t border-[#FF5A1F]/10", compact ? "text-[9px]" : "text-[10px]")}>
        <span className="text-[var(--color-text-muted)]">
          Margin <strong className={cn("tabular-nums", profitable ? "text-emerald-600" : "text-rose-600")}>{profit.marginPercent}%</strong>
        </span>
        <span className="text-[var(--color-text-muted)]">
          ROI <strong className="tabular-nums text-[#FF5A1F]">{profit.roi}%</strong>
        </span>
      </div>
    </div>
  );
}

function ProfitRow({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-1 min-w-0">
      <span className="text-[var(--color-text-muted)] truncate">{label}</span>
      <span
        className={cn(
          "tabular-nums font-semibold shrink-0",
          accent && "text-[#FF5A1F]",
          highlight && !accent && "text-[var(--color-text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
