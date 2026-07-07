"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Search,
  Clock,
  TrendingUp,
  Package,
  Tag,
  Store,
  Trash2,
} from "lucide-react";
import type { SearchSuggestion } from "@/lib/marketplace/search-engine";
import { cn } from "@/lib/utils";

type NavItem =
  | { type: "chip"; term: string; chipKind: "recent" | "popular" | "category" }
  | { type: "suggestion"; suggestion: SearchSuggestion; queryFallback: string };

export type MarketplaceSearchPopoverHandle = {
  onKeyDown: (e: React.KeyboardEvent) => boolean;
};

type Props = {
  query: string;
  type: "physical" | "digital";
  open: boolean;
  recentSearches: string[];
  popularSearches: string[];
  trendingCategories: string[];
  onPick: (term: string) => void;
  onSubmit: (term: string) => void;
  onClearRecent?: () => void;
};

const SUGGESTION_CACHE = new Map<string, SearchSuggestion[]>();
const CACHE_TTL_MS = 60_000;
const cacheTimestamps = new Map<string, number>();

function cacheKey(q: string, type: string) {
  return `${type}:${q.toLowerCase()}`;
}

function getCachedSuggestions(q: string, type: string): SearchSuggestion[] | null {
  const key = cacheKey(q, type);
  const ts = cacheTimestamps.get(key);
  if (!ts || Date.now() - ts > CACHE_TTL_MS) return null;
  return SUGGESTION_CACHE.get(key) ?? null;
}

function setCachedSuggestions(q: string, type: string, items: SearchSuggestion[]) {
  const key = cacheKey(q, type);
  SUGGESTION_CACHE.set(key, items);
  cacheTimestamps.set(key, Date.now());
}

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[var(--color-accent-light)] px-0.5 font-bold text-[var(--color-accent)] not-italic">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function kindLabel(kind: SearchSuggestion["kind"]) {
  switch (kind) {
    case "category":
      return "Category";
    case "product":
      return "Product";
    default:
      return "Search";
  }
}

function kindIcon(kind: SearchSuggestion["kind"]) {
  switch (kind) {
    case "category":
      return <Tag className="size-3.5 shrink-0 text-[var(--color-accent)]" />;
    case "product":
      return <Package className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />;
    default:
      return <Search className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />;
  }
}

function SuggestionSkeletons() {
  return (
    <div className="space-y-1.5 px-1 py-1" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-2 rounded-lg px-2.5 py-2.5"
          style={{ background: "var(--color-surface-secondary)" }}
        >
          <div className="size-3.5 rounded bg-[var(--color-border)]" />
          <div className="h-3 flex-1 rounded bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  );
}

function EmptySearchIllustration() {
  return (
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-light)]" aria-hidden>
      <Search className="size-6 text-[var(--color-accent)]" />
    </div>
  );
}

export const MarketplaceSearchPopover = forwardRef<MarketplaceSearchPopoverHandle, Props>(
  function MarketplaceSearchPopover(
    {
      query,
      type,
      open,
      recentSearches,
      popularSearches,
      trendingCategories,
      onPick,
      onSubmit,
      onClearRecent,
    },
    ref,
  ) {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

    const q = query.trim();

    useEffect(() => {
      if (!open || q.length < 1) {
        setSuggestions([]);
        setLoading(false);
        setActiveIndex(-1);
        return;
      }

      const cached = getCachedSuggestions(q, type);
      if (cached) {
        setSuggestions(cached);
        setLoading(false);
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
          const items = Array.isArray(data.suggestions) ? data.suggestions : [];
          if (!controller.signal.aborted) {
            setCachedSuggestions(q, type, items);
            setSuggestions(items);
          }
        } catch {
          if (!controller.signal.aborted) setSuggestions([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }, 220);

      return () => {
        clearTimeout(id);
        controller.abort();
      };
    }, [q, type, open]);

    const navItems: NavItem[] = useMemo(() => {
      if (q.length === 0) {
        const chips: NavItem[] = [
          ...recentSearches.slice(0, 8).map((term) => ({
            type: "chip" as const,
            term,
            chipKind: "recent" as const,
          })),
          ...popularSearches.map((term) => ({
            type: "chip" as const,
            term,
            chipKind: "popular" as const,
          })),
          ...trendingCategories.map((term) => ({
            type: "chip" as const,
            term,
            chipKind: "category" as const,
          })),
        ];
        return chips;
      }
      return suggestions.map((suggestion) => ({
        type: "suggestion" as const,
        suggestion,
        queryFallback: q,
      }));
    }, [q, recentSearches, popularSearches, trendingCategories, suggestions]);

    useEffect(() => {
      setActiveIndex(-1);
    }, [q, open, navItems.length]);

    const activateItem = useCallback(
      (item: NavItem) => {
        if (item.type === "chip") {
          if (item.chipKind === "category") onPick(item.term);
          else onSubmit(item.term);
          return;
        }
        const { suggestion } = item;
        if (suggestion.kind === "product") onSubmit(suggestion.label);
        else if (suggestion.kind === "category") onPick(suggestion.label);
        else onSubmit(q);
      },
      [onPick, onSubmit, q],
    );

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!open || navItems.length === 0) return false;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % navItems.length);
          return true;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i <= 0 ? navItems.length - 1 : i - 1));
          return true;
        }
        if (e.key === "Enter" && activeIndex >= 0) {
          e.preventDefault();
          activateItem(navItems[activeIndex]);
          return true;
        }
        if (e.key === "Escape") {
          setActiveIndex(-1);
          return false;
        }
        if (e.key === "Tab") {
          setActiveIndex(-1);
          return false;
        }
        return false;
      },
      [open, navItems, activeIndex, activateItem],
    );

    useImperativeHandle(ref, () => ({ onKeyDown }), [onKeyDown]);

    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return;
      const el = listRef.current.querySelector(`[data-nav-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const showEmptyState = open && q.length > 0 && !loading && suggestions.length === 0;

    const grouped = useMemo(() => {
      if (q.length === 0) return null;
      const products = suggestions.filter((s) => s.kind === "product");
      const categories = suggestions.filter((s) => s.kind === "category");
      const queries = suggestions.filter((s) => s.kind === "query");
      return { products, categories, queries };
    }, [q, suggestions]);

    if (!open) return null;

    let navCursor = 0;

    return (
      <div
        role="listbox"
        aria-label="Search suggestions"
        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
        style={{ animation: "fadeInUp 180ms ease-out" }}
      >
        <div ref={listRef} className="max-h-[min(70vh,420px)] overflow-y-auto p-2 sm:p-3">
          {q.length === 0 ? (
            <div className="space-y-4">
              {recentSearches.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      <Clock className="size-3" />
                      Recent searches
                    </div>
                    {onClearRecent && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onClearRecent}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
                      >
                        <Trash2 className="size-3" />
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 8).map((t) => {
                      const idx = navCursor++;
                      return (
                        <button
                          key={`recent-${t}`}
                          type="button"
                          data-nav-index={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onSubmit(t)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color,border-color] duration-200",
                            activeIndex === idx
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:scale-[1.02] hover:border-[var(--color-accent)]/30",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <TrendingUp className="size-3" />
                  Popular searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((t) => {
                    const idx = navCursor++;
                    return (
                      <button
                        key={`pop-${t}`}
                        type="button"
                        data-nav-index={idx}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSubmit(t)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color,border-color] duration-200",
                          activeIndex === idx
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:scale-[1.02] hover:border-[var(--color-accent)]/30",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {trendingCategories.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <Store className="size-3" />
                    Trending categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingCategories.map((t) => {
                      const idx = navCursor++;
                      return (
                        <button
                          key={`cat-${t}`}
                          type="button"
                          data-nav-index={idx}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onPick(t)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color,border-color] duration-200",
                            activeIndex === idx
                              ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:scale-[1.02] hover:border-[var(--color-accent)]/30",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {loading && <SuggestionSkeletons />}

              {!loading && grouped && (
                <>
                  {[
                    { title: "Products", items: grouped.products },
                    { title: "Categories", items: grouped.categories },
                    { title: "Suggestions", items: grouped.queries },
                  ].map(({ title, items }) =>
                    items.length === 0 ? null : (
                      <div key={title}>
                        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {title}
                        </p>
                        <div className="space-y-0.5">
                          {items.map((item) => {
                            const idx = navCursor++;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                data-nav-index={idx}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                  activateItem({
                                    type: "suggestion",
                                    suggestion: item,
                                    queryFallback: q,
                                  })
                                }
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left transition-[transform,background-color] duration-200",
                                  activeIndex === idx
                                    ? "scale-[1.01] bg-[var(--color-accent-light)]"
                                    : "hover:scale-[1.01] hover:bg-[var(--color-surface-secondary)]",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  {kindIcon(item.kind)}
                                  <span className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                                    {highlightMatch(
                                      item.kind === "query"
                                        ? item.label.replace(/^Search for "/, "").replace(/"$/, "")
                                        : item.label,
                                      q,
                                    )}
                                  </span>
                                </span>
                                <span className="ml-3 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                                  {kindLabel(item.kind)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </>
              )}

              {showEmptyState && (
                <div className="rounded-xl bg-[var(--color-surface-secondary)] px-4 py-5 text-center">
                  <EmptySearchIllustration />
                  <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    No quick matches yet
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    Try a broader term or browse popular picks below.
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSubmit(q)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-[11px] font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Search className="size-3.5" />
                    Search for &ldquo;{q}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {q.length > 0 && !loading && (
          <div className="border-t border-[var(--color-border)] px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
            <span className="hidden sm:inline">↑↓ navigate · </span>Enter to select · Esc to close
          </div>
        )}
      </div>
    );
  },
);
