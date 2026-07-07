"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GRAPH_NODE_META } from "@/lib/commerce-graph";
import type { GraphPathStep } from "@/lib/commerce-graph/types";

export function CommerceGraphPath({ steps }: { steps: GraphPathStep[] }) {
  if (steps.length < 2) return null;

  return (
    <nav aria-label="Commerce graph path" className="overflow-x-auto pb-1">
      <ol className="flex min-w-0 items-center gap-1">
        {steps.map((step, index) => {
          const meta = GRAPH_NODE_META[step.kind];
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
              )}
              {isLast ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent)]">
                  <span aria-hidden>{meta.emoji}</span>
                  {step.label}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
                >
                  <span aria-hidden>{meta.emoji}</span>
                  <span className="max-w-[120px] truncate sm:max-w-[160px]">{step.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
