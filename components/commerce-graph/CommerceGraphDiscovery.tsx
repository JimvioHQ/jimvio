"use client";

import { Sparkles } from "lucide-react";
import type { CommerceGraphPayload } from "@/lib/commerce-graph/types";
import { CommerceGraphPath } from "./CommerceGraphPath";
import { CommerceGraphSection } from "./CommerceGraphSection";
import { CommerceGraphMiniRow } from "./CommerceGraphNodeCard";

type CommerceGraphDiscoveryProps = {
  graph: CommerceGraphPayload;
  loading?: boolean;
  maxSections?: number;
  showPath?: boolean;
  className?: string;
};

export function CommerceGraphDiscovery({
  graph,
  loading = false,
  maxSections,
  showPath = true,
  className,
}: CommerceGraphDiscoveryProps) {
  const sections = maxSections ? graph.sections.slice(0, maxSections) : graph.sections;
  if (!loading && !sections.length) return null;

  return (
    <section
      aria-label="Commerce graph discovery"
      className={className}
      style={{ animation: "jimvio-commerce-graph-enter 280ms ease-out" }}
    >
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Commerce Graph
        </p>
        <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-xl">
          Connected across Jimvio
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Move naturally between products, creators, communities, and campaigns — no dead ends.
        </p>
        {showPath && graph.path.length > 1 && (
          <div className="mt-3">
            <CommerceGraphPath steps={graph.path} />
          </div>
        )}
      </header>

      <div className="space-y-8">
        {sections.map((section, index) => (
          <CommerceGraphSection
            key={section.id}
            section={section}
            loading={loading}
            staggerIndex={index}
          />
        ))}
      </div>
    </section>
  );
}

type CommerceGraphPanelProps = {
  graph: CommerceGraphPayload;
  loading?: boolean;
  title?: string;
};

export function CommerceGraphPanel({
  graph,
  loading = false,
  title = "Connected in this graph",
}: CommerceGraphPanelProps) {
  if (!loading && !graph.panelSections.length) return null;

  return (
    <aside
      aria-label="Commerce graph contextual panel"
      className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ animation: "jimvio-commerce-graph-enter 280ms ease-out" }}
    >
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          <Sparkles className="size-3.5" />
          Smart Panel
        </p>
        <h3 className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{title}</h3>
        {graph.path.length > 1 && (
          <div className="mt-2">
            <CommerceGraphPath steps={graph.path} />
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        {loading ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`panel-skel-${i}`} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]" />
            ))}
          </div>
        ) : (
          graph.panelSections.map((section) => (
            <div key={section.id}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.nodes.slice(0, 4).map((node) => (
                  <CommerceGraphMiniRow key={node.id} node={node} />
                ))}
              </div>
            </div>
          ))
        )}

        <div
          className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 p-3"
          aria-label="AI graph placeholders"
        >
          <p className="mb-1 text-[10px] font-bold uppercase text-[var(--color-accent)]">AI readiness</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Placeholders for relationship strength, confidence, and explanations — ready for AI services.
          </p>
        </div>
      </div>
    </aside>
  );
}
