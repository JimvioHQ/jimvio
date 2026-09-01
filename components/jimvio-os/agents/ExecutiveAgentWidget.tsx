"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { getExecutiveMorningBrief, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { usePrefersReducedMotion } from "@/hooks/use-is-mobile";
import { cn } from "../os-ui";

const ACCENT = "#4F46E5";

function tint(pct: number) {
  return `color-mix(in srgb, ${ACCENT} ${pct}%, transparent)`;
}

const TONE_COLOR: Record<"positive" | "neutral" | "attention", string> = {
  positive: "#16A34A",
  neutral: "#64748B",
  attention: "#DC2626",
};

export type ExecutiveAgentWidgetProps = {
  /** Optional workspace mode — lightly personalizes the morning brief content. */
  mode?: OsWorkspaceMode;
  className?: string;
};

/**
 * Executive Agent Widget — Mission Control's morning brief, distilled from
 * every specialized agent via the Predictive Commerce Engine. Recommend-only:
 * presents scaffold copy and links to existing routes; never edits data.
 */
export const ExecutiveAgentWidget = memo(function ExecutiveAgentWidget({
  mode,
  className,
}: ExecutiveAgentWidgetProps) {
  const brief = useMemo(() => getExecutiveMorningBrief(mode), [mode]);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      aria-label="Executive Agent — morning brief"
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5 sm:p-6",
        !reducedMotion && "transition-[transform,box-shadow] duration-200",
        className,
      )}
      style={{
        borderColor: tint(22),
        background: `linear-gradient(160deg, ${tint(12)} 0%, color-mix(in srgb, var(--color-surface) 90%, transparent) 46%, ${tint(6)} 100%)`,
        boxShadow: `0 12px 40px ${tint(10)}`,
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: ACCENT }}
          >
            <Sparkles className="size-3.5" aria-hidden />
            Executive Agent
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {brief.greeting}
          </h2>
        </div>
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            !reducedMotion && "transition-transform duration-200 hover:scale-[1.02]",
          )}
          style={{ background: ACCENT }}
        >
          Agent Center
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {brief.yesterday.map((item) => {
          const color = TONE_COLOR[item.tone];
          const Icon = item.tone === "attention" ? AlertTriangle : TrendingUp;
          return (
            <div
              key={item.label}
              className="flex items-start gap-2.5 rounded-2xl border border-white/40 bg-white/40 px-3.5 py-3 dark:border-white/5 dark:bg-white/5"
            >
              <span
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                aria-hidden
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[12.5px] font-medium leading-snug text-[var(--color-text-secondary)]">
                  {item.value}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Needs your attention
          </p>
          <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{brief.attention}</p>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Recommended next
          </p>
          <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{brief.recommendation}</p>
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-white/40 bg-white/30 px-3.5 py-3 text-[12px] leading-relaxed text-[var(--color-text-muted)] dark:border-white/5 dark:bg-white/5">
        <span className="font-semibold text-[var(--color-text-secondary)]">Expected impact: </span>
        {brief.expectedImpact}
      </p>

      <div className="mt-5">
        <Link
          href={brief.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2",
            !reducedMotion && "transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px",
          )}
          style={{
            borderColor: tint(28),
            color: ACCENT,
            background: tint(8),
          }}
        >
          {brief.cta}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </section>
  );
});

export default ExecutiveAgentWidget;
