"use client";

import { Handshake, Sparkles } from "lucide-react";
import type { BusinessGraphPayload } from "@/lib/business-graph/types";
import { BusinessGraphMiniRow } from "./BusinessGraphNodeCard";

export function BusinessCollaborationPanel({
  graph,
  title = "Collaboration opportunities",
}: {
  graph: BusinessGraphPayload;
  title?: string;
}) {
  if (!graph.collaborationSections.length) return null;

  return (
    <aside
      aria-label="Business collaboration panel"
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ animation: "jimvio-business-graph-enter 280ms ease-out" }}
    >
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          <Handshake className="size-3.5" />
          Collaboration
        </p>
        <h3 className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{title}</h3>
      </div>

      <div className="space-y-4 p-4">
        {graph.collaborationSections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {section.title}
            </p>
            <div className="space-y-2">
              {section.nodes.slice(0, 4).map((node) => (
                <BusinessGraphMiniRow key={node.id} node={node} />
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-3" aria-label="AI placeholders">
          <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--color-accent)]">
            <Sparkles className="size-3" /> AI readiness
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Why these collaborators? Growth suggestions and business opportunities — UI placeholders for AI services.
          </p>
        </div>
      </div>
    </aside>
  );
}
