"use client";

import { memo, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  getProductRelationshipIntelligence,
  getWorkspaceIntelligence,
  getWorkspaceDefinition,
  type GlobalInsight,
  type IntelligenceInsightPeriod,
  type IntelligenceRecommendation,
  type OsWorkspaceMode,
} from "@/lib/jimvio-os";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { OsCard, cn } from "./os-ui";

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

const PERIOD_TABS: Array<{ id: IntelligenceInsightPeriod; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const INSIGHT_KIND_META: Record<
  GlobalInsight["kind"],
  { label: string; color: string; Icon: typeof TrendingUp }
> = {
  growth: { label: "Growth", color: "#16A34A", Icon: TrendingUp },
  risk: { label: "Risk", color: "#DC2626", Icon: AlertTriangle },
  opportunity: { label: "Opportunity", color: "#CA8A04", Icon: Lightbulb },
};

const CONFIDENCE_META: Record<IntelligenceRecommendation["confidence"], { label: string; color: string }> = {
  high: { label: "High confidence", color: "#16A34A" },
  medium: { label: "Medium confidence", color: "#CA8A04" },
  emerging: { label: "Emerging signal", color: "#64748B" },
};

// ─── Chain breadcrumb ─────────────────────────────────────────────────────────

const ChainBreadcrumb = memo(function ChainBreadcrumb({
  label,
  steps,
  accent,
}: {
  label: string;
  steps: Array<{ label: string }>;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`Relationship chain: ${label}`}>
      {steps.map((step, index) => (
        <span key={`${step.label}-${index}`} className="flex items-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: tint(accent, 10), color: accent }}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <ChevronRight className="size-3 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
          )}
        </span>
      ))}
    </div>
  );
});

// ─── Header ───────────────────────────────────────────────────────────────────

const IntelligenceHeader = memo(function IntelligenceHeader({
  headline,
  chainLabel,
  chainSteps,
  accent,
}: {
  headline: string;
  chainLabel: string;
  chainSteps: Array<{ label: string }>;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: tint(accent, 14), color: accent }}
        >
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Intelligence Core
          </h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">{headline}</p>
        </div>
      </div>
      <ChainBreadcrumb label={chainLabel} steps={chainSteps} accent={accent} />
    </div>
  );
});

// ─── Period tabs ──────────────────────────────────────────────────────────────

const PeriodTabs = memo(function PeriodTabs({
  active,
  onChange,
  accent,
}: {
  active: IntelligenceInsightPeriod;
  onChange: (period: IntelligenceInsightPeriod) => void;
  accent: string;
}) {
  return (
    <div role="tablist" aria-label="Insight period" className="inline-flex gap-1 rounded-full bg-[var(--color-surface-secondary)] p-1">
      {PERIOD_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
              isActive ? "text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            )}
            style={isActive ? { background: accent } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});

// ─── Global insights list ─────────────────────────────────────────────────────

const InsightRow = memo(function InsightRow({ insight }: { insight: GlobalInsight }) {
  const meta = INSIGHT_KIND_META[insight.kind];
  const Icon = meta.Icon;
  return (
    <Link
      href={insight.href}
      className="group flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 transition-[transform,border-color] duration-200 hover:-translate-y-px hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
    >
      <span
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
        style={{ background: tint(meta.color, 14), color: meta.color }}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
            style={{ background: tint(meta.color, 12), color: meta.color }}
          >
            {meta.label}
          </span>
          <span className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{insight.title}</span>
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          {insight.detail}
        </span>
      </span>
      <span className="mt-1 shrink-0 text-[11.5px] font-semibold text-[var(--color-text-muted)] transition-colors duration-200 group-hover:text-[var(--color-text-primary)]">
        {insight.cta}
      </span>
    </Link>
  );
});

const GlobalInsightsList = memo(function GlobalInsightsList({
  insights,
  period,
}: {
  insights: GlobalInsight[];
  period: IntelligenceInsightPeriod;
}) {
  const filtered = useMemo(() => insights.filter((i) => i.period === period), [insights, period]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--color-border)] px-3.5 py-4 text-center text-[12px] text-[var(--color-text-muted)]">
        No {period} signals yet — check back soon.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label={`${period} insights`}>
      {filtered.map((insight) => (
        <InsightRow key={insight.id} insight={insight} />
      ))}
    </div>
  );
});

// ─── Recommendation accordion ─────────────────────────────────────────────────

const ReasonChip = memo(function ReasonChip({ reason, accent }: { reason: string; accent: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: tint(accent, 10), color: accent }}
    >
      {reason}
    </span>
  );
});

const RecommendationItem = memo(function RecommendationItem({
  recommendation,
  accent,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: {
  recommendation: IntelligenceRecommendation;
  accent: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  buttonId: string;
}) {
  const confidence = CONFIDENCE_META[recommendation.confidence];
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors duration-200",
        isOpen ? "border-[var(--color-border-strong)]" : "border-[var(--color-border)]",
      )}
      style={isOpen ? { background: tint(accent, 5) } : undefined}
    >
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              {recommendation.title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-[var(--color-text-muted)]">
              {recommendation.subtitle}
            </span>
          </span>
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-[var(--color-text-muted)]",
              !reducedMotion && "transition-transform duration-200",
              isOpen && "rotate-90",
            )}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={cn(!reducedMotion && isOpen && "animate-in fade-in duration-200")}
      >
        <div className="flex flex-col gap-3 px-4 pb-4 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {recommendation.reasons.map((reason) => (
              <ReasonChip key={reason} reason={reason} accent={accent} />
            ))}
            <span
              className="ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide"
              style={{ background: tint(confidence.color, 12), color: confidence.color }}
            >
              {confidence.label}
            </span>
          </div>
          <Link
            href={recommendation.href}
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: accent }}
          >
            {recommendation.cta}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
});

const RecommendationsAccordion = memo(function RecommendationsAccordion({
  recommendations,
  accent,
  idPrefix,
}: {
  recommendations: IntelligenceRecommendation[];
  accent: string;
  idPrefix: string;
}) {
  const [openId, setOpenId] = useState<string | null>(recommendations[0]?.id ?? null);

  if (recommendations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {recommendations.map((recommendation) => {
        const isOpen = recommendation.id === openId;
        return (
          <RecommendationItem
            key={recommendation.id}
            recommendation={recommendation}
            accent={accent}
            isOpen={isOpen}
            onToggle={() => setOpenId(isOpen ? null : recommendation.id)}
            panelId={`${idPrefix}-panel-${recommendation.id}`}
            buttonId={`${idPrefix}-button-${recommendation.id}`}
          />
        );
      })}
    </div>
  );
});

// ─── Relationship pulse strip ────────────────────────────────────────────────

const RelationshipPulse = memo(function RelationshipPulse({ accent }: { accent: string }) {
  const relationships = useMemo(() => getProductRelationshipIntelligence(), []);

  return (
    <details className="group/pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 px-4 py-3 text-[12.5px] font-semibold text-[var(--color-text-secondary)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5" style={{ color: accent }} aria-hidden />
          Relationship pulse
        </span>
        <ChevronRight className="size-3.5 text-[var(--color-text-muted)] transition-transform duration-200 group-open/pulse:rotate-90" aria-hidden />
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {relationships.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition-colors duration-200 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[10.5px] font-medium text-[var(--color-text-muted)]">
                {item.reasons.join(" · ")}
              </span>
            </span>
            <ArrowRight
              className="size-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </details>
  );
});

// ─── Root component ───────────────────────────────────────────────────────────

export type IntelligenceCoreProps = {
  mode: OsWorkspaceMode;
  /** Optional accent override — defaults to the workspace's own accent. */
  accent?: string;
  className?: string;
};

/**
 * Intelligence Core — surfaces relationship intelligence as "what should I do
 * next" recommendations with WHY explanations. Presentation-only: consumes
 * `getWorkspaceIntelligence` scaffold data, every href is an existing route.
 */
export const IntelligenceCore = memo(function IntelligenceCore({ mode, accent, className }: IntelligenceCoreProps) {
  const idPrefix = useId();
  const [period, setPeriod] = useState<IntelligenceInsightPeriod>("daily");
  const intelligence = useMemo(() => getWorkspaceIntelligence(mode), [mode]);
  const resolvedAccent = accent ?? getWorkspaceDefinition(mode).home.accent;
  const showRelationshipPulse = mode === "seller" || mode === "buyer";

  return (
    <OsCard as="section" padding="lg" className={cn("flex flex-col gap-5 rounded-3xl", className)}>
      <IntelligenceHeader
        headline={intelligence.headline}
        chainLabel={intelligence.chain.label}
        chainSteps={intelligence.chain.steps}
        accent={resolvedAccent}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Signals
          </p>
          <PeriodTabs active={period} onChange={setPeriod} accent={resolvedAccent} />
        </div>
        <GlobalInsightsList insights={intelligence.insights} period={period} />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Recommended next
        </p>
        <RecommendationsAccordion
          recommendations={intelligence.recommendations}
          accent={resolvedAccent}
          idPrefix={idPrefix}
        />
      </div>

      {showRelationshipPulse && <RelationshipPulse accent={resolvedAccent} />}
    </OsCard>
  );
});

export default IntelligenceCore;
