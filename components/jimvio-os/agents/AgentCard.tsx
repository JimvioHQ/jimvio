"use client";

import { memo, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import type { AgentRecommendation, AgentStatus, JimvioAgent } from "@/lib/jimvio-os";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "../os-ui";

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "#16A34A" },
  watching: { label: "Watching", color: "#CA8A04" },
  idle: { label: "Idle", color: "#64748B" },
};

const PRIORITY_META: Record<AgentRecommendation["priority"], { label: string; color: string }> = {
  critical: { label: "Critical", color: "#DC2626" },
  high: { label: "High", color: "#EA580C" },
  medium: { label: "Medium", color: "#CA8A04" },
  low: { label: "Low", color: "#64748B" },
};

function averageConfidence(recommendations: AgentRecommendation[]): number {
  if (recommendations.length === 0) return 0;
  const sum = recommendations.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round(sum / recommendations.length);
}

const StatusPill = memo(function StatusPill({ status }: { status: AgentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide"
      style={{ background: tint(meta.color, 12), color: meta.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
      {meta.label}
    </span>
  );
});

const RecommendationDetail = memo(function RecommendationDetail({
  recommendation,
  accent,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: {
  recommendation: AgentRecommendation;
  accent: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  buttonId: string;
}) {
  const priority = PRIORITY_META[recommendation.priority];
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        !reducedMotion && "transition-colors duration-200",
        isOpen ? "border-[var(--color-border-strong)]" : "border-[var(--color-border)]",
      )}
      style={isOpen ? { background: tint(accent, 5) } : undefined}
    >
      <h4 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ background: tint(priority.color, 12), color: priority.color }}
              >
                {priority.label}
              </span>
              <span className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                {recommendation.title}
              </span>
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              {recommendation.summary}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]",
              !reducedMotion && "transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h4>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={cn(!reducedMotion && isOpen && "animate-in fade-in duration-200")}
      >
        <div className="flex flex-col gap-3 px-4 pb-4 pt-0.5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Why</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{recommendation.why}</p>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Data influences
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recommendation.dataInfluences.map((influence) => (
                <span
                  key={influence}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: tint(accent, 10), color: accent }}
                >
                  {influence}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Expected outcome
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
              {recommendation.expectedOutcome}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: accent }}
            >
              <Sparkles className="size-3" aria-hidden />
              {recommendation.confidence}% confidence
            </span>
            <Link
              href={recommendation.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                !reducedMotion && "transition-transform duration-200 hover:scale-[1.02]",
              )}
              style={{ background: accent }}
            >
              {recommendation.cta}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

export type AgentCardProps = {
  agent: JimvioAgent;
  className?: string;
  /** Card starts expanded — defaults to collapsed. */
  defaultExpanded?: boolean;
};

/**
 * Expandable agent card — collapsed shows only the top recommendation title;
 * expanded reveals every recommendation as an accordion (one open at a time).
 * Presentation-only: every CTA links to an existing production route.
 */
export const AgentCard = memo(function AgentCard({ agent, className, defaultExpanded = false }: AgentCardProps) {
  const idPrefix = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openRecId, setOpenRecId] = useState<string | null>(agent.recommendations[0]?.id ?? null);
  const reducedMotion = usePrefersReducedMotion();

  const avgConfidence = useMemo(() => averageConfidence(agent.recommendations), [agent.recommendations]);
  const topRecommendation = agent.recommendations[0];

  return (
    <article
      className={cn(
        "flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]",
        !reducedMotion && "transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-border-strong)] hover:shadow-[0_12px_32px_rgba(16,24,40,0.06)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`${idPrefix}-agent-body`}
        className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-inset"
      >
        <span className="flex min-w-0 items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-[20px]"
            style={{ background: tint(agent.accent, 14), color: agent.accent }}
            aria-hidden
          >
            {agent.emoji}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                {agent.name}
              </span>
              <StatusPill status={agent.status} />
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              {agent.role}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1" style={{ color: agent.accent }}>
                <Sparkles className="size-3" aria-hidden />
                {avgConfidence}% avg confidence
              </span>
              <span>Updated {agent.lastUpdatedLabel}</span>
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1.5 size-4 shrink-0 text-[var(--color-text-muted)]",
            !reducedMotion && "transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {!expanded && topRecommendation && (
        <div
          className="mt-4 rounded-2xl border border-[var(--color-border)] px-3.5 py-3"
          style={{ background: tint(agent.accent, 4) }}
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            Top recommendation
          </p>
          <p className="mt-1 truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
            {topRecommendation.title}
          </p>
        </div>
      )}

      <div id={`${idPrefix}-agent-body`} hidden={!expanded}>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Analyzes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.analyzes.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {agent.recommendations.map((recommendation) => {
              const isOpen = recommendation.id === openRecId;
              return (
                <RecommendationDetail
                  key={recommendation.id}
                  recommendation={recommendation}
                  accent={agent.accent}
                  isOpen={isOpen}
                  onToggle={() => setOpenRecId(isOpen ? null : recommendation.id)}
                  panelId={`${idPrefix}-panel-${recommendation.id}`}
                  buttonId={`${idPrefix}-button-${recommendation.id}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
});

export default AgentCard;
