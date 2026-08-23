"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Sparkles, TrendingUp } from "lucide-react";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import type { DbProduct } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  initialType: "physical" | "digital";
};

const POPULAR_FALLBACK = [
  "Wireless Earbuds",
  "Gaming Headset",
  "Smart Watch",
  "Portable Speaker",
];

function ProductGrid({ products, className }: { products: DbProduct[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className,
      )}
      style={{ animation: "fadeInUp 280ms ease-out" }}
    >
      {products.map((p) => (
        <ProductCardClient key={p.id} p={p as Parameters<typeof ProductCardClient>[0]["p"]} />
      ))}
    </div>
  );
}

function SearchSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <div
            className="aspect-square animate-pulse"
            style={{ background: "var(--color-surface-secondary)" }}
          />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySearchState({
  query,
  type,
  popular,
}: {
  query: string;
  type: string;
  popular: string[];
}) {
  return (
    <div
      className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-6 py-14 text-center"
      style={{ animation: "fadeInUp 280ms ease-out" }}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent-light)]">
        <Search className="size-7 text-[var(--color-accent)]" />
      </div>
      <h2 className="text-base font-bold text-[var(--color-text-primary)]">
        No products found for &ldquo;{query}&rdquo;
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
        Try a different keyword, check spelling, or explore popular searches below.
      </p>
      <div className="mt-6">
        <p className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <TrendingUp className="size-3" />
          Popular searches
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {popular.map((term) => (
            <Link
              key={term}
              href={`/marketplace/search?q=${encodeURIComponent(term)}&type=${type}`}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/40"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
      <Link
        href={`/marketplace?type=${type}`}
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <Sparkles className="size-4" />
        Browse marketplace
      </Link>
    </div>
  );
}

export function MarketplaceSearchResultsClient({ initialType }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") === "digital" ? "digital" : initialType;
  const aiMode = searchParams.get("ai") === "1";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<DbProduct[]>([]);
  const [similar, setSimilar] = useState<DbProduct[]>([]);
  const [recommended, setRecommended] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [exactMatch, setExactMatch] = useState(true);
  const [aiIntent, setAiIntent] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setSimilar([]);
      setRecommended([]);
      setCategories([]);
      setAiIntent(null);
      setSearchError(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setSearchError(false);

    const run = async () => {
      try {
        if (aiMode) {
          const res = await fetch("/api/ai/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, type }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          if (controller.signal.aborted) return;
          const products = (data.products ?? []) as DbProduct[];
          setResults(products);
          setSimilar([]);
          setRecommended([]);
          setCategories([]);
          setExactMatch(products.length > 0);
          const intent = data.intent as { search_term?: string; category?: string; max_price?: number } | undefined;
          setAiIntent(
            intent
              ? [
                  intent.category ? `category: ${intent.category}` : null,
                  intent.max_price ? `under ${intent.max_price}` : null,
                  data.mode ? `mode: ${data.mode}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "AI search"
              : "AI search"
          );
          return;
        }

        const res = await fetch(
          `/api/marketplace/search?q=${encodeURIComponent(q)}&type=${type}&limit=40`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (controller.signal.aborted) return;
        setResults(data.results ?? []);
        setSimilar(data.similar ?? []);
        setRecommended(data.recommended ?? []);
        setCategories(data.categories ?? []);
        setExactMatch(Boolean(data.exactMatch));
        setAiIntent(null);
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setResults([]);
        setSimilar([]);
        setRecommended([]);
        setCategories([]);
        setExactMatch(false);
        setAiIntent(null);
        setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [q, type, aiMode, retry]);

  const hasResults = exactMatch && results.length > 0;
  const hasSimilar = !exactMatch && similar.length > 0;
  const hasRecommended = !exactMatch && recommended.length > 0;
  const isEmpty = !loading && !searchError && !hasResults && !hasSimilar && !hasRecommended;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/marketplace?type=${type}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 rounded-md"
      >
        <ArrowLeft className="size-3.5" />
        Back to marketplace
      </Link>

      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-light)]">
          {aiMode ? (
            <Sparkles className="size-4 text-[var(--color-accent)]" />
          ) : (
            <Search className="size-4 text-[var(--color-accent)]" />
          )}
        </span>
        <div>
          <h1 className="text-lg font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {q ? `${aiMode ? "AI results" : "Results"} for “${q}”` : "Search"}
          </h1>
          {!loading && q && aiIntent && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{aiIntent}</p>
          )}
          {!loading && q && !exactMatch && !aiMode && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              No exact matches — showing similar picks
            </p>
          )}
        </div>
      </div>

      {!loading && categories.length > 0 && (
        <div className="mb-5" style={{ animation: "fadeInUp 220ms ease-out" }}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Related categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/marketplace?type=${type}&category=${c.slug}`}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/40"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SearchSkeletonGrid />
      ) : searchError ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-6 py-14 text-center">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            Couldn’t load search results
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="mt-5 inline-flex rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      ) : hasResults ? (
        <ProductGrid products={results} />
      ) : hasSimilar || hasRecommended ? (
        <div className="space-y-8">
          {hasSimilar && (
            <div>
              <p className="mb-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                Similar products
              </p>
              <ProductGrid products={similar} />
            </div>
          )}
          {hasRecommended && (
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                Popular right now
              </p>
              <ProductGrid products={recommended} />
            </div>
          )}
        </div>
      ) : isEmpty && q ? (
        <EmptySearchState query={q} type={type} popular={POPULAR_FALLBACK} />
      ) : null}
    </div>
  );
}
