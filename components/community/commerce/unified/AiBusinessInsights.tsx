"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiBusinessInsight } from "@/lib/community/commerce/unified";

export function AiBusinessInsights({
  insights,
  className,
}: {
  insights: AiBusinessInsight[];
  className?: string;
}) {
  if (insights.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI business insights"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          AI business insights
        </h3>
        <span className="rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          Auto
        </span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {insights.map((insight) => {
          const inner = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                {insight.title}
              </p>
              <p className="mt-1 line-clamp-3 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                {insight.body}
              </p>
            </>
          );
          return (
            <li key={insight.id}>
              {insight.href ? (
                <Link
                  href={insight.href}
                  className="block h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition hover:border-[var(--color-accent)]/40"
                >
                  {inner}
                </Link>
              ) : (
                <div className="h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
