"use client";

import { memo, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getBusinessHealth, type HealthSegment, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { OsCard, cn } from "../os-ui";

function tint(accent: string, pct: number) {
  return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
}

const RISK_META: Record<HealthSegment["risk"], { label: string; color: string }> = {
  low: { label: "Low risk", color: "#16A34A" },
  medium: { label: "Medium risk", color: "#CA8A04" },
  high: { label: "High risk", color: "#DC2626" },
};

const TREND_META: Record<HealthSegment["trend"], { Icon: typeof TrendingUp; color: string }> = {
  up: { Icon: TrendingUp, color: "#16A34A" },
  flat: { Icon: Minus, color: "#64748B" },
  down: { Icon: TrendingDown, color: "#DC2626" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#CA8A04";
  return "#DC2626";
}

const ScoreRing = memo(function ScoreRing({ score, accent }: { score: number; accent: string }) {
  const color = scoreColor(score);
  return (
    <div
      className="relative grid size-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, ${tint(accent, 10)} 0deg)` }}
      role="img"
      aria-label={`Overall business health score: ${score} out of 100`}
    >
      <div className="grid size-[62px] place-items-center rounded-full bg-[var(--color-surface)]">
        <span className="text-[19px] font-bold tracking-tight text-[var(--color-text-primary)]">{score}</span>
      </div>
    </div>
  );
});

const SegmentRow = memo(function SegmentRow({
  segment,
  accent,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: {
  segment: HealthSegment;
  accent: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  buttonId: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const trend = TREND_META[segment.trend];
  const risk = RISK_META[segment.risk];
  const TrendIcon = trend.Icon;

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
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-inset"
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold"
            style={{ background: tint(accent, 12), color: accent }}
          >
            {segment.score}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              {segment.label}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-muted)]">
              <TrendIcon className="size-3" style={{ color: trend.color }} aria-hidden />
              <span
                className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ background: tint(risk.color, 12), color: risk.color }}
              >
                {risk.label}
              </span>
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
          <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{segment.explanation}</p>
          <Link
            href={segment.actionHref}
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: accent }}
          >
            {segment.actionLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
});

export type BusinessHealthWidgetProps = {
  mode: OsWorkspaceMode;
  accent?: string;
  className?: string;
};

/**
 * Business Health Widget — overall score ring plus 8 expandable domain
 * segments (one open at a time). Advisory only: every action is a Link to an
 * existing route, nothing here reads or writes real business data.
 */
export const BusinessHealthWidget = memo(function BusinessHealthWidget({
  mode,
  accent = "#16A34A",
  className,
}: BusinessHealthWidgetProps) {
  const idPrefix = useId();
  const health = useMemo(() => getBusinessHealth(mode), [mode]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <OsCard as="section" padding="lg" className={cn("flex flex-col gap-5 rounded-3xl", className)}>
      <div className="flex items-start gap-4">
        <ScoreRing score={health.score} accent={accent} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Business Health
          </p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Predictive Commerce Engine
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">{health.summary}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {health.segments.map((segment) => {
          const isOpen = segment.id === openId;
          return (
            <SegmentRow
              key={segment.id}
              segment={segment}
              accent={accent}
              isOpen={isOpen}
              onToggle={() => setOpenId(isOpen ? null : segment.id)}
              panelId={`${idPrefix}-panel-${segment.id}`}
              buttonId={`${idPrefix}-button-${segment.id}`}
            />
          );
        })}
      </div>
    </OsCard>
  );
});

export default BusinessHealthWidget;
