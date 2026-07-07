"use client";

import Link from "next/link";
import { ArrowRight, Clock, Sparkles, Target, TrendingUp } from "lucide-react";
import { OPPORTUNITY_TYPE_META } from "@/lib/opportunity-engine";
import type { OpportunityCard } from "@/lib/opportunity-engine/types";
import { OpportunityScoreBadge } from "./OpportunityScoreBadge";
import { cn } from "@/lib/utils";

type OpportunityCardViewProps = {
  opportunity: OpportunityCard;
  featured?: boolean;
  className?: string;
};

export function OpportunityCardView({ opportunity, featured = false, className }: OpportunityCardViewProps) {
  const meta = OPPORTUNITY_TYPE_META[opportunity.type];

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-[transform,box-shadow,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30",
        featured && "ring-1 ring-[var(--color-accent)]/20",
        className,
      )}
      style={{ willChange: "transform" }}
    >
      <div
        className="relative px-4 py-3"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${meta.accent} 12%, var(--color-surface)), var(--color-surface))`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {meta.emoji} {meta.label}
            </p>
            <h3 className="mt-1 line-clamp-2 text-base font-black text-[var(--color-text-primary)]">
              {opportunity.title}
            </h3>
          </div>
          <OpportunityScoreBadge score={opportunity.score} level={opportunity.scoreLevel} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {opportunity.explanation}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-2">
            <p className="font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Earning potential</p>
            <p className="mt-0.5 font-semibold text-[var(--color-text-primary)]">{opportunity.earningPotential}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-2">
            <p className="font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Difficulty</p>
            <p className="mt-0.5 font-semibold capitalize text-[var(--color-text-primary)]">{opportunity.difficulty}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-2">
            <p className="inline-flex items-center gap-1 font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              <Clock className="size-3" />
              Time
            </p>
            <p className="mt-0.5 font-semibold text-[var(--color-text-primary)]">{opportunity.estimatedTime}</p>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-secondary)] px-2.5 py-2">
            <p className="inline-flex items-center gap-1 font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              <Target className="size-3" />
              Action
            </p>
            <p className="mt-0.5 line-clamp-2 font-semibold text-[var(--color-text-primary)]">
              {opportunity.recommendedAction}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-3"
          aria-label="AI insight placeholders"
        >
          <p className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
            <Sparkles className="size-3" />
            AI readiness
          </p>
          <ul className="space-y-1 text-[11px] text-[var(--color-text-muted)]">
            <li>
              <strong className="text-[var(--color-text-secondary)]">Why this?</strong>{" "}
              {opportunity.aiMeta.whyThisOpportunity}
            </li>
            <li>
              <strong className="text-[var(--color-text-secondary)]">Confidence:</strong>{" "}
              {opportunity.aiMeta.confidence}%
            </li>
            <li>
              <strong className="text-[var(--color-text-secondary)]">Risk:</strong>{" "}
              {opportunity.aiMeta.risk} ·{" "}
              <strong className="text-[var(--color-text-secondary)]">Demand:</strong>{" "}
              {opportunity.aiMeta.expectedDemand}
            </li>
          </ul>
        </div>

        <Link
          href={opportunity.ctaHref}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-bold text-white transition-[transform,opacity] duration-200 hover:scale-[1.02] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
        >
          {opportunity.ctaLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function OpportunityCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        featured ? "min-h-[360px]" : "min-h-[320px]",
      )}
      aria-hidden
    >
      <div className="h-20 animate-pulse bg-[var(--color-surface-secondary)]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-secondary)]" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--color-surface-secondary)]" />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
        <div className="h-10 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
      </div>
    </div>
  );
}

export function OpportunityMiniRow({ opportunity }: { opportunity: OpportunityCard }) {
  const meta = OPPORTUNITY_TYPE_META[opportunity.type];
  return (
    <Link
      href={opportunity.ctaHref}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
    >
      <span className="text-lg" aria-hidden>
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
          {opportunity.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <TrendingUp className="size-3" />
          {opportunity.earningPotential}
        </span>
      </span>
      <OpportunityScoreBadge score={opportunity.score} level={opportunity.scoreLevel} />
    </Link>
  );
}
