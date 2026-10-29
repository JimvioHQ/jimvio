"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clapperboard, Loader2 } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { UGCHeroHeader } from "./UGCHeroHeader";
import { UGCFeaturedHeader, UGCFeaturedHeaderSkeleton } from "./UGCFeaturedHeader";
import { UGCPremiumCampaignCard } from "./UGCPremiumCampaignCard";
import { UGCTrustStrip } from "./UGCTrustStrip";
import type {
  CompensationFilter,
  ContentTypeFilter,
  EndingFilter,
  PlatformKey,
  SortKey,
} from "./ugc-tokens";

const LIMIT = 24;
/** Mobile: true 2-column equal grid. sm+: fixed-width auto-fill like desktop marketplace cards. */
const CARD_GRID =
  "grid grid-cols-2 justify-start gap-2 sm:gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(220px,236px))]";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
      <div className="aspect-[4/3] animate-pulse bg-[#F3F4F6] sm:aspect-[16/9]" />
      <div className="space-y-1.5 px-2 pb-2 pt-2 sm:px-2.5 sm:pb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-[#F3F4F6] sm:h-[18px] sm:w-[18px]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[#F3F4F6] sm:w-24" />
        </div>
        <div className="h-3.5 w-full animate-pulse rounded bg-[#F3F4F6] sm:h-4" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-14 animate-pulse rounded bg-[#F3F4F6] sm:w-20" />
          <div className="h-4 w-10 animate-pulse rounded-full bg-[#EBF5FF] sm:h-5 sm:w-14" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return <UGCFeaturedHeaderSkeleton />;
}

export function UGCDiscoverPage({
  initialCampaigns,
  initialTotal,
}: {
  /** Server-rendered first page (P0-6) so the page is never an empty shell. */
  initialCampaigns?: UGCCampaign[];
  initialTotal?: number;
} = {}) {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type");
  const sortParam = searchParams.get("sort");

  const [rawCampaigns, setRawCampaigns] = useState<UGCCampaign[]>(initialCampaigns ?? []);
  const [loading, setLoading] = useState(!initialCampaigns);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [hasMore, setHasMore] = useState(true);
  const [contentType, setContentType] = useState<ContentTypeFilter>(() => {
    if (typeParam === "clipping") return "clipping";
    if (typeParam === "ugc") return "ugc";
    return "all";
  });
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [sort, setSort] = useState<SortKey>(() => {
    if (
      sortParam === "budget" ||
      sortParam === "payout" ||
      sortParam === "popular" ||
      sortParam === "deadline"
    ) {
      return sortParam;
    }
    return "newest";
  });
  const [compensation, setCompensation] = useState<CompensationFilter>("all");
  const [ending, setEnding] = useState<EndingFilter>("all");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<UGCCampaign[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(LIMIT),
          status: "active",
          sort,
        });
        if (contentType !== "all") params.set("type", contentType);
        if (platform !== "all") params.set("platform", platform);
        if (compensation !== "all") params.set("payment_model", compensation);
        if (ending === "soon") params.set("ending", "soon");
        if (search.trim()) params.set("q", search.trim());
        if (countryQuery.trim()) params.set("country", countryQuery.trim());

        const res = await fetch(`/api/ugc/campaigns?${params}`);
        if (res.ok) {
          const json = await res.json();
          const batch = (json.data ?? []) as UGCCampaign[];
          setFetchError(false);
          setTotal(json.total ?? 0);
          setRawCampaigns((prev) => (replace ? batch : [...prev, ...batch]));
          setHasMore(batch.length === LIMIT && pageNum * LIMIT < (json.total ?? 0));
        } else if (replace) {
          setRawCampaigns([]);
          setTotal(0);
          setHasMore(false);
          setFetchError(true);
        }
      } catch {
        if (replace) {
          setRawCampaigns([]);
          setTotal(0);
          setHasMore(false);
          setFetchError(true);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [contentType, platform, sort, search, compensation, ending, countryQuery],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filter changes
    setPage(1);
    void fetchPage(1, true);
  }, [contentType, platform, sort, search, compensation, ending, countryQuery, fetchPage]);

  useEffect(() => {
    if (page > 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pagination driven by intersection observer
      void fetchPage(page, false);
    }
  }, [page, fetchPage]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeaturedLoading(true);
      try {
        const res = await fetch("/api/ugc/campaigns?status=active&featured=true&limit=8&sort=popular");
        if (!res.ok) {
          if (!cancelled) setFeaturedCampaigns([]);
          return;
        }
        const json = await res.json();
        if (!cancelled) setFeaturedCampaigns((json.data ?? []) as UGCCampaign[]);
      } catch {
        if (!cancelled) setFeaturedCampaigns([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFilters =
    contentType !== "all" ||
    platform !== "all" ||
    compensation !== "all" ||
    ending !== "all" ||
    !!search.trim() ||
    !!countryQuery.trim();

  function handleSearchInput(val: string) {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  }

  function handleCountry(val: string) {
    setCountry(val);
    if (countryDebounce.current) clearTimeout(countryDebounce.current);
    countryDebounce.current = setTimeout(() => setCountryQuery(val), 400);
  }

  function clearSearch() {
    setInputVal("");
    setSearch("");
    searchRef.current?.focus();
  }

  function resetAll() {
    setContentType("all");
    setPlatform("all");
    setSort("newest");
    setCompensation("all");
    setEnding("all");
    setCountry("");
    setCountryQuery("");
    clearSearch();
  }

  const campaigns = rawCampaigns;
  const showFeaturedHeader =
    !hasFilters && (featuredLoading || featuredCampaigns.length > 0);
  const showFeaturedSkeleton = !hasFilters && featuredLoading;

  return (
    <div className="ugc-discover-page mx-auto w-full min-w-0 max-w-[1440px] overflow-x-clip pb-10">
      <div className="mb-5 min-w-0 max-w-full">
      <header className="ugc-discover-heading mb-4 min-w-0 max-w-full sm:mb-5">
        <h1 className="max-w-full break-words text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#111827] sm:text-[32px] dark:text-[#F9FAFB]">
          UGC & Clipping
        </h1>
        <p className="mt-1 max-w-full break-words text-[14px] leading-snug text-[#9CA3AF] sm:text-[15px]">
          Featured campaigns / creator opportunities
        </p>
      </header>

      <UGCHeroHeader
        searchRef={searchRef}
        inputVal={inputVal}
        onSearchChange={handleSearchInput}
        onClearSearch={clearSearch}
        contentType={contentType}
        onContentTypeChange={setContentType}
        platform={platform}
        onPlatformChange={setPlatform}
        sort={sort}
        onSortChange={setSort}
        compensation={compensation}
        onCompensationChange={setCompensation}
        ending={ending}
        onEndingChange={setEnding}
        country={country}
        onCountryChange={handleCountry}
        onClearAll={resetAll}
        hasFilters={hasFilters}
      />
      </div>

      {loading && !campaigns.length ? (
        <>
          {showFeaturedSkeleton ? <FeaturedSkeleton /> : null}
          <div className={CARD_GRID}>
            {Array.from({ length: 10 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          {showFeaturedSkeleton ? <FeaturedSkeleton /> : null}
          {showFeaturedHeader && !featuredLoading ? (
            <UGCFeaturedHeader campaigns={featuredCampaigns.slice(0, 8)} />
          ) : null}

          <section id="all-campaigns">
            <div className="mb-2.5 flex min-w-0 items-baseline justify-between gap-2 sm:gap-3">
              <h2 className="min-w-0 truncate text-[16px] font-semibold tracking-tight text-[#111827] sm:text-[18px]">
                {search ? `Results for “${search}”` : "All Campaigns"}
              </h2>
            </div>

            {fetchError && campaigns.length === 0 ? (
              <div className="rounded-[16px] border border-rose-200 bg-rose-50 py-12 text-center">
                <p className="text-sm font-bold text-rose-800">Couldn’t load campaigns.</p>
                <p className="mt-1 text-[13px] text-rose-700/80">Check your connection and try again.</p>
                <button
                  type="button"
                  onClick={() => void fetchPage(1, true)}
                  className="mt-4 text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white py-14 text-center">
                <Clapperboard className="mx-auto mb-3 h-8 w-8 text-[#D1D5DB]" />
                <p className="text-sm font-bold text-[#111827]">
                  {hasFilters ? "No campaigns match your filters." : "No live campaigns yet"}
                </p>
                <p className="mt-1 text-[13px] text-[#64748B]">
                  {hasFilters
                    ? "Try adjusting filters or search terms."
                    : "Brands publish briefs here when campaigns go live."}
                </p>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-4 text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={CARD_GRID}>
                {campaigns.map((c, i) => (
                  <UGCPremiumCampaignCard key={c.id} campaign={c} index={i} density="compact" />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="flex justify-center py-6">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" />
                  Loading more…
                </div>
              ) : null}
            </div>
            <UGCTrustStrip />
          </section>
        </>
      )}
    </div>
  );
}
