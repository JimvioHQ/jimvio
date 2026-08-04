"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getRisks, type OsWorkspaceMode, type PredictiveRisk } from "@/lib/jimvio-os";
import { OsCard, cn } from "../os-ui";

const SEVERITY_META: Record<PredictiveRisk["severity"], { label: string; color: string }> = {
  critical: { label: "Critical", color: "#DC2626" },
  high: { label: "High", color: "#EA580C" },
  medium: { label: "Medium", color: "#CA8A04" },
  low: { label: "Low", color: "#64748B" },
};

function tint(color: string, pct: number) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export type RiskEngineWidgetProps = {
  mode: OsWorkspaceMode;
  className?: string;
};

/**
 * Risk Engine Widget — 3–4 severity-flagged risks with impact and a
 * recommendation. Advisory only: nothing here changes orders, inventory, or
 * anything else automatically — every CTA is a Link to an existing route.
 */
export const RiskEngineWidget = memo(function RiskEngineWidget({ mode, className }: RiskEngineWidgetProps) {
  const risks = useMemo(() => getRisks(mode), [mode]);

  if (risks.length === 0) return null;

  return (
    <section aria-label="Risk Engine" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: tint("#DC2626", 12), color: "#DC2626" }}
        >
          <AlertTriangle className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">Risk Engine</h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            Flags worth reviewing — nothing acts automatically
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {risks.map((risk) => {
          const severity = SEVERITY_META[risk.severity];
          return (
            <OsCard key={risk.id} padding="md" className="rounded-2xl">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: tint(severity.color, 14), color: severity.color }}
                    >
                      {severity.label}
                    </span>
                    <h3 className="truncate text-[13.5px] font-semibold text-[var(--color-text-primary)]">
                      {risk.title}
                    </h3>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {risk.confidence}%
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{risk.impact}</p>
                <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-text-secondary)]">Recommendation: </span>
                  {risk.recommendation}
                </p>
                <Link
                  href={risk.href}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-[transform,background-color,border-color] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    borderColor: tint(severity.color, 28),
                    color: severity.color,
                    background: tint(severity.color, 8),
                  }}
                >
                  {risk.cta}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
            </OsCard>
          );
        })}
      </div>
    </section>
  );
});

export default RiskEngineWidget;
