"use client";

import { Sparkline } from "@/components/dashboard/Sparkline";
import { AnimatedCounter } from "./AnimatedCounter";
import type { CommandCenterAnalyticsCard } from "@/lib/creator-command-center/types";
import { cn } from "@/lib/utils";

export function CommandCenterAnalytics({ cards }: { cards: CommandCenterAnalyticsCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={card.id}
          className={cn(
            "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-[transform,opacity] duration-300 hover:scale-[1.01]",
          )}
          style={{
            animationDelay: `${index * 35}ms`,
            willChange: "transform",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-black text-[var(--color-text-primary)]">
                {typeof card.value === "number" && card.label !== "Revenue" ? (
                  <AnimatedCounter
                    value={card.value}
                    decimals={card.label === "Conversion" || card.label === "CTR" ? 1 : 0}
                    suffix={card.label === "Conversion" || card.label === "CTR" || card.label === "Sales Growth" ? (card.label === "Sales Growth" ? "%" : "%") : ""}
                  />
                ) : (
                  card.displayValue
                )}
              </p>
              {card.delta && (
                <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">{card.delta}</p>
              )}
            </div>
            <Sparkline data={card.sparkline} color={card.color} width={72} height={28} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommandCenterAnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={`an-${i}`} className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
      ))}
    </div>
  );
}
