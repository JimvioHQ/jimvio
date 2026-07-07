"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BUSINESS_SEARCH_FILTERS, filterBusinessNodes } from "@/lib/business-graph";
import type { BusinessGraphPayload, BusinessSearchKind } from "@/lib/business-graph/types";
import { BusinessGraphMiniRow } from "./BusinessGraphNodeCard";
import { cn } from "@/lib/utils";

type FilterId = BusinessSearchKind | "all";

export function BusinessGraphSearch({ graph }: { graph: BusinessGraphPayload }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const results = useMemo(
    () => filterBusinessNodes(graph.searchableNodes, query, filter),
    [graph.searchableNodes, query, filter],
  );

  return (
    <section aria-label="Business graph search" className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Discover creators, brands, campaigns…"
          className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 pl-10 pr-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          aria-label="Search business graph"
        />
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Search filters">
        {BUSINESS_SEARCH_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
              filter === f.id ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="max-h-[280px] space-y-1.5 overflow-y-auto">
        {results.length ? (
          results.slice(0, 12).map((node) => (
            <li key={node.id}><BusinessGraphMiniRow node={node} /></li>
          ))
        ) : (
          <li className="py-6 text-center text-[12px] text-[var(--color-text-muted)]">No matches in this graph.</li>
        )}
      </ul>
    </section>
  );
}
