"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { ProductCardClient } from "@/components/marketplace/product-card-client";
import type { DbProduct } from "@/lib/utils";

type Props = {
  initialType: "physical" | "digital";
};

function ProductGrid({ products }: { products: DbProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => (
        <ProductCardClient key={p.id} p={p as Parameters<typeof ProductCardClient>[0]["p"]} />
      ))}
    </div>
  );
}

export function MarketplaceSearchResultsClient({ initialType }: Props) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") === "digital" ? "digital" : initialType;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<DbProduct[]>([]);
  const [similar, setSimilar] = useState<DbProduct[]>([]);
  const [recommended, setRecommended] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [exactMatch, setExactMatch] = useState(true);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setSimilar([]);
      setRecommended([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/marketplace/search?q=${encodeURIComponent(q)}&type=${type}&limit=40`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setResults(data.results ?? []);
        setSimilar(data.similar ?? []);
        setRecommended(data.recommended ?? []);
        setCategories(data.categories ?? []);
        setExactMatch(Boolean(data.exactMatch));
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setSimilar([]);
          setRecommended([]);
          setCategories([]);
          setExactMatch(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, type]);

  const hasResults = exactMatch && results.length > 0;
  const hasSimilar = !exactMatch && similar.length > 0;
  const hasRecommended = !exactMatch && recommended.length > 0;
  const isEmpty = !loading && !hasResults && !hasSimilar && !hasRecommended;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href={`/marketplace?type=${type}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="size-3.5" />
        Back to marketplace
      </Link>

      <div className="mb-5 flex items-center gap-2">
        <Search className="size-4 text-[var(--color-accent)]" />
        <div>
          <h1 className="text-lg font-black text-[var(--color-text-primary)]">
            {q ? `Results for: ${q}` : "Search"}
          </h1>
          {!loading && q && !exactMatch && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              No exact matches found
            </p>
          )}
        </div>
      </div>

      {!loading && categories.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
            Related categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/marketplace?type=${type}&category=${c.slug}`}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/40"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl"
              style={{ background: "var(--color-surface-secondary)" }}
            />
          ))}
        </div>
      ) : hasResults ? (
        <ProductGrid products={results} />
      ) : hasSimilar || hasRecommended ? (
        <div className="space-y-6">
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
              <p className="mb-3 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                Recommended for you
              </p>
              <ProductGrid products={recommended} />
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <div
          className="rounded-xl border border-dashed px-6 py-16 text-center"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-secondary)" }}
        >
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
            No products found
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Try a different keyword or browse categories on the marketplace.
          </p>
        </div>
      ) : null}
    </div>
  );
}
