"use client";

import type { BusinessGraphPayload } from "@/lib/business-graph/types";
import { BusinessGraphMiniRow } from "./BusinessGraphNodeCard";

export function BusinessProfileRelations({ graph }: { graph: BusinessGraphPayload }) {
  if (!graph.profileRelations.length) return null;

  return (
    <section aria-label="Business relationships" className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 sm:p-5">
      <header>
        <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">Business relationships</h3>
        <p className="text-[12px] text-[var(--color-text-muted)]">Commercial connections for {graph.contextTitle}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {graph.profileRelations.map((section) => (
          <div key={section.id}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.nodes.slice(0, 4).map((node) => (
                <BusinessGraphMiniRow key={node.id} node={node} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
