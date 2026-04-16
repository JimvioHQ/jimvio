"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, Loader2, Users, Flame, Sparkles, Crown, TrendingUp,
  ArrowRight, Star, Zap, Globe, Lock, Gift, BadgeCheck, X,
  SlidersHorizontal, ChevronDown, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatNumber } from "@/lib/utils";
import { SharedCommunityCard, CommunityRow } from "./community-card-shared";

const CATEGORIES = [
  { label: "All", icon: Globe },
  { label: "Business", icon: TrendingUp },
  { label: "Tech", icon: Zap },
  { label: "Marketing", icon: Flame },
  { label: "Finance", icon: Star },
  { label: "Fitness", icon: Sparkles },
  { label: "Other", icon: Gift },
] as const;

type SortKey = "popular" | "newest" | "free";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "free", label: "Free First" },
];

function sortCommunities(list: CommunityRow[], sort: SortKey): CommunityRow[] {
  const copy = [...list];
  if (sort === "popular") copy.sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0));
  else if (sort === "newest") copy.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
  else copy.sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
  return copy;
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden animate-pulse">
      <div className="h-44 bg-[var(--color-surface-secondary)]" />
      <div className="p-5 pt-10 space-y-3">
        <div className="h-5 bg-[var(--color-surface-secondary)] rounded-lg w-3/4" />
        <div className="h-3 bg-[var(--color-surface-secondary)] rounded-lg w-full" />
        <div className="h-3 bg-[var(--color-surface-secondary)] rounded-lg w-2/3" />
        <div className="flex gap-2 pt-1">
          <div className="h-8 bg-[var(--color-surface-secondary)] rounded-xl flex-1" />
          <div className="h-8 bg-[var(--color-surface-secondary)] rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Hero Card (top community spotlight) ─── */
function FeaturedCard({ c }: { c: CommunityRow }) {
  return (
    <Link
      href={`/communities/${c.slug}`}
      className="group relative col-span-full lg:col-span-2 rounded-3xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] min-h-[280px] flex flex-col justify-end shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* BG image */}
      <div className="absolute inset-0">
        {c.cover_image ? (
          <Image src={c.cover_image} alt="" fill className="object-cover" sizes="60vw" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      {/* Hot badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
        <Flame size={11} className="animate-pulse" /> Featured
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 flex items-end gap-4">
        <div className="h-16 w-16 rounded-2xl border-2 border-white/30 bg-black/20 backdrop-blur-md overflow-hidden shrink-0 shadow-xl">
          {c.avatar_url ? (
            <Image src={c.avatar_url} alt="" width={64} height={64} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white font-black text-xl">{c.name?.[0]}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-black text-white text-xl leading-tight">{c.name}</h2>
            <BadgeCheck size={16} className="text-sky-400 shrink-0" />
          </div>
          <p className="text-white/70 text-sm mt-0.5 line-clamp-1">{c.tagline}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-white/60 text-xs">
              <Users size={12} /> {formatNumber(c.member_count ?? 0)} members
            </span>
            {c.is_free ? (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">FREE</span>
            ) : (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900/10 text-white/70 border border-white/20">
                From {c.currency || "$"}{Number(c.monthly_price ?? 0).toFixed(0)}/mo
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-zinc-900 text-[var(--color-accent)] font-black text-sm group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all shadow-lg">
          Join <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

/* ─── CTA Banner ─── */
function CreateCTACard() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-secondary)] p-6 flex flex-col gap-3 items-start justify-between min-h-[200px]">
      <div>
        <div className="h-10 w-10 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-white mb-3 shadow-lg shadow-[var(--color-accent)]/25">
          <Crown size={20} />
        </div>
        <h3 className="font-black text-[var(--color-text-primary)] text-base leading-tight">
          Launch your own community
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
          Build, grow, and monetize your audience. Start free — no credit card required.
        </p>
      </div>
      <Button
        asChild
        size="sm"
        className="rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shadow-md shadow-[var(--color-accent)]/30 hover:shadow-lg transition-all hover:-translate-y-0.5"
      >
        <Link href="/communities/create">
          <Plus size={14} className="mr-1" /> Create Community
        </Link>
      </Button>
    </div>
  );
}

/* ─── Stats Banner ─── */
function StatsBanner({ total }: { total: number }) {
  const stats = [
    { label: "Communities", value: formatNumber(total), icon: Globe },
    { label: "Active Members", value: "12K+", icon: Users },
    { label: "Launched Today", value: "3", icon: Flame },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
            <Icon size={16} />
          </div>
          <div>
            <p className="font-black text-[var(--color-text-primary)] text-base leading-none">{value}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-semibold">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}



/* ─── Main Component ─── */
export function CommunitiesDiscovery() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (debounced) params.set("search", debounced);
    if (category !== "All") params.set("category", category);
    const res = await fetch(`/api/communities?${params.toString()}`);
    const json = await res.json() as { communities?: CommunityRow[]; total?: number; error?: string };
    if (!res.ok) throw new Error(json.error || "Failed to load");
    const raw = json.communities ?? [];
    const sk = sortRef.current;
    if (append) setItems((prev) => sortCommunities([...prev, ...raw], sk));
    else setItems(sortCommunities(raw, sk));
    setTotal(json.total ?? 0);
  }, [debounced, category]);

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchPage(1, false).catch(() => setItems([])).finally(() => setLoading(false));
  }, [debounced, category, fetchPage]);

  useEffect(() => {
    setItems((prev) => sortCommunities(prev, sort));
  }, [sort]);

  const loadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try { await fetchPage(next, true); setPage(next); }
    finally { setLoadingMore(false); }
  };

  const hasMore = items.length < total;
  const featured = items[0] ?? null;
  const rest = items.slice(1);

  const activeFilters = [
    category !== "All" && category,
    sort !== "popular" && SORT_OPTIONS.find(s => s.value === sort)?.label,
    debounced && `"${debounced}"`,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Hero Header ── */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
                  <Globe size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">Discover</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tight leading-tight">
                Find Your Community
              </h1>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)] font-medium max-w-md">
                Join thousands learning, earning and growing together.
              </p>
            </div>
            <Button
              asChild
              className="rounded-2xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black shadow-lg shadow-[var(--color-accent)]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all sm:self-start shrink-0"
            >
              <Link href="/communities/create">
                <Crown size={16} className="mr-2" /> Launch Yours Free
              </Link>
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              {debounced && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, topic, or category…"
                className="pl-11 pr-10 h-12 rounded-2xl border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm focus-visible:ring-[var(--color-accent)]/20"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "h-12 px-4 rounded-2xl border font-bold text-sm flex items-center gap-2 transition-all shrink-0",
                filtersOpen || activeFilters.length > 0
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
              )}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className="h-5 w-5 rounded-full bg-white dark:bg-zinc-900/20 flex items-center justify-center text-[10px] font-black">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="mt-3 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => setCategory(label)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        category === label
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                      )}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Sort by</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        sort === opt.value
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {activeFilters.length > 0 && (
                <button
                  onClick={() => { setCategory("All"); setSort("popular"); setSearch(""); }}
                  className="text-xs font-bold text-[var(--color-danger)] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Active filter chips */}
          {!filtersOpen && activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map((f) => (
                <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] text-[11px] font-bold border border-[var(--color-accent)]/20">
                  {f}
                  <button onClick={() => {
                    if (f === category) setCategory("All");
                    else if (SORT_OPTIONS.find(s => s.label === f)) setSort("popular");
                    else setSearch("");
                  }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Stats */}
        {!loading && <StatsBanner total={total} />}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)]">
              <Search size={24} />
            </div>
            <p className="font-black text-[var(--color-text-primary)]">No communities found</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Try a different search or category</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl"
              onClick={() => { setCategory("All"); setSearch(""); setSort("popular"); }}
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            {/* Featured + create CTA row */}
            {featured && !debounced && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <FeaturedCard c={featured} />
                <CreateCTACard />
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(debounced ? items : rest).map((c, i) => (
                <SharedCommunityCard key={c.id} c={c as any} rank={debounced ? i + 1 : i + 2} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-2xl font-bold border-[var(--color-border)] h-11 px-8 hover:border-[var(--color-accent)]/40 transition-all"
                >
                  {loadingMore ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</>
                  ) : (
                    <>Show more communities <ChevronDown size={16} className="ml-2" /></>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Bottom CTA strip */}
        {!loading && items.length > 0 && (
          <div className="mt-16 rounded-3xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white dark:bg-zinc-900 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white dark:bg-zinc-900 blur-2xl" />
            </div>
            <div className="relative z-10 text-center sm:text-left">
              <h3 className="font-black text-2xl leading-tight">Ready to build something?</h3>
              <p className="text-white/70 text-sm mt-1">Start your own community in minutes. Free forever plan available.</p>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                asChild
                className="rounded-2xl bg-white dark:bg-zinc-900 text-[var(--color-accent)] hover:bg-white dark:bg-zinc-900/90 font-black shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Link href="/communities/create" className="text-white">
                  <Crown size={16} className="mr-2 text-white" /> Create for Free
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl border-white/30 text-white hover:bg-white dark:bg-zinc-900/10 font-bold"
              >
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}