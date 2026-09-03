"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clapperboard, Loader2 } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { UGCHeroHeader } from "./UGCHeroHeader";
import { UGCFeaturedCarousel } from "./UGCFeaturedCarousel";
import { UGCPremiumCampaignCard } from "./UGCPremiumCampaignCard";
import type {
  CompensationFilter,
  ContentTypeFilter,
  EndingFilter,
  PlatformKey,
  SortKey,
} from "./ugc-tokens";
import { getDaysRemaining } from "./ugc-campaign-utils";

const LIMIT = 24;
const CARD_GRID =
  "grid grid-cols-1 justify-start gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(220px,240px))]";

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[#EEF0F2] bg-white">
      <div className="aspect-[16/10] animate-pulse bg-[#F3F4F6]" />
      <div className="space-y-2 px-3.5 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#F3F4F6]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#F3F4F6]" />
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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [contentType, setContentType] = useState<ContentTypeFilter>(() => {
    if (typeParam === "clipping") return "clipping";
    if (typeParam === "ugc") return "ugc";
    return "all";
  });
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [compensation, setCompensation] = useState<CompensationFilter>("all");
  const [ending, setEnding] = useState<EndingFilter>("all");
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<UGCCampaign[]>([]);

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
      try {
        const res = await fetch("/api/ugc/campaigns?status=active&featured=true&limit=6&sort=popular");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setFeaturedCampaigns((json.data ?? []) as UGCCampaign[]);
      } catch {
        if (!cancelled) setFeaturedCampaigns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ugc/saves", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const ids = new Set<string>(
          ((json.data ?? []) as Array<{ campaign_id?: string; campaign?: { id?: string } }>).map(
            (row) => row.campaign?.id ?? row.campaign_id ?? "",
          ).filter(Boolean),
        );
        if (!cancelled) setSavedIds(ids);
      } catch {
        /* unauthenticated is fine */
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

  async function toggleSave(campaignId: string) {
    const next = new Set(savedIds);
    const saving = !next.has(campaignId);
    if (saving) next.add(campaignId);
    else next.delete(campaignId);
    setSavedIds(next);
    try {
      if (saving) {
        await fetch("/api/ugc/saves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: campaignId }),
        });
      } else {
        await fetch(`/api/ugc/saves?campaign_id=${encodeURIComponent(campaignId)}`, {
          method: "DELETE",
        });
      }
    } catch {
      setSavedIds(savedIds);
    }
  }

  const campaigns = rawCampaigns;
  const showFeatured = !loading && featuredCampaigns.length > 0 && !hasFilters && (total > 2 || featuredCampaigns.length > 1);
  const showRails = !hasFilters && campaigns.length > 8;
  const endingSoon = showRails
    ? campaigns
        .filter((c) => {
          const days = getDaysRemaining(c.submission_deadline ?? c.ends_at);
          return days !== null && days <= 7;
        })
        .slice(0, 8)
    : [];
  const newest = showRails
    ? [...campaigns].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 8)
    : [];

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-12 pt-1">
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

      {loading ? (
        <div className={CARD_GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {showFeatured ? (
            <UGCFeaturedCarousel
              campaigns={featuredCampaigns.slice(0, 8)}
              savedIds={savedIds}
              onToggleSave={toggleSave}
            />
          ) : null}

          {!hasFilters && newest.length > 0 ? (
            <CampaignSection title="New campaigns">
              {newest.map((c, i) => (
                <UGCPremiumCampaignCard
                  key={c.id}
                  campaign={c}
                  index={i}
                  saved={savedIds.has(c.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </CampaignSection>
          ) : null}

          {!hasFilters && endingSoon.length > 0 ? (
            <CampaignSection title="Ending soon">
              {endingSoon.map((c, i) => (
                <UGCPremiumCampaignCard
                  key={c.id}
                  campaign={c}
                  index={i}
                  saved={savedIds.has(c.id)}
                  onToggleSave={toggleSave}
                />
              ))}
            </CampaignSection>
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold tracking-tight text-[#111827]">
                {search ? `Results for “${search}”` : "All Campaigns"}
              </h2>
              <span className="text-[12px] text-[#94A3B8]">
                {campaigns.length.toLocaleString()} of {total.toLocaleString()}
              </span>
            </div>

            {campaigns.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#E5E7EB] bg-white py-16 text-center">
                <Clapperboard className="mx-auto mb-3 h-8 w-8 text-[#D1D5DB]" />
                <p className="text-sm font-bold text-[#111827]">
                  {hasFilters ? "No campaigns match these filters." : "No live campaigns yet"}
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
                  <UGCPremiumCampaignCard
                    key={c.id}
                    campaign={c}
                    index={i}
                    saved={savedIds.has(c.id)}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="flex justify-center py-7">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" />
                  Loading more…
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CampaignSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-[18px] font-semibold tracking-tight text-[#111827]">{title}</h2>
      <div className={CARD_GRID}>{children}</div>
    </section>
  );
}
