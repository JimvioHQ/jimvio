"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Loader2, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import {
  SharedCommunityCard,
  CreateCommunityTile,
  CommunityRow,
} from "./community-card-shared";
import { COMMUNITY_CATEGORIES } from "@/lib/community/categories";

const SHELL = "mx-auto w-full max-w-8xl px-4 sm:px-6";

const CATEGORIES = ["All", ...COMMUNITY_CATEGORIES] as const;
type Category = (typeof CATEGORIES)[number];

const SORTS = [
  { value: "popular", label: "Most active" },
  { value: "newest", label: "Newest" },
  { value: "free", label: "Free first" },
] as const;
type SortKey = (typeof SORTS)[number]["value"];

type PriceFilter = "all" | "free" | "paid";

function sortFreeFirst(list: CommunityRow[]): CommunityRow[] {
  return list.slice().sort((a, b) => (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1));
}

function featuredEyebrow(priceFilter: PriceFilter): string {
  if (priceFilter === "free") return "Top free community";
  if (priceFilter === "paid") return "Top paid community";
  return "Most active right now";
}

function filterByPrice(list: CommunityRow[], price: PriceFilter): CommunityRow[] {
  if (price === "free") return list.filter((c) => c.is_free);
  if (price === "paid") return list.filter((c) => !c.is_free);
  return list;
}

function priceLabel(c: CommunityRow): string | null {
  if (c.is_free) return "Free";
  const price = Number(c.monthly_price);
  if (!price || Number.isNaN(price)) return "Paid";
  return `${c.currency || "$"}${price.toFixed(0)}/mo`;
}

const GRID =
  "grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="h-[112px] bg-[var(--color-surface-secondary)]" />
      <div className="space-y-2.5 p-3.5 pt-6">
        <div className="h-4 w-3/4 rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-3 w-full rounded bg-[var(--color-surface-secondary)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-surface-secondary)]" />
        <div className="mt-3 h-8 rounded-lg bg-[var(--color-surface-secondary)]" />
      </div>
    </div>
  );
}

function CommunitiesHero({
  community,
  priceFilter,
}: {
  community: CommunityRow;
  priceFilter: PriceFilter;
}) {
  const price = priceLabel(community);
  const owner =
    community.profiles?.full_name || community.profiles?.username || null;

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] sm:mb-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid sm:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[200px] sm:min-h-[260px]">
            {community.cover_image ? (
              <Image
                src={community.cover_image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 40vw"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-[var(--color-accent)]/90" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent sm:bg-gradient-to-t sm:from-black/55 sm:via-black/15 sm:to-transparent" />
          </div>

          <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {featuredEyebrow(priceFilter)}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                {community.name}
              </h2>
              {community.tagline && (
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                  {community.tagline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-muted)]">
              <span>{formatNumber(community.member_count ?? 0)} members</span>
              {price && (
                <>
                  <span aria-hidden>·</span>
                  <span
                    className={cn(
                      community.is_free &&
                        "font-medium text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {price}
                  </span>
                </>
              )}
              {owner && (
                <>
                  <span aria-hidden>·</span>
                  <span>by {owner}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/communities/${community.slug}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-text-primary)] px-4 text-[13px] font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90"
              >
                View community
                <ArrowUpRight size={14} />
              </Link>
              <Link
                href={`/communities/${community.slug}/subscribe`}
                className="inline-flex h-9 items-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)]"
              >
                {community.is_free ? "Join free" : "Join now"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Before you join
        </p>
        <ul className="mt-4 flex flex-1 flex-col gap-3 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          <li>See member count and price before you commit.</li>
          <li>Free groups let you lurk first; paid groups bill monthly.</li>
          <li>Owners can run courses, live rooms, and chat in one hub.</li>
        </ul>
        <Link
          href="/communities/create"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)]"
        >
          Start your own
        </Link>
      </div>
    </section>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = SORTS.find((s) => s.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <span>Sort</span>
        <span className="font-medium text-[var(--color-text-primary)]">
          {current.label}
        </span>
        <ChevronDown
          size={13}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        >
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="option"
              aria-selected={s.value === value}
              onClick={() => {
                onChange(s.value);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3.5 py-2.5 text-left text-[13px] transition-colors",
                s.value === value
                  ? "bg-[var(--color-accent-light)] font-medium text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceFilterChips({
  value,
  onChange,
}: {
  value: PriceFilter;
  onChange: (v: PriceFilter) => void;
}) {
  const options: { value: PriceFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "free", label: "Free" },
    { value: "paid", label: "Paid" },
  ];

  return (
    <div
      className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5"
      role="group"
      aria-label="Filter by price"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "h-7 rounded-md px-3 text-[12px] font-medium transition-colors",
            value === opt.value
              ? "bg-[var(--color-text-primary)] text-[var(--color-bg)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function CommunitiesDiscovery({
  initialCommunities = [],
  initialTotal = 0,
}: {
  initialCommunities?: CommunityRow[];
  initialTotal?: number;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [items, setItems] = useState<CommunityRow[]>(initialCommunities);
  const [loading, setLoading] = useState(initialCommunities.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (p: number, append: boolean) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      if (debounced) params.set("search", debounced);
      if (category !== "All") params.set("category", category);
      if (sort !== "free") params.set("sort", sort);
      const res = await fetch(`/api/communities?${params.toString()}`);
      const json = (await res.json()) as {
        communities?: CommunityRow[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Failed to load");
      const raw = json.communities ?? [];
      setItems((prev) => (append ? [...prev, ...raw] : raw));
      setTotal(json.total ?? 0);
    },
    [debounced, category, sort]
  );

  useEffect(() => {
    if (!debounced && category === "All" && initialCommunities.length > 0) {
      if (sort !== "popular" && sort !== "free") {
        setLoading(true);
        fetchPage(1, false)
          .catch(() => setItems([]))
          .finally(() => setLoading(false));
        return;
      }
      setItems(initialCommunities);
      setTotal(initialTotal);
      setLoading(false);
      return;
    }
    setPage(1);
    setLoading(true);
    fetchPage(1, false)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debounced, category, sort, fetchPage, initialCommunities, initialTotal]);

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

  const visibleItems = useMemo(
    () => {
      const filtered = filterByPrice(items, priceFilter);
      return sort === "free" ? sortFreeFirst(filtered) : filtered;
    },
    [items, priceFilter, sort]
  );

  const hasMore = items.length < total;
  const showHero = !debounced && visibleItems.length > 0;
  const heroCommunity = showHero ? visibleItems[0] : null;
  const gridItems = showHero ? visibleItems.slice(1) : visibleItems;

  const hasFilter =
    category !== "All" ||
    sort !== "popular" ||
    priceFilter !== "all" ||
    !!debounced;

  const resetAll = () => {
    setCategory("All");
    setSort("popular");
    setPriceFilter("all");
    setSearch("");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className={`${SHELL} pb-28 pt-10 sm:pb-20 sm:pt-14`}>
        <header className="mb-8 sm:mb-10">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-[var(--color-text-primary)]">
                Communities
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                Paid memberships, free groups, and private hubs — browse by topic,
                compare pricing, and join in one click.
              </p>
            </div>

            <Link
              href="/communities/create"
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] sm:inline-flex"
            >
              Start a community
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="relative mt-7">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by community name…"
              aria-label="Search communities"
              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-11 pr-11 text-[15px] text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        <div className="sticky top-[var(--navbar-height,64px)] z-30 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-0 pt-1">
            <nav
              aria-label="Filter by category"
              className="-mb-px flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar"
            >
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={active}
                    className={cn(
                      "h-10 shrink-0 border-b-2 px-3 text-[13px] font-medium transition-colors sm:px-4",
                      active
                        ? "border-[var(--color-text-primary)] text-[var(--color-text-primary)]"
                        : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-3 pb-1.5">
              <PriceFilterChips value={priceFilter} onChange={setPriceFilter} />
              <div className="hidden sm:block">
                <SortMenu value={sort} onChange={setSort} />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-medium tabular-nums text-[var(--color-text-primary)]">
                  {formatNumber(priceFilter === "all" ? total : visibleItems.length)}
                </span>{" "}
                {visibleItems.length === 1 ? "community" : "communities"}
                {debounced && (
                  <>
                    {" "}
                    for{" "}
                    <span className="text-[var(--color-text-primary)]">
                      &ldquo;{debounced}&rdquo;
                    </span>
                  </>
                )}
                {category !== "All" && (
                  <>
                    {" "}
                    in{" "}
                    <span className="text-[var(--color-text-primary)]">{category}</span>
                  </>
                )}
                {priceFilter !== "all" && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-[var(--color-text-primary)]">
                      {priceFilter === "free" ? "free" : "paid"}
                    </span>
                  </>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            {hasFilter && (
              <button
                type="button"
                onClick={resetAll}
                className="text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
              >
                Reset
              </button>
            )}
            <div className="sm:hidden">
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className={GRID}>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center sm:py-24">
            <p className="font-medium text-[var(--color-text-primary)]">
              No communities match.
            </p>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
              Widen your search or try another category.
            </p>
            {hasFilter && (
              <button
                type="button"
                onClick={resetAll}
                className="mt-5 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {heroCommunity && (
              <CommunitiesHero
                community={heroCommunity}
                priceFilter={priceFilter}
              />
            )}

            <div className={GRID}>
              {gridItems.map((c) => (
                <SharedCommunityCard key={c.id} c={c} />
              ))}
              {!debounced && category === "All" && (
                <CreateCommunityTile />
              )}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] px-6 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && (
          <aside className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              On the roadmap
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Search across taglines, tags, and creator names",
                "Tag pages linked from community profiles",
                "Server-side sort and filters (not just this page)",
                "Clone a community template when creating yours",
                "Live activity indicators (posts today, online members)",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-[12px] leading-snug text-[var(--color-text-muted)]"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 sm:hidden">
          <Link
            href="/communities/create"
            className="pointer-events-auto flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-text-primary)] text-[14px] font-medium text-[var(--color-bg)] shadow-lg shadow-black/10"
          >
            Start a community
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
