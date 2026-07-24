"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_KIND_LABELS,
  type CreatorOpportunity,
} from "@/lib/community/economy";

export function OpportunityMarketplace({
  opportunities,
  onOpenWorkspace,
  className,
}: {
  opportunities: CreatorOpportunity[];
  onOpenWorkspace?: (id: string) => void;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)} aria-label="Opportunity marketplace">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Global Creator Economy
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
            Opportunity marketplace
          </h3>
        </div>
        <Link
          href="/ugc"
          className="text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
        >
          Open UGC hub
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {opportunities.map((o) => (
          <article
            key={o.id}
            className={cn(
              "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5",
              "transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]/35"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                {OPPORTUNITY_KIND_LABELS[o.kind]}
              </span>
              <span className="text-[11px] font-black text-[var(--color-text-primary)]">
                {o.matchScore}
                <span className="ml-0.5 font-semibold text-[var(--color-text-muted)]">
                  match
                </span>
              </span>
            </div>
            <h4 className="mt-2 line-clamp-2 text-[13.5px] font-bold text-[var(--color-text-primary)]">
              {o.title}
            </h4>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              {o.brand} · {o.difficulty} · due {o.deadline}
            </p>
            <dl className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <dt className="text-[var(--color-text-muted)]">Reward</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">{o.reward}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Est. earnings</dt>
                <dd className="font-semibold text-[var(--color-text-primary)]">
                  {o.estimatedEarnings > 0
                    ? `$${o.estimatedEarnings.toLocaleString("en-US")}`
                    : "Access"}
                </dd>
              </div>
            </dl>
            <ul className="mt-2 space-y-0.5">
              {o.requirements.slice(0, 2).map((r) => (
                <li
                  key={r}
                  className="truncate text-[11px] text-[var(--color-text-muted)]"
                >
                  · {r}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Link
                href={o.href}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
              >
                View
              </Link>
              {onOpenWorkspace && (
                <button
                  type="button"
                  onClick={() => onOpenWorkspace(o.id)}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
                >
                  Workspace
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
