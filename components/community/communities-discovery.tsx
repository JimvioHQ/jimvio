"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  category: string | null;
  member_count: number | null;
  is_free: boolean | null;
  monthly_price: number | null;
  yearly_price: number | null;
  lifetime_price: number | null;
  currency: string | null;
  cover_image: string | null;
  avatar_url: string | null;
  created_at?: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
};

const CATEGORIES = ["All", "Business", "Tech", "Marketing", "Finance", "Fitness", "Other"] as const;
type SortKey = "popular" | "newest" | "free";

function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
  const copy = [...list];
  if (sort === "popular") {
    copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
  } else if (sort === "newest") {
    copy.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  } else {
    copy.sort((a, b) => {
      const fa = a.is_free ? 1 : 0;
      const fb = b.is_free ? 1 : 0;
      return fb - fa;
    });
  }
  return copy;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden animate-pulse">
      <div className="h-[180px] bg-[var(--color-surface-secondary)]" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-[var(--color-surface-secondary)] rounded w-3/4" />
        <div className="h-3 bg-[var(--color-surface-secondary)] rounded w-full" />
        <div className="h-8 bg-[var(--color-surface-secondary)] rounded-xl w-24" />
      </div>
    </div>
  );
}

export function CommunitiesDiscovery() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      if (debounced) params.set("search", debounced);
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/communities?${params.toString()}`);
      const json = (await res.json()) as {
        communities?: CommunityRow[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const raw = json.communities ?? [];
      const sk = sortRef.current;
      if (append) setItems((prev) => sortCommunities([...prev, ...raw], sk));
      else setItems(sortCommunities(raw, sk));
      setTotal(json.total ?? 0);
    },
    [debounced, category]
  );

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPage(1, false)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debounced, category, fetchPage]);

  useEffect(() => {
    setItems((prev) => sortCommunities(prev, sort));
  }, [sort]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      await fetchPage(next, true);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tight">
            Explore Communities
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[var(--color-text-muted)] font-medium">
            Find your tribe. Learn, earn, and grow together.
          </p>
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="pl-10 h-12 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            />
          </div>
        </header>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-colors border",
                  category === c
                    ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]/30"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-border)]"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-sm font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text-primary)]"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="free">Price: Free First</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
            <p className="text-[var(--color-text-secondary)] font-semibold">No communities found</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Try another search or category.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {items.map((c) => (
                <article
                  key={c.id}
                  className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/25 transition-all duration-200"
                >
                  <div className="relative h-[180px] bg-[var(--color-surface-secondary)]">
                    {c.cover_image ? (
                      <Image
                        src={c.cover_image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-secondary)]" />
                    )}
                    <div className="absolute -bottom-8 left-4 z-10">
                      <div className="h-16 w-16 rounded-2xl border-4 border-[var(--color-surface)] bg-[var(--color-surface-secondary)] overflow-hidden shadow-md">
                        {c.avatar_url ? (
                          <Image src={c.avatar_url} alt="" width={64} height={64} className="object-cover h-full w-full" unoptimized />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[var(--color-accent)] font-black text-lg">
                            {c.name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-10 px-4 pb-4">
                    <h2 className="font-black text-[var(--color-text-primary)] text-lg leading-tight line-clamp-1">{c.name}</h2>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-1">{c.tagline || " "}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {c.category && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">
                          {c.category}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {formatNumber(c.member_count ?? 0)} members
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {c.is_free ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[var(--color-success-light)] text-[var(--color-success)]">
                          Free
                        </span>
                      ) : (
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                          From {c.currency || "USD"}{" "}
                          {Number(c.monthly_price ?? 0) > 0 ? Number(c.monthly_price).toFixed(0) : "—"}/mo
                        </span>
                      )}
                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black"
                      >
                        <Link href={`/communities/${c.slug}`}>View Community</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl font-bold border-[var(--color-border)]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
