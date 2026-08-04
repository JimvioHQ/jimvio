"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { getExecutiveBrief, JIMVIO_AGENTS, type AgentRecommendation } from "@/lib/jimvio-os";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "../os-ui";
import { AgentCard } from "./AgentCard";

const HERO_ACCENT = "#4F46E5";

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

type PriorityFilter = "all" | AgentRecommendation["priority"];

const FILTERS: Array<{ id: PriorityFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
];

function agentMatchesFilter(recommendations: AgentRecommendation[], filter: PriorityFilter): boolean {
  if (filter === "all") return true;
  return recommendations.some((r) => r.priority === filter);
}

const ExecutiveSummaryStrip = memo(function ExecutiveSummaryStrip() {
  const brief = useMemo(() => getExecutiveBrief(), []);

  return (
    <section
      aria-label="Executive summary"
      className="relative overflow-hidden rounded-3xl border p-5 sm:p-6"
      style={{
        borderColor: tint(HERO_ACCENT, 22),
        background: `linear-gradient(160deg, ${tint(HERO_ACCENT, 12)} 0%, color-mix(in srgb, var(--color-surface) 90%, transparent) 46%, ${tint(HERO_ACCENT, 6)} 100%)`,
      }}
    >
      <p
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: HERO_ACCENT }}
      >
        <Sparkles className="size-3.5" aria-hidden />
        Executive summary
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-start gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3.5 py-3 dark:border-white/5 dark:bg-white/5">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
            style={{ background: "color-mix(in srgb, #16A34A 14%, transparent)", color: "#16A34A" }}
            aria-hidden
          >
            <Sparkles className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: "#16A34A" }}>
              Revenue
            </span>
            <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-[var(--color-text-secondary)]">
              {brief.revenue}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3.5 py-3 dark:border-white/5 dark:bg-white/5">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
            style={{ background: tint(HERO_ACCENT, 14), color: HERO_ACCENT }}
            aria-hidden
          >
            <TrendingUp className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: HERO_ACCENT }}>
              Growth
            </span>
            <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-[var(--color-text-secondary)]">
              {brief.growth}
            </span>
          </span>
        </div>
        <div className="flex items-start gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3.5 py-3 dark:border-white/5 dark:bg-white/5">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
            style={{ background: "color-mix(in srgb, #DC2626 14%, transparent)", color: "#DC2626" }}
            aria-hidden
          >
            <AlertTriangle className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: "#DC2626" }}>
              Risk
            </span>
            <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-[var(--color-text-secondary)]">
              {brief.risk}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {brief.actions.map((action) => (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderColor: tint(HERO_ACCENT, 28),
              color: HERO_ACCENT,
              background: tint(HERO_ACCENT, 8),
            }}
          >
            {action.label}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
});

const PriorityFilterChips = memo(function PriorityFilterChips({
  active,
  onChange,
}: {
  active: PriorityFilter;
  onChange: (filter: PriorityFilter) => void;
}) {
  return (
    <div role="tablist" aria-label="Filter agents by priority" className="inline-flex gap-1 rounded-full bg-[var(--color-surface-secondary)] p-1">
      {FILTERS.map((filter) => {
        const isActive = filter.id === active;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
              isActive ? "text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            )}
            style={isActive ? { background: HERO_ACCENT } : undefined}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
});

/**
 * Agent Center — full-page layout listing all 8 specialized Jimvio agents.
 * Every agent is recommend-only; every action links to an existing route.
 */
export const AgentCenterView = memo(function AgentCenterView({ className }: { className?: string }) {
  const [filter, setFilter] = useState<PriorityFilter>("all");
  const reducedMotion = usePrefersReducedMotion();

  const visibleAgents = useMemo(
    () => JIMVIO_AGENTS.filter((agent) => agentMatchesFilter(agent.recommendations, filter)),
    [filter],
  );

  return (
    <div className={cn("flex flex-col gap-8", className)} style={reducedMotion ? undefined : { animation: "jimvio-os-enter 260ms ease-out" }}>
      <header
        className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] px-5 py-6 sm:px-8 sm:py-8"
        style={{
          background: `linear-gradient(135deg, ${tint(HERO_ACCENT, 12)} 0%, var(--color-surface) 48%, ${tint(HERO_ACCENT, 6)} 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl"
          style={{ background: tint(HERO_ACCENT, 18) }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-[20px]"
            style={{ background: tint(HERO_ACCENT, 16), color: HERO_ACCENT }}
            aria-hidden
          >
            🧭
          </span>
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
              Agent Center
            </h1>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
              Your specialized AI coworkers — recommend only, you decide.
            </p>
          </div>
        </div>
      </header>

      <ExecutiveSummaryStrip />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Your agents
          </p>
          <PriorityFilterChips active={filter} onChange={setFilter} />
        </div>

        {visibleAgents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--color-border)] px-6 py-9 text-center">
            <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">No agents match this filter</p>
            <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
              Try a different priority — every agent still has recommendations waiting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default AgentCenterView;
