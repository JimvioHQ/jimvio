"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { listingQuality, type ListingQualityInput } from "@/lib/marketplace/listing-quality";

const LEVEL = {
  excellent: { label: "Excellent", tone: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
  good: { label: "Good", tone: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
  fair: { label: "Fair", tone: "text-amber-700 bg-amber-50 ring-amber-200" },
  "needs-work": { label: "Incomplete", tone: "text-slate-600 bg-slate-100 ring-slate-200" },
} as const;

/** N-5: shows the buyer how complete this listing is, and why. */
export function ListingQualityCard({ product, className }: { product: ListingQualityInput; className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const q = listingQuality(product);
  const level = LEVEL[q.level];

  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
      >
        <span className="text-[18px] font-black tabular-nums text-[var(--color-text-primary)]">
          {q.score}
          <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">/100</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-[var(--color-text-primary)]">Listing quality</span>
          <span className="block truncate text-[11px] text-[var(--color-text-muted)]">How complete this listing is</span>
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", level.tone)}>{level.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-[var(--color-text-muted)] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="border-t border-[var(--color-border)] px-3 py-2.5">
          <ul className="space-y-1.5">
            {q.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[12px]">
                {c.earned === c.points ? (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-label="Met" />
                ) : (
                  <Minus className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-muted)]" aria-label="Not fully met" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-[var(--color-text-primary)]">{c.label}</span>
                  <span className="text-[var(--color-text-muted)]"> — {c.detail}</span>
                </span>
                <span className="tabular-nums text-[var(--color-text-muted)]">
                  {c.earned}/{c.points}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-4 text-[var(--color-text-muted)]">
            Scored automatically from this listing&apos;s details. It does not rate the product itself.
          </p>
        </div>
      ) : null}
    </div>
  );
}
