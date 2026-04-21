"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCard = {
  title: string;
  value: string;
  sub?: string;
  changePct?: number;
  icon: React.ReactNode;
};

export function CommissionStats({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{c.title}</p>
              <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">{c.value}</p>
              {c.sub && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{c.sub}</p>}
              {c.changePct != null && (
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 text-xs font-bold",
                    c.changePct >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                  )}
                >
                  {c.changePct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {c.changePct >= 0 ? "+" : ""}
                  {c.changePct.toFixed(1)}% vs prior period
                </p>
              )}
            </div>
            <div className="rounded-xl bg-[var(--color-accent-light)] p-2 text-[var(--color-accent)]">{c.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
