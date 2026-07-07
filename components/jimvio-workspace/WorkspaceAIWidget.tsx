"use client";

import { Sparkles } from "lucide-react";
import type { WorkspaceAiCard } from "@/lib/jimvio-workspace/types";

export function WorkspaceAIWidget({ cards }: { cards: WorkspaceAiCard[] }) {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
        <Sparkles className="size-3.5" />
        Jimvio AI · placeholders
      </p>
      <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-3 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
            style={{ willChange: "transform" }}
          >
            <p className="text-[11px] font-bold text-[var(--color-text-primary)]">{card.title}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-muted)]">{card.description}</p>
            {card.confidence != null && (
              <p className="mt-2 text-[9px] font-bold uppercase text-[var(--color-accent)]">
                Confidence {card.confidence}% · UI placeholder
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
