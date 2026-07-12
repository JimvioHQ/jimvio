"use client";

import { INSIGHT_LEVEL_STYLES } from "@/lib/business-graph";
import type { BusinessNetworkInsight } from "@/lib/business-graph/types";

export function BusinessNetworkInsights({ insights }: { insights: BusinessNetworkInsight[] }) {
  return (
    <section aria-label="Network insights" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {insights.map((insight) => {
        const style = INSIGHT_LEVEL_STYLES[insight.level];
        return (
          <div
            key={insight.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
            style={{ willChange: "transform", minHeight: 100 }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{insight.label}</p>
            <p className="mt-1 text-lg font-black text-[var(--color-text-primary)]">{insight.value}</p>
            <span
              className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
              style={{ color: style.color, background: `${style.color}18` }}
            >
              {style.label}
            </span>
            <p className="mt-2 line-clamp-2 text-[10px] text-[var(--color-text-muted)]">{insight.description}</p>
          </div>
        );
      })}
    </section>
  );
}
