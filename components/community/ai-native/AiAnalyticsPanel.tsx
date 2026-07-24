"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiAnalyticsProvider,
  type AiNativeContext,
} from "@/lib/ai/native";

export function AiAnalyticsPanel({
  context,
  className,
}: {
  context: AiNativeContext;
  className?: string;
}) {
  const insights = useMemo(() => {
    const result = getAiAnalyticsProvider().explain(context);
    return Array.isArray(result) ? result : [];
  }, [context]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI analytics"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <LineChart className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        AI analytics
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {insights.map((insight) => {
          const inner = (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                {insight.title}
              </p>
              <p className="mt-1 line-clamp-3 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                {insight.explanation}
              </p>
            </>
          );
          return (
            <li key={insight.id}>
              {insight.href ? (
                <Link
                  href={insight.href}
                  className="block h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 hover:border-[var(--color-accent)]/40"
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
