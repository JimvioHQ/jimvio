"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchRecommendation } from "@/lib/community/economy";

export function AiMatchingEngine({
  recommendations,
  className,
}: {
  recommendations: MatchRecommendation[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI matching engine"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          AI matching
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          local-v1
        </span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {recommendations.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className="block rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition hover:border-[var(--color-accent)]/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {r.kind}
                </p>
                <span className="text-[11px] font-black text-[var(--color-text-primary)]">
                  {r.score}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                {r.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
                {r.reason}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
