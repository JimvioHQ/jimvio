"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { getOpportunities, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { OsCard, cn } from "../os-ui";

const ACCENT = "#16A34A";

function tint(pct: number) {
  return `color-mix(in srgb, ${ACCENT} ${pct}%, transparent)`;
}

export type OpportunityEngineWidgetProps = {
  mode: OsWorkspaceMode;
  className?: string;
};

/**
 * Opportunity Engine Widget — 3–4 premium, advisory-only opportunity cards
 * with a metric, confidence, WHY explanation, expected outcome, and a
 * single-click CTA that links to an existing route. Never auto-acts.
 */
export const OpportunityEngineWidget = memo(function OpportunityEngineWidget({
  mode,
  className,
}: OpportunityEngineWidgetProps) {
  const opportunities = useMemo(() => getOpportunities(mode), [mode]);

  if (opportunities.length === 0) return null;

  return (
    <section aria-label="Opportunity Engine" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: tint(14), color: ACCENT }}
        >
          <TrendingUp className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Opportunity Engine
          </h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            AI-detected revenue opportunities — advisory only
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {opportunities.map((opp) => (
          <OsCard key={opp.id} padding="lg" className="flex flex-col gap-3 rounded-3xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">{opp.title}</h3>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: tint(12), color: ACCENT }}
              >
                {opp.confidence}% confidence
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{opp.detail}</p>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3.5 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {opp.metricLabel}
              </p>
              <p className="mt-0.5 text-[18px] font-bold tracking-tight" style={{ color: ACCENT }}>
                {opp.metricValue}
              </p>
            </div>

            <div className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
              <Sparkles className="mt-0.5 size-3 shrink-0" style={{ color: ACCENT }} aria-hidden />
              <span>
                <span className="font-semibold text-[var(--color-text-secondary)]">Why: </span>
                {opp.why}
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-secondary)]">Expected: </span>
              {opp.expectedOutcome}
            </p>

            <Link
              href={opp.href}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: ACCENT }}
            >
              {opp.cta}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </OsCard>
        ))}
      </div>
    </section>
  );
});

export default OpportunityEngineWidget;
