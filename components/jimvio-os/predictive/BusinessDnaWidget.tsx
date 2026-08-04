"use client";

import { memo, useMemo } from "react";
import { Dna } from "lucide-react";
import { getBusinessDna, type OsWorkspaceMode } from "@/lib/jimvio-os";
import { OsCard, cn } from "../os-ui";

const DNA_ACCENT = "#7C3AED";

export type BusinessDnaWidgetProps = {
  mode: OsWorkspaceMode;
  className?: string;
};

/**
 * Business DNA Widget — a calm stacked-bar composition of what's driving the
 * business right now, personalized per workspace mode. Presentation only.
 */
export const BusinessDnaWidget = memo(function BusinessDnaWidget({ mode, className }: BusinessDnaWidgetProps) {
  const dna = useMemo(() => getBusinessDna(mode), [mode]);

  return (
    <OsCard as="section" padding="lg" className={cn("flex flex-col gap-4 rounded-3xl", className)}>
      <div className="flex items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${DNA_ACCENT} 14%, transparent)`, color: DNA_ACCENT }}
        >
          <Dna className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">Business DNA</h2>
          <p className="truncate text-[12px] text-[var(--color-text-muted)]">
            What&apos;s driving your business mix right now
          </p>
        </div>
      </div>

      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]"
        role="img"
        aria-label="Business DNA composition"
      >
        {dna.slices.map((slice) => (
          <div
            key={slice.id}
            className="h-full transition-[flex-basis] duration-300 ease-out"
            style={{ flex: `0 0 ${slice.percent}%`, background: slice.accent }}
            title={`${slice.label}: ${slice.percent}%`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {dna.slices.map((slice) => (
          <div key={slice.id} className="flex min-w-0 items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ background: slice.accent }} aria-hidden />
            <span className="truncate text-[11.5px] text-[var(--color-text-secondary)]">{slice.label}</span>
            <span className="ml-auto shrink-0 text-[11.5px] font-semibold text-[var(--color-text-primary)]">
              {slice.percent}%
            </span>
          </div>
        ))}
      </div>

      <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
        {dna.insight}
      </p>
    </OsCard>
  );
});

export default BusinessDnaWidget;
