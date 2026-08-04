"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { getGrowthSuggestions, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { cn } from "../os-ui";

const ACCENT = "#CA8A04";

function tint(pct: number) {
  return `color-mix(in srgb, ${ACCENT} ${pct}%, transparent)`;
}

export type GrowthEngineWidgetProps = {
  mode: OsWorkspaceMode;
  className?: string;
};

/**
 * Growth Engine Widget — concise growth suggestions, each with an explicit
 * WHY and the signals behind it. Advisory only: every card links to an
 * existing route so the human decides whether to act.
 */
export const GrowthEngineWidget = memo(function GrowthEngineWidget({ mode, className }: GrowthEngineWidgetProps) {
  const suggestions = useMemo(() => getGrowthSuggestions(mode), [mode]);

  if (suggestions.length === 0) return null;

  return (
    <section aria-label="Growth Engine" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: tint(14), color: ACCENT }}
        >
          <Lightbulb className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">Growth Engine</h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">Concise moves worth considering next</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="group flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 transition-[transform,border-color] duration-200 hover:-translate-y-px hover:border-[var(--color-border-strong)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">{s.title}</h3>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                style={{ background: tint(12), color: ACCENT }}
              >
                {s.confidence}%
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-secondary)]">Why: </span>
              {s.why}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {s.signals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: tint(8), color: ACCENT }}
                >
                  {signal}
                </span>
              ))}
            </div>
            <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11.5px] font-semibold text-[var(--color-text-secondary)] transition-transform duration-200 group-hover:translate-x-0.5">
              {s.cta}
              <ArrowRight className="size-3" style={{ color: ACCENT }} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
});

export default GrowthEngineWidget;
