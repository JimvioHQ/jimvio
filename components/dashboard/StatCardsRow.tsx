import { memo } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "@/components/dashboard/Sparkline";
import type { StatCard } from "@/types/dashboard";
import { cn } from "@/lib/utils";

export const StatCardsRow = memo(function StatCardsRow({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border)]/80"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {card.label}
            </p>
            {card.data.length > 1 && (
              <Sparkline data={card.data} color={card.chartColor} width={72} height={28} />
            )}
          </div>

          <p className="text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
            {card.value}
          </p>

          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-[11px] font-medium",
              card.up ? "text-[#30a46c]" : "text-red-500"
            )}
          >
            {card.up ? (
              <ArrowUpRight className="size-3 shrink-0" />
            ) : (
              <ArrowDownRight className="size-3 shrink-0" />
            )}
            {card.change}
          </p>
        </div>
      ))}
    </div>
  );
});
