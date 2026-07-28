"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clapperboard, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { UGCHeroHeader } from "./UGCHeroHeader";
import { UGCFeaturedCarousel } from "./UGCFeaturedCarousel";
import { UGCPremiumCampaignCard } from "./UGCPremiumCampaignCard";
import { UGCCampaignRow, UGCCampaignRowItem } from "./UGCCampaignRow";
import { filterCampaigns, sortCampaigns } from "./ugc-campaign-utils";
import type { ContentTypeFilter, PlatformKey, SortKey } from "./ugc-tokens";

const LIMIT = 24;

function CardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#EEF0F2] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04)]">
      <div
        className={
          featured
            ? "aspect-[16/10] animate-pulse bg-[#F3F4F6] sm:h-[132px] sm:aspect-auto"
            : "aspect-[16/10] animate-pulse bg-[#F3F4F6] sm:h-[112px] sm:aspect-auto"
        }
      />
      <div className="space-y-2 px-4 pb-3.5 pt-3.5">
        <div className="flex items-center gap-1.5">
          <div className="h-[18px] w-[18px] animate-pulse rounded-full bg-[#F3F4F6]" />
          <div className="h-2.5 w-16 animate-pulse rounded bg-[#F3F4F6]" />
        </div>
        <div className="h-3 w-full animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#F3F4F6]" />
        <div className="flex justify-between pt-1">
          <div className="h-2.5 w-16 animate-pulse rounded bg-[#F3F4F6]" />
          <div className="h-4 w-12 animate-pulse rounded bg-[#F3F4F6]" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  count,
}: {
  title: string;
  href?: string;
  count?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-tight text-[#111827]">{title}</h2>
      <div className="flex items-center gap-2">
        {href ? (
          <Link
            href={href}
            className="text-[12px] font-semibold text-[#FF5A1F] transition-colors hover:text-[#E54E18] hover:underline"
          >
            View all
          </Link>
        ) : count ? (
          <span className="text-[11px] font-medium text-[#9CA3AF]">{count}</span>
        ) : null}
        <div className="hidden items-center gap-1 sm:flex">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[#E8EAED] bg-white text-[#9CA3AF]">
            <ChevronLeft className="h-3.5 w-3.5" />
          </span>
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[#E8EAED] bg-white text-[#9CA3AF]">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function UGCDiscoverPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type");

  const [rawCampaigns, setRawCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [contentType, setContentType] = useState<ContentTypeFilter>(() => {
    if (typeParam === "clipping") return "clipping";
    if (typeParam === "ugc") return "ugc";
    return "all";
  });
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(LIMIT),
        status: "active",
      });
      if (contentType !== "all") params.set("type", contentType);

      const res = await fetch(`/api/ugc/campaigns?${params}`);
      if (res.ok) {
        const json = await res.json();
        const batch = (json.data ?? []) as UGCCampaign[];
        setTotal(json.total ?? 0);
        setRawCampaigns((prev) => (replace ? batch : [...prev, ...batch]));
        setHasMore(batch.length === LIMIT && pageNum * LIMIT < (json.total ?? 0));
      } else if (replace) {
        setRawCampaigns([]);
        setTotal(0);
        setHasMore(false);
      }
    } catch {
      if (replace) {
        setRawCampaigns([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [contentType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filter changes
    setPage(1);
    void fetchPage(1, true);
  }, [contentType, fetchPage]);

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

  const campaigns = useMemo(() => {
    const filtered = filterCampaigns(rawCampaigns, { search, platform, contentType });
    return sortCampaigns(filtered, sort);
  }, [rawCampaigns, search, platform, contentType, sort]);

  const featuredCarouselList = useMemo(
    () => sortCampaigns([...campaigns], "popular").slice(0, 5),
    [campaigns],
  );

  const featuredGridList = useMemo(
    () => sortCampaigns([...campaigns], "popular").slice(0, 6),
    [campaigns],
  );

  const showCarousel =
    !loading && featuredCarouselList.length > 0 && !search.trim() && platform === "all";

  const hasFilters = contentType !== "all" || platform !== "all" || !!search.trim();

  function handleSearchInput(val: string) {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
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
    clearSearch();
  }

  return (
    <div className="w-full pb-12 pt-1">
      <UGCHeroHeader
        searchRef={searchRef}
        inputVal={inputVal}
        onSearchChange={handleSearchInput}
        onClearSearch={clearSearch}
        contentType={contentType}
        onContentTypeChange={(v) => {
          setContentType(v);
          setPage(1);
        }}
        platform={platform}
        onPlatformChange={setPlatform}
        sort={sort}
        onSortChange={setSort}
        onClearAll={resetAll}
        hasFilters={hasFilters}
      />

      {loading ? (
        <UGCCampaignRow scrollable={false}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} featured={i < 3} />
          ))}
        </UGCCampaignRow>
      ) : (
        <>
          {showCarousel && <UGCFeaturedCarousel campaigns={featuredCarouselList} />}

          {featuredGridList.length > 0 && (
            <section className="mb-5">
              <SectionHeader title="Featured Campaigns" href="/ugc?featured=1" />
              <UGCCampaignRow>
                {featuredGridList.map((c, i) => (
                  <UGCCampaignRowItem key={c.id} featured>
                    <UGCPremiumCampaignCard campaign={c} index={i} featured />
                  </UGCCampaignRowItem>
                ))}
              </UGCCampaignRow>
            </section>
          )}

          <section>
            <SectionHeader
              title={search ? `Results for “${search}”` : "All Campaigns"}
              count={
                !search
                  ? `${campaigns.length.toLocaleString()} of ${total.toLocaleString()}`
                  : undefined
              }
            />

            {campaigns.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-white py-16 text-center shadow-[0_1px_3px_rgba(17,24,39,0.03)]">
                <Clapperboard className="mx-auto mb-3 h-8 w-8 text-[#D1D5DB]" />
                <p className="text-sm font-bold text-[#111827]">
                  {hasFilters ? "No campaigns match your filters" : "No live campaigns yet"}
                </p>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  {hasFilters
                    ? "Try adjusting filters or search terms."
                    : "Brands publish briefs here when campaigns go live."}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-4 text-[12px] font-semibold text-[#FF5A1F] hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <UGCCampaignRow>
                {campaigns.map((c, i) => (
                  <UGCCampaignRowItem key={c.id}>
                    <UGCPremiumCampaignCard campaign={c} index={i} />
                  </UGCCampaignRowItem>
                ))}
              </UGCCampaignRow>
            )}

            <div ref={loadMoreRef} className="flex justify-center py-7">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" />
                  Loading more…
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
