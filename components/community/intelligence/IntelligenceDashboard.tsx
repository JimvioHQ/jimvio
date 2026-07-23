"use client";

import Link from "next/link";
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTELLIGENCE_DOMAIN_LABELS,
  useIntelligenceStore,
  type AutomationSuggestion,
  type IntelligenceRecommendation,
  type IntelligenceSnapshot,
  type UnifiedInsight,
} from "@/lib/community/intelligence";

export function UnifiedAnalyticsStrip({
  analytics,
}: {
  analytics: UnifiedInsight[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {analytics.map((m) => {
        const Trend =
          m.trend === "up"
            ? TrendingUp
            : m.trend === "down"
              ? TrendingDown
              : Minus;
        return (
          <div
            key={m.metric}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {m.label}
              <Trend className="h-3 w-3 text-[var(--color-accent)]" />
            </p>
            <p className="mt-0.5 text-lg font-black text-[var(--color-text-primary)]">
              {m.value.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {m.unit}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function RecommendationRail({
  recommendations,
}: {
  recommendations: IntelligenceRecommendation[];
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {recommendations.slice(0, 8).map((r) => {
        const inner = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                {r.kind}
              </p>
              <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                {r.score}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
              {r.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
              {r.reason}
            </p>
          </>
        );
        return (
          <li key={r.id}>
            {r.href ? (
              <Link
                href={r.href}
                className="block rounded-xl border border-[var(--color-border)] px-3 py-2.5 hover:border-[var(--color-accent)]/40"
              >
                {inner}
              </Link>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] px-3 py-2.5">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AutomationSuggestions({
  automations,
  onAct,
}: {
  automations: AutomationSuggestion[];
  onAct?: (a: AutomationSuggestion) => void;
}) {
  const dismiss = useIntelligenceStore((s) => s.dismissAutomation);
  const dismissedIds = useIntelligenceStore((s) => s.dismissedAutomationIds);
  const visible = automations.filter((a) => !dismissedIds.includes(a.id));

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-[13px] text-[var(--color-text-muted)]">
        No open automations — intelligence will suggest FAQs, tasks, and products
        as activity grows.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.slice(0, 6).map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {a.kind.replace(/_/g, " ")} · {a.priority}
            </p>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              className="text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
            {a.title}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
            {a.detail}
          </p>
          {a.actionable && onAct && (
            <button
              type="button"
              onClick={() => onAct(a)}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              <Wand2 className="h-3 w-3" />
              Apply suggestion
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DomainInsightGrid({
  snapshot,
}: {
  snapshot: IntelligenceSnapshot;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {snapshot.domains.map((d) => (
        <article
          key={d.domain}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
              {INTELLIGENCE_DOMAIN_LABELS[d.domain]}
            </h4>
            <span className="text-[11px] font-black text-[var(--color-text-primary)]">
              {d.health}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {d.headline}
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-[var(--color-text-muted)]">
            {d.bullets.map((b) => (
              <li key={b} className="line-clamp-2">
                · {b}
              </li>
            ))}
          </ul>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${d.health}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * Unified Intelligence Platform panel — reads derived snapshot only.
 */
export function IntelligenceDashboard({
  snapshot,
  onActAutomation,
  compact,
}: {
  snapshot: IntelligenceSnapshot;
  onActAutomation?: (a: AutomationSuggestion) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
            <Brain className="h-3.5 w-3.5" />
            Intelligence Platform
          </p>
          <h3 className="mt-1 text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
            AI that connects every feature
          </h3>
          <p className="mt-0.5 max-w-xl text-[13px] text-[var(--color-text-muted)]">
            Recommendations, automations, and analytics derived from workspace,
            messages, knowledge, commerce, and live — one layer, no duplicate
            fetches.
          </p>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)]" suppressHydrationWarning>
          Intelligence snapshot
        </p>
      </header>

      <section className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          Unified insights
        </h4>
        <UnifiedAnalyticsStrip analytics={snapshot.analytics} />
      </section>

      {!compact && <DomainInsightGrid snapshot={snapshot} />}

      <section className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Personalized recommendations
        </h4>
        <RecommendationRail recommendations={snapshot.recommendations} />
      </section>

      <section className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          Automations
        </h4>
        <AutomationSuggestions
          automations={snapshot.automations}
          onAct={onActAutomation}
        />
      </section>
    </div>
  );
}
