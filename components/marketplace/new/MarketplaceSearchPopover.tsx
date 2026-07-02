"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Clock, TrendingUp } from "lucide-react";
import type { SearchSuggestion } from "@/lib/marketplace/search-engine";

type Props = {
  query: string;
  type: "physical" | "digital";
  open: boolean;
  recentSearches: string[];
  popularSearches: string[];
  trendingCategories: string[];
  onPick: (term: string) => void;
  onSubmit: (term: string) => void;
};

export function MarketplaceSearchPopover({
  query,
  type,
  open,
  recentSearches,
  popularSearches,
  trendingCategories,
  onPick,
  onSubmit,
}: Props) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const q = query.trim();

  useEffect(() => {
    if (!open || q.length < 1) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/marketplace/suggestions?q=${encodeURIComponent(q)}&type=${type}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [q, type, open]);

  const showEmptyState = useMemo(
    () => open && q.length > 0 && !loading && suggestions.length === 0,
    [open, q, loading, suggestions.length],
  );

  if (!open) return null;

  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      style={{
        animation: "fadeInUp 180ms ease-out",
      }}
    >
      <div className="p-2 sm:p-3">
        {q.length === 0 ? (
          <div className="space-y-3">
            {recentSearches.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                  <Clock className="size-3" />
                  Recent
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSubmit(t)}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]/80"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                <TrendingUp className="size-3" />
                Popular searches
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSubmit(t)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]/80"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                Trending categories
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingCategories.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(t)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]/80"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {loading && (
              <div className="px-2 py-2 text-[11px] text-[var(--color-text-muted)]">
                Finding matches...
              </div>
            )}

            {!loading &&
              suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (item.kind === "product") onSubmit(item.label);
                    else if (item.kind === "category") onPick(item.label);
                    else onSubmit(q);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all duration-200 hover:scale-[1.01] hover:bg-[var(--color-surface-secondary)]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.kind === "category" ? (
                      <Sparkles className="size-3.5 shrink-0 text-[var(--color-accent)]" />
                    ) : (
                      <Search className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
                    )}
                    <span className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.kind === "category" ? "Category" : item.kind === "query" ? "Search" : "Product"}
                  </span>
                </button>
              ))}

            {showEmptyState && (
              <div className="rounded-lg bg-[var(--color-surface-secondary)] px-3 py-3">
                <div className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                  No quick matches yet
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSubmit(q)}
                  className="mt-2 text-[11px] font-bold text-[var(--color-accent)] hover:underline"
                >
                  Search for &ldquo;{q}&rdquo;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
