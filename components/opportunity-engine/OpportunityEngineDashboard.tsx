"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";
import type { OpportunityEngineData, OpportunityFilterId } from "@/lib/opportunity-engine/types";
import { filterOpportunities } from "@/lib/opportunity-engine/filters";
import { OpportunityCardView, OpportunityCardSkeleton, OpportunityMiniRow } from "./OpportunityCard";
import { OpportunityFilters } from "./OpportunityFilters";

type OpportunityEngineDashboardProps = {
  data: OpportunityEngineData;
  loading?: boolean;
};

function LazySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="transition-[opacity,transform] duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        willChange: "transform, opacity",
      }}
    >
      <h3 className="mb-3 text-[13px] font-bold text-[var(--color-text-primary)]">{title}</h3>
      {visible ? children : <OpportunityCardSkeleton />}
    </section>
  );
}

export function OpportunityEngineDashboard({ data, loading = false }: OpportunityEngineDashboardProps) {
  const [activeFilters, setActiveFilters] = useState<Set<OpportunityFilterId>>(new Set());

  const filtered = useMemo(
    () => filterOpportunities(data.allOpportunities, activeFilters),
    [data.allOpportunities, activeFilters],
  );

  const toggleFilter = (id: OpportunityFilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (id === "all") return new Set();
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 sm:p-5">
        <OpportunityCardSkeleton featured />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OpportunityCardSkeleton key={`opp-skel-${i}`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Jimvio Opportunity Engine"
      className="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 sm:p-5"
      style={{ animation: "jimvio-opportunity-enter 280ms ease-out" }}
    >
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Opportunity Engine
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-2xl">
          Best opportunities to earn today
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Not recommendations — actionable earning opportunities ranked for creators.
        </p>
      </header>

      {data.todaysBest && (
        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[13px] font-bold text-[var(--color-text-primary)]">
            <Sparkles className="size-4 text-[var(--color-accent)]" />
            Today&apos;s Best Opportunity
          </h3>
          <OpportunityCardView opportunity={data.todaysBest} featured />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <OpportunityFilters activeFilters={activeFilters} onToggle={toggleFilter} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 9).map((opportunity) => (
            <OpportunityCardView key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LazySection title="Weekly Trends">
          <div className="space-y-2">
            {data.weeklyTrends.map((item) => (
              <OpportunityMiniRow key={item.id} opportunity={item} />
            ))}
          </div>
        </LazySection>

        <LazySection title="Recommended Actions">
          <div className="space-y-2">
            {data.recommendedActions.map((item) => (
              <OpportunityMiniRow key={item.id} opportunity={item} />
            ))}
          </div>
        </LazySection>
      </div>

      <LazySection title="Top Categories">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.topCategories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 transition-[transform,border-color] duration-200 hover:scale-[1.01] hover:border-[var(--color-accent)]/30"
            >
              <p className="font-semibold text-[var(--color-text-primary)]">{cat.name}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <TrendingUp className="size-3" />
                {cat.growth}
              </p>
            </Link>
          ))}
        </div>
      </LazySection>

      <div className="grid gap-5 lg:grid-cols-2">
        <LazySection title="Trending Products">
          <div className="space-y-2">
            {data.trendingProducts.map((item) => (
              <OpportunityMiniRow key={item.id} opportunity={item} />
            ))}
          </div>
        </LazySection>

        <LazySection title="Trending Creators">
          <div className="space-y-2">
            {data.trendingCreators.length ? (
              data.trendingCreators.map((creator) => (
                <Link
                  key={creator.id}
                  href={creator.href ?? "/influencers/browse"}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--color-accent)]/10 text-xs font-bold text-[var(--color-accent)]">
                    {creator.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">{creator.name}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{creator.badge}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Creator trends appear here soon.</p>
            )}
          </div>
        </LazySection>
      </div>
    </section>
  );
}
