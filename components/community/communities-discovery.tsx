"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CommunityCoverImage } from "@/components/community/community-media";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SharedCommunityCard,
  CreateCommunityTile,
  CommunityRow,
} from "./community-card-shared";
import { COMMUNITY_CATEGORIES } from "@/lib/community/categories";
import {
  formatMemberCountLabel,
  resolveCommunityMemberCount,
} from "@/lib/community/member-count";

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

type LeaderboardRow = {
  id: string;
  name: string;
  href: string;
  rank: number;
  score: number;
  subtitle?: string;
};

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
  "grid grid-cols-2 min-[720px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4";

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="h-[96px] sm:h-[112px] bg-[var(--color-surface-secondary)]" />
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
            <CommunityCoverImage
              name={community.name}
              src={community.cover_image}
              featured
              sizes="(max-width: 640px) 100vw, 40vw"
              className="absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent sm:bg-gradient-to-t sm:from-black/55 sm:via-black/15 sm:to-transparent" />
          </div>

          <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {featuredEyebrow(priceFilter)}
              </p>
              <h2 className="mt-2 min-w-0 break-words text-xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                {community.name}
              </h2>
              {community.tagline && (
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                  {community.tagline}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-muted)]">
              <span>{formatMemberCountLabel(community.member_count ?? 0)}</span>
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
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[var(--color-text-primary)] px-4 text-[13px] font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              >
                View community
                <ArrowUpRight size={14} />
              </Link>
              <Link
                href={`/communities/${community.slug}/subscribe`}
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
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
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
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

function TrendingCommunitiesRow({
  items,
  loading,
}: {
  items: CommunityRow[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="mb-8 sm:mb-10">
        <div className="mb-4">
          <h2 className="text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[18px]">
            Trending communities
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Active hubs with real members and conversations
          </p>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[220px] shrink-0 sm:w-[240px]">
              <SkeletonCard />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (items.length === 0) return null;
  const trending = items.slice(0, 8);
  return (
    <section className="mb-8 sm:mb-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[18px]">
            Trending communities
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Active hubs with real members and conversations
          </p>
        </div>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:px-6">
        {trending.map((c) => (
          <div key={c.id} className="w-[220px] shrink-0 sm:w-[240px]">
            <SharedCommunityCard c={c} showQuickActions={false} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LeaderboardPreview({
  rows,
  loading,
}: {
  rows: LeaderboardRow[];
  loading: boolean;
}) {
  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Leaderboard
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Monthly rankings
          </p>
        </div>
        <Link
          href="/communities/leaderboard"
          className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] p-4 text-center text-[13px] text-[var(--color-text-muted)]">
          Loading leaderboard…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-[13px] text-[var(--color-text-muted)]">
          Rankings warming up
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 transition-colors hover:border-[var(--color-accent)]/30"
              >
                <span className="w-8 shrink-0 text-center text-[12px] font-black text-[var(--color-accent)]">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {row.name}
                </span>
                <span className="shrink-0 text-[12px] font-bold text-[var(--color-text-primary)] tabular-nums">
                  {row.score.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MyCommunitiesPreview({
  communities,
  loading,
}: {
  communities: CommunityRow[];
  loading: boolean;
}) {
  return (
    <section className="mt-10 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            My Communities
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Your joined hubs
          </p>
        </div>
        <Link
          href="/communities"
          className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className={GRID}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-10 text-center text-[13px] text-[var(--color-text-muted)]">
          Join a community to see it here.
        </div>
      ) : (
        <div className={GRID}>
          {communities.slice(0, 8).map((c) => (
            <SharedCommunityCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}

export function CommunitiesDiscovery({
  initialCommunities = [],
  initialTotal = 0,
  initialError = false,
}: {
  initialCommunities?: CommunityRow[];
  initialTotal?: number;
  initialError?: boolean;
}) {
  const searchParams = useSearchParams();
  const queryFromUrl = (searchParams.get("search") || searchParams.get("q") || "").trim();
  const [search, setSearch] = useState(queryFromUrl);
  const [debounced, setDebounced] = useState(queryFromUrl);
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [items, setItems] = useState<CommunityRow[]>(initialCommunities);
  const [loading, setLoading] = useState(initialCommunities.length === 0 || Boolean(queryFromUrl));
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(initialError);

  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [myCommunities, setMyCommunities] = useState<CommunityRow[]>([]);
  const [myCommunitiesLoading, setMyCommunitiesLoading] = useState(false);
  const [trendingItems, setTrendingItems] = useState<CommunityRow[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLeaderboardLoading(true);
      try {
        const res = await fetch(`/api/c/hub/leaderboard?tab=communities`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          rows?: LeaderboardRow[];
        };
        if (cancelled) return;
        setLeaderboardRows(Array.isArray(json.rows) ? json.rows : []);
      } catch {
        if (!cancelled) setLeaderboardRows([]);
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTrendingLoading(true);
      try {
        const res = await fetch(`/api/c/hub/discover`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as {
          communities?: Array<{
            id: string;
            name: string;
            slug: string;
            category: string | null;
            tagline: string | null;
            cover_image: string | null;
            avatar_url: string | null;
            member_count: number;
            is_featured?: boolean | null;
            is_free?: boolean | null;
            monthly_price?: number | null;
            currency?: string | null;
          }>;
        };
        if (cancelled) return;
        const rows = Array.isArray(json.communities) ? json.communities : [];
        setTrendingItems(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            tagline: row.tagline,
            category: row.category,
            cover_image: row.cover_image,
            avatar_url: row.avatar_url,
            member_count: resolveCommunityMemberCount(row),
            is_featured: row.is_featured ?? null,
            is_free: row.is_free ?? true,
            monthly_price: row.monthly_price ?? null,
            currency: row.currency ?? null,
            post_count: null,
            is_member: false,
            is_owner: false,
            profiles: null,
          }))
        );
      } catch {
        if (!cancelled) setTrendingItems([]);
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMyCommunitiesLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setMyCommunities([]);
          return;
        }

        const { data, error } = await supabase
          .from("community_memberships")
          .select(
            `role, status,
             communities!inner (
               id, slug, name, tagline, category,
               avatar_url, cover_image, image_url,
               member_count, is_free, monthly_price, currency,
               owner_id, created_at, is_active, is_featured, settings
             )`
          )
          .eq("user_id", user.id)
          .eq("status", "active")
          .eq("communities.is_active", true);

        if (cancelled) return;
        if (error) {
          setMyCommunities([]);
          return;
        }

        const byId = new Map<string, CommunityRow>();
        for (const row of data ?? []) {
          const c = Array.isArray((row as any).communities)
            ? (row as any).communities[0]
            : (row as any).communities;
          if (!c) continue;

          const communityId = String(c.id);
          const isOwner = String(c.owner_id) === user.id;
          byId.set(communityId, {
            id: communityId,
            slug: String(c.slug),
            name: String(c.name),
            tagline: (c.tagline as string | null) ?? null,
            category: (c.category as string | null) ?? null,
            avatar_url: (c.avatar_url as string | null) ?? null,
            cover_image: (c.cover_image as string | null) ?? null,
            image_url: (c.image_url as string | null) ?? null,
            member_count: resolveCommunityMemberCount({
              slug: String(c.slug),
              member_count: Number(c.member_count ?? 0),
              settings: c.settings,
            }),
            is_featured: (c.is_featured as boolean | null | undefined) ?? null,
            is_free: c.is_free as boolean | null | undefined,
            monthly_price: (c.monthly_price as number | null) ?? null,
            currency: (c.currency as string | null) ?? null,
            created_at: (c.created_at as string | null) ?? null,
            post_count: null,
            is_member: true,
            is_owner: isOwner,
            profiles: null,
          });
        }

        setMyCommunities([...byId.values()]);
      } catch {
        if (!cancelled) setMyCommunities([]);
      } finally {
        if (!cancelled) setMyCommunitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (queryFromUrl === search) return;
    setSearch(queryFromUrl);
    setDebounced(queryFromUrl);
  }, [queryFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps -- sync URL → input only

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
      setLoadError(false);
      setItems((prev) => {
        if (!append) return raw;
        const seen = new Set(prev.map((row) => row.id));
        const next = raw.filter((row) => !seen.has(row.id));
        return next.length ? [...prev, ...next] : prev;
      });
      setTotal(json.total ?? 0);
    },
    [debounced, category, sort]
  );

  useEffect(() => {
    // Always hydrate popular Explore from the API so preserved hubs
    // (forex-hub / gcs-unity) stay discoverable even when SSR cache is stale.
    if (!debounced && category === "All" && sort === "popular") {
      setPage(1);
      setLoading(true);
      fetchPage(1, false)
        .catch(() => {
          if (initialCommunities.length) {
            setItems(initialCommunities);
            setTotal(initialTotal);
            setLoadError(false);
          } else {
            setLoadError(true);
            setItems([]);
          }
        })
        .finally(() => setLoading(false));
      return;
    }
    if (!debounced && category === "All" && initialCommunities.length > 0) {
      if (sort !== "free") {
        setLoading(true);
        fetchPage(1, false)
          .catch(() => {
            setLoadError(true);
            setItems([]);
          })
          .finally(() => setLoading(false));
        return;
      }
      setItems(initialCommunities);
      setTotal(initialTotal);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setPage(1);
    setLoading(true);
    fetchPage(1, false)
      .catch(() => {
        setLoadError(true);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [debounced, category, sort, fetchPage, initialCommunities, initialTotal]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      await fetchPage(next, true);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, page]);

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
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

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
      <div className={`${SHELL} pb-24 pt-6 sm:pb-20 sm:pt-14`}>
        <header className="mb-6 sm:mb-10">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-[var(--color-text-primary)]">
                COMMUNITIES
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                Discover communities, creators, conversations and spaces that
                match your interests.
              </p>
            </div>

            <Link
              href="/communities/create"
              className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:inline-flex"
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
              placeholder="Search communities or spaces…"
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
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "min-h-11 shrink-0 border-b-2 px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:px-4",
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
            ) : debounced || category !== "All" || priceFilter !== "all" ? (
              <>
                Showing matches
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
            ) : (
              "Discover public communities"
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
        ) : loadError ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center sm:py-24">
            <p className="font-medium text-[var(--color-text-primary)]">
              Couldn’t load communities. Retry.
            </p>
            <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchPage(1, false)
                  .catch(() => {
                    setLoadError(true);
                    setItems([]);
                  })
                  .finally(() => setLoading(false));
              }}
              className="mt-5 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center sm:py-24">
            {hasFilter ? (
              <>
                <p className="font-medium text-[var(--color-text-primary)]">
                  No communities match.
                </p>
                <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
                  Widen your search or try another category.
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-5 text-[13px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="font-medium text-[var(--color-text-primary)]">
                  No public communities yet.
                </p>
                <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
                  Create a public or private community when you’re ready. Nothing here is placeholder content.
                </p>
                <Link
                  href="/communities/create"
                  className="mt-5 inline-flex text-[13px] font-medium text-[var(--color-accent)] hover:underline"
                >
                  Create community
                </Link>
                <div className={`mx-auto mt-8 max-w-sm ${GRID}`}>
                  <CreateCommunityTile />
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {!debounced && category === "All" ? (
              <TrendingCommunitiesRow
                items={trendingItems}
                loading={trendingLoading}
              />
            ) : null}

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
              <div ref={loadMoreRef} className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] px-6 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                      Loading
                    </>
                  ) : (
                    "Load more communities"
                  )}
                </button>
              </div>
            )}
            {!loading && !hasMore && items.length > 0 && (
              <p
                className="mt-8 text-center text-[12px] text-[var(--color-text-muted)]"
                role="status"
              >
                You&apos;ve reached the end of discoverable communities.
              </p>
            )}
          </>
        )}

        {!loading && (
          <>
            <LeaderboardPreview rows={leaderboardRows} loading={leaderboardLoading} />
            <MyCommunitiesPreview
              communities={myCommunities}
              loading={myCommunitiesLoading}
            />
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
          </>
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
