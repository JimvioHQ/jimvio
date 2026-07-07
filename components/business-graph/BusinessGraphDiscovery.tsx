"use client";

import type { BusinessGraphPayload } from "@/lib/business-graph/types";
import { BusinessGraphSection } from "./BusinessGraphSection";
import { BusinessNetworkInsights } from "./BusinessNetworkInsights";
import { BusinessGraphSearch } from "./BusinessGraphSearch";

type BusinessGraphDiscoveryProps = {
  graph: BusinessGraphPayload;
  loading?: boolean;
  maxSections?: number;
  showInsights?: boolean;
  showSearch?: boolean;
  className?: string;
};

export function BusinessGraphDiscovery({
  graph,
  loading = false,
  maxSections,
  showInsights = true,
  showSearch = true,
  className,
}: BusinessGraphDiscoveryProps) {
  const sections = maxSections ? graph.discoverySections.slice(0, maxSections) : graph.discoverySections;
  if (!loading && !sections.length && !showInsights) return null;

  return (
    <section
      aria-label="Jimvio Business Graph discovery"
      className={className}
      style={{ animation: "jimvio-business-graph-enter 280ms ease-out" }}
    >
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Business Graph</p>
        <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-xl">
          Commercial relationships & opportunities
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Discover partners, affiliates, and collaborations — not social connections, but business opportunity.
        </p>
      </header>

      {showSearch && (
        <div className="mb-6">
          <BusinessGraphSearch graph={graph} />
        </div>
      )}

      {showInsights && (
        <div className="mb-6">
          <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">Network insights</h3>
          <BusinessNetworkInsights insights={graph.networkInsights} />
        </div>
      )}

      <div className="space-y-8">
        {sections.map((section, i) => (
          <BusinessGraphSection key={section.id} section={section} loading={loading} staggerIndex={i} />
        ))}
      </div>
    </section>
  );
}
