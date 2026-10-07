"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap, ChevronRight,
  Sparkles, Camera, Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchProductVideosMap, attachProductVideos } from "@/lib/product-videos";
import { useAIStore } from "@/lib/store/use-ai-store";
import { FlashDealsClient } from "./FlashDealsClient";
import { TrendingProductsClient } from "./TrendingProductsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import { MarketplaceEngagementHub } from "./MarketplaceEngagementHub";
import { HeroBannerView } from "./HeroBannerView";
import { MarketplaceTrustStrip } from "./MarketplaceTrustStrip";
import type { HeroProduct } from "@/types";
import { useMarketplace } from "./marketplace-context";
import type { DbProduct } from "@/lib/utils";
import { isRenderableUrl, SELECT_CATEGORY_LABEL } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MarketplacePagination } from "./MarketplacePagination";
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";
import {
  getMarketplaceTypeFilter,
  type MarketplacePageBundle,
  type MarketplaceProductType,
} from "@/lib/marketplace/fetch-page-data";
import { DEFAULT_FILTERS } from "@/lib/utils";
import { resolveShopCategories } from "@/lib/marketplace/category-catalog";
import { dedupeProductsByIdentity, resolveMarketplaceFlashDeals, HOMEPAGE_FLASH_DEALS_LIMIT } from "@/lib/marketplace/homepage-ranking";
import { getCategoryImageFallbacks } from "@/lib/marketplace/category-images";
import {
  MarketplaceSearchBar,
  MarketplaceSearchIcon,
  marketplaceSearchBarClassName,
} from "./MarketplaceSearchBar";
import {
  MarketplaceSearchPopover,
  type MarketplaceSearchPopoverHandle,
} from "./MarketplaceSearchPopover";
import Link from "next/link";
import { PersonalizedMarketplaceFeed } from "./personalized/PersonalizedMarketplaceFeed";
import type { MarketplaceCollection } from "@/lib/marketplace/collections";

type ProductType = MarketplaceProductType;

function parseUrlType(raw: string | null, fallback: ProductType): ProductType {
  if (raw === "digital") return "digital";
  if (raw === "physical") return "physical";
  return fallback;
}

function isDefaultBrowseState(
  filters: typeof DEFAULT_FILTERS & { shippingFrom: string[] },
  debouncedSearch: string,
) {
  return (
    !debouncedSearch &&
    filters.category === DEFAULT_FILTERS.category &&
    filters.shippingFrom.length === 0 &&
    filters.deliveryTimes.length === 0 &&
    filters.priceRange[0] === DEFAULT_FILTERS.priceRange[0] &&
    filters.priceRange[1] === DEFAULT_FILTERS.priceRange[1] &&
    filters.minRating === DEFAULT_FILTERS.minRating
  );
}

function applyBundleToState(
  bundle: MarketplacePageBundle,
  productType: ProductType,
  setters: {
    setFlashDeals: (v: DbProduct[]) => void;
    setTrending: (v: DbProduct[]) => void;
    setCategories: (v: DbCategory[]) => void;
    setCategoriesType: (v: ProductType) => void;
    setListingCount: (v: number) => void;
  },
) {
  setters.setFlashDeals(dedupeProductsByIdentity(bundle.flashDeals));
  setters.setTrending(dedupeProductsByIdentity(bundle.trending));
  setters.setCategories(bundle.categories);
  setters.setCategoriesType(productType);
  setters.setListingCount(bundle.listingCount);
}

type DbCategory = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
  image_url: string | null;
  tint_color: string | null;
};

type Stats = {
  viewers_now: number;
  revenue_today: number;
  creators_active: number;
};

async function resolveCategoryId(
  client: ReturnType<typeof createClient>,
  category: string,
): Promise<string | null> {
  const value = category.trim();
  if (!value || value === SELECT_CATEGORY_LABEL) return null;

  const [{ data: bySlug }, { data: byName }] = await Promise.all([
    client.from("product_categories").select("id").eq("is_active", true).eq("slug", value).maybeSingle(),
    client.from("product_categories").select("id").eq("is_active", true).ilike("name", value).maybeSingle(),
  ]);

  return bySlug?.id ?? byName?.id ?? null;
}

type Props = {
  initialType: ProductType;
  initialBundles: Record<ProductType, MarketplacePageBundle>;
  initialStats: Stats;
  heroPhysical: HeroProduct[] | null;
  heroDigital: HeroProduct[] | null;
  initialCollections?: MarketplaceCollection[];
};

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({ c, type }: { c: DbCategory; type: ProductType }) {
  const fallbacks = useMemo(() => {
    if (type === "digital") {
      const url = c.image_url && isRenderableUrl(c.image_url) ? c.image_url.trim() : "";
      return url ? [url] : [];
    }
    const mapped = getCategoryImageFallbacks(c.name, c.slug);
    if (c.image_url && isRenderableUrl(c.image_url)) {
      const primary = c.image_url.trim();
      return [primary, ...mapped.filter((u) => u !== primary)];
    }
    return mapped;
  }, [c.image_url, c.name, c.slug, type]);
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = fallbacks[fallbackIdx] ?? fallbacks[0];

  useEffect(() => {
    setFallbackIdx(0);
    setImgLoaded(false);
  }, [c.id, c.image_url, c.name, c.slug]);

  if (!imgSrc) return null;

  return (
    <Link
      href={
        type === "physical"
          ? `/marketplace/physical?category=${c.slug}`
          : `/marketplace?type=${type}&category=${c.slug}`
      }
      className="group relative mx-auto flex w-[84%] max-w-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform hover:scale-[1.02] hover:border-[var(--color-border)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.1)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35 focus-visible:ring-offset-2 md:w-full md:rounded-2xl"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden md:aspect-[4/3]">
        {!imgLoaded && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: "var(--color-surface-secondary)" }}
            aria-hidden
          />
        )}
        <img
          src={imgSrc}
          alt={c.name}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover object-center transition-[transform,opacity] duration-300 ease-out group-hover:scale-[1.04] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgLoaded(false);
            setFallbackIdx((i) => (i + 1 < fallbacks.length ? i + 1 : i));
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-50 transition-opacity duration-200 group-hover:opacity-70" />
      </div>

      <div className="w-full bg-[var(--color-surface)] px-2.5 py-2 md:px-3 md:py-2.5">
        <div className="line-clamp-2 text-center text-[10px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-text-primary)] md:text-[12px] md:leading-snug">
          {c.name}
        </div>
      </div>
    </Link>
  );
}


// ─── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonDeals() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[var(--color-border)]"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="aspect-square animate-pulse" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-3 w-2/3 animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[var(--color-border)]"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="aspect-square animate-pulse" style={{ background: "var(--color-surface-secondary)" }} />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-3 w-4/5 animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
            <div className="h-4 w-1/2 animate-pulse rounded" style={{ background: "var(--color-surface-secondary)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MarketplacePageClient ────────────────────────────────────────────────────

export function MarketplacePageClient({
  initialType,
  initialBundles,
  initialStats,
  heroPhysical,
  heroDigital,
}: Props) {
  const supabase = createClient();
  const startingBundle = initialBundles[initialType];

  const { filters, setCategory, clearFilters } = useMarketplace();
  const openAssistant = useAIStore((s) => s.openAssistant);

  const router = useRouter();
  const searchParams = useSearchParams();

  const urlType = parseUrlType(searchParams.get("type"), initialType);
  const [type, setType] = useState<ProductType>(urlType);

  useEffect(() => {
    setType(urlType);
  }, [urlType]);

  const cacheRef = useRef<Record<ProductType, MarketplacePageBundle>>({
    physical: {
      ...initialBundles.physical,
      flashDeals: dedupeProductsByIdentity(initialBundles.physical.flashDeals),
      trending: dedupeProductsByIdentity(initialBundles.physical.trending),
    },
    digital: {
      ...initialBundles.digital,
      flashDeals: dedupeProductsByIdentity(initialBundles.digital.flashDeals),
      trending: dedupeProductsByIdentity(initialBundles.digital.trending),
    },
  });
  const loadGenRef = useRef(0);
  /** Separate from browse generation so browse loads cannot discard in-flight search results */
  const searchGenRef = useRef(0);
  const skipInitialFetchRef = useRef(true);
  const prefetchRef = useRef<Map<string, DbProduct[]>>(new Map());
  const prefetchingRef = useRef<Set<string>>(new Set());

  function applyCachedType(t: ProductType) {
    const cached = cacheRef.current[t];
    if (!cached) return false;
    applyBundleToState(cached, t, {
      setFlashDeals,
      setTrending,
      setCategories,
      setCategoriesType,
      setListingCount,
    });
    return true;
  }

  function handleTypeChange(t: ProductType) {
    loadGenRef.current += 1;
    setType(t);
    setCategory("");
    clearFilters();
    setSearch("");
    setDebouncedSearch("");
    setNewProductIds(new Set());
    prefetchRef.current.clear();
    prefetchingRef.current.clear();
    applyCachedType(t);
    setLoading(false);
    setProductsLoading(false);
    setLoadingMore(false);

    // Physical Marketplace is canonical at /marketplace/physical
    if (t === "physical") {
      router.replace("/marketplace/physical", { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", t);
    params.delete("category");
    params.delete("page");
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
  }

  const urlQ = (searchParams.get("q") ?? "").trim();
  const [search, setSearch] = useState(urlQ);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQ);
  const [flashDeals, setFlashDeals] = useState<DbProduct[]>(() =>
    dedupeProductsByIdentity(startingBundle.flashDeals),
  );
  const [trending, setTrending] = useState<DbProduct[]>(() =>
    dedupeProductsByIdentity(startingBundle.trending),
  );
  const [categories, setCategories] = useState<DbCategory[]>(startingBundle.categories);
  const [categoriesType, setCategoriesType] = useState<ProductType>(initialType);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newProductIds, setNewProductIds] = useState<Set<string>>(() => new Set());
  const [listingCount, setListingCount] = useState(startingBundle.listingCount);
  const [isMobile, setIsMobile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchExactMatch, setSearchExactMatch] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [searchRetry, setSearchRetry] = useState(0);
  const [browseError, setBrowseError] = useState(false);
  const [browseRetry, setBrowseRetry] = useState(0);

  const supabaseRef = useRef(supabase);
  const filtersKey = JSON.stringify(filters);
  const loadDepsRef = useRef({
    type: urlType,
    filtersKey,
    debouncedSearch: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Browser back/forward: hydrate search from URL without fighting typing
  useEffect(() => {
    if (urlQ === debouncedSearch) return;
    if (urlQ === search.trim()) {
      setDebouncedSearch(urlQ);
      return;
    }
    setSearch(urlQ);
    setDebouncedSearch(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL only
  }, [urlQ]);

  // Keep marketplace search shareable / refreshable via ?q=
  useEffect(() => {
    const current = (searchParams.get("q") ?? "").trim();
    if (debouncedSearch === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");

    // Physical marketplace is canonical at /marketplace/physical
    const path =
      type === "physical"
        ? "/marketplace/physical"
        : "/marketplace";
    if (type === "digital") params.set("type", "digital");
    else if (path === "/marketplace/physical") params.delete("type");

    const qs = params.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional URL write on query change
  }, [debouncedSearch, type]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(Boolean(mq.matches));
    update();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  const buildPrefetchKey = useCallback(
    (offset: number) => `${type}:${filtersKey}:${offset}`,
    [type, filtersKey],
  );

  const fetchTrendingSlice = useCallback(
    async (offset: number, generation: number): Promise<DbProduct[] | null> => {
      const typeFilter = getMarketplaceTypeFilter(type);

      const hasShipping = filters.shippingFrom.length > 0;
      const hasDelivery = filters.deliveryTimes.length > 0;
      const hasPriceMax = filters.priceRange[1] < 5000;
      const hasPriceMin = filters.priceRange[0] > 0;
      const hasRating = filters.minRating > 0;
      const hasCategory =
        filters.category &&
        filters.category !== "" &&
        filters.category !== SELECT_CATEGORY_LABEL;

      let categoryId: string | null = null;
      if (hasCategory) {
        categoryId = await resolveCategoryId(supabaseRef.current, filters.category);
        if (generation !== loadGenRef.current) return null;
      }

      function applyFilters(q: any): any {
        if (hasShipping) q = q.in("shipping_from", filters.shippingFrom);
        if (hasDelivery) q = q.in("delivery_time", filters.deliveryTimes);
        if (hasPriceMax) q = q.lte("price", filters.priceRange[1]);
        if (hasPriceMin) q = q.gte("price", filters.priceRange[0]);
        if (hasRating) q = q.gte("rating", filters.minRating);
        if (categoryId) q = q.eq("category_id", categoryId);
        return q;
      }

      const { data: trend, error: trendError } = await applyFilters(
        supabaseRef.current
          .from("products")
          .select(`
              id, name, slug, price, currency, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sale_count,
              rating, review_count, is_free_shipping, vendor_id, category_id, sku,
              source, source_metadata,
              vendors(id, verification_status)
            `)
          .eq("status", "active")
          .eq("is_active", true)
          .is("deleted_at", null)
          .in("product_type", [...typeFilter])
          .order("view_count", { ascending: false })
          .range(offset, offset + MARKETPLACE_PAGE_SIZE - 1),
      );
      if (trendError) {
        console.error("[marketplace] trending slice failed:", trendError);
        return null;
      }

      if (generation !== loadGenRef.current) return null;

      const trendList = (trend ?? []) as DbProduct[];
      const videoMap = await fetchProductVideosMap(
        supabaseRef.current,
        trendList.map((p) => p.id),
      );
      if (generation !== loadGenRef.current) return null;

      return attachProductVideos(trendList, videoMap);
    },
    [type, filters],
  );

  const prefetchNextPage = useCallback(
    async (offset: number) => {
      if (debouncedSearch || offset >= listingCount) return;

      const key = buildPrefetchKey(offset);
      if (prefetchRef.current.has(key) || prefetchingRef.current.has(key)) return;

      prefetchingRef.current.add(key);
      const generation = loadGenRef.current;
      const products = await fetchTrendingSlice(offset, generation);
      prefetchingRef.current.delete(key);

      if (products && generation === loadGenRef.current) {
        prefetchRef.current.set(key, products);
      }
    },
    [buildPrefetchKey, debouncedSearch, fetchTrendingSlice, listingCount],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || debouncedSearch || trending.length >= listingCount) return;

    const offset = trending.length;
    const key = buildPrefetchKey(offset);

    setLoadingMore(true);
    setNewProductIds(new Set());

    const generation = loadGenRef.current;
    let nextBatch = prefetchRef.current.get(key);

    if (nextBatch) {
      prefetchRef.current.delete(key);
    } else {
      nextBatch = (await fetchTrendingSlice(offset, generation)) ?? undefined;
    }

    if (!nextBatch || generation !== loadGenRef.current) {
      setLoadingMore(false);
      return;
    }

    const seen = new Set(trending.map((p) => p.id));
    const toAdd = nextBatch.filter((p) => !seen.has(p.id));

    if (toAdd.length > 0) {
      setNewProductIds(new Set(toAdd.map((p) => p.id)));
      setTrending((prev) => dedupeProductsByIdentity([...prev, ...toAdd]));
    }

    setLoadingMore(false);
    void prefetchNextPage(offset + MARKETPLACE_PAGE_SIZE);
  }, [
    buildPrefetchKey,
    debouncedSearch,
    fetchTrendingSlice,
    listingCount,
    loadingMore,
    prefetchNextPage,
    trending.length,
  ]);

  // Warm the next page after first paint so the first "View More" feels instant.
  useEffect(() => {
    if (debouncedSearch || trending.length === 0) return;
    if (trending.length >= listingCount) return;

    let cancelled = false;
    const run = () => {
      if (!cancelled) void prefetchNextPage(MARKETPLACE_PAGE_SIZE);
    };

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run);
    } else {
      timeoutId = setTimeout(run, 400);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [debouncedSearch, listingCount, prefetchNextPage, trending.length, type]);

  // Apply ?category=slug from URL (e.g. category cards)
  useEffect(() => {
    const slug = searchParams.get("category");
    if (!slug || slug === "trending") return;

    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("product_categories")
        .select("name")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled || !data?.name) return;
      setCategory(data.name);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setCategory]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      loadDepsRef.current = { type, filtersKey, debouncedSearch };
      if (urlType !== initialType) {
        applyCachedType(urlType);
      }
      return;
    }

    const prev = loadDepsRef.current;
    const filterOrSearchChanged =
      prev.filtersKey !== filtersKey ||
      prev.debouncedSearch !== debouncedSearch;
    const typeChanged = prev.type !== type;

    if (filterOrSearchChanged || typeChanged) {
      prefetchRef.current.clear();
      prefetchingRef.current.clear();
      setNewProductIds(new Set());
      setLoadingMore(false);
    }

    loadDepsRef.current = { type, filtersKey, debouncedSearch };

    const defaultBrowse = isDefaultBrowseState(filters, debouncedSearch);
    const searchCleared = Boolean(prev.debouncedSearch) && !debouncedSearch;
    let hadActiveFilters = false;
    try {
      hadActiveFilters = !isDefaultBrowseState(
        JSON.parse(prev.filtersKey) as typeof DEFAULT_FILTERS & { shippingFrom: string[] },
        prev.debouncedSearch,
      );
    } catch {
      hadActiveFilters = false;
    }
    const filtersClearedToDefault = hadActiveFilters && defaultBrowse && !debouncedSearch;

    if ((searchCleared || filtersClearedToDefault) && cacheRef.current[type]) {
      applyCachedType(type);
      setLoading(false);
      setProductsLoading(false);
      return;
    }

    // Active search owns the product grid — do not bump browse generation (that raced search).
    if (debouncedSearch) {
      setLoading(false);
      return;
    }

    if (typeChanged && defaultBrowse && !debouncedSearch && cacheRef.current[type]) {
      const cached = cacheRef.current[type];
      // Empty stub from deferred SSR — fall through and load the tab.
      if (cached.trending.length > 0 || cached.listingCount > 0) {
        applyCachedType(type);
        setLoading(false);
        setProductsLoading(false);
        return;
      }
    }

    const loadGeneration = ++loadGenRef.current;
    const typeFilter = getMarketplaceTypeFilter(type);
    setBrowseError(false);

    async function load() {
      const showSectionSkeleton =
        !defaultBrowse || !cacheRef.current[type]?.trending?.length;
      if (showSectionSkeleton) setLoading(true);

      const hasShipping = filters.shippingFrom.length > 0;
      const hasDelivery = filters.deliveryTimes.length > 0;
      const hasPriceMax = filters.priceRange[1] < 5000;
      const hasPriceMin = filters.priceRange[0] > 0;
      const hasRating = filters.minRating > 0;
      const hasCategory =
        filters.category &&
        filters.category !== "" &&
        filters.category !== SELECT_CATEGORY_LABEL;

      let categoryId: string | null = null;
      if (hasCategory) {
        categoryId = await resolveCategoryId(supabaseRef.current, filters.category);
        if (loadGeneration !== loadGenRef.current) return;
      }

      function applyFilters(q: any): any {
        if (hasShipping) q = q.in("shipping_from", filters.shippingFrom);
        if (hasDelivery) q = q.in("delivery_time", filters.deliveryTimes);
        if (hasPriceMax) q = q.lte("price", filters.priceRange[1]);
        if (hasPriceMin) q = q.gte("price", filters.priceRange[0]);
        if (hasRating) q = q.gte("rating", filters.minRating);
        if (categoryId) q = q.eq("category_id", categoryId);
        return q;
      }

      const skipTrending = Boolean(debouncedSearch);

      // Prefer category table directly — avoid scanning every product row for category_ids.
      const [catsRes, dealsRes, trendRes, countRes] = await Promise.all([
          supabaseRef.current
            .from("product_categories")
            .select("id, name, slug, product_count, image_url, tint_color")
            .eq("is_active", true)
            .eq("visible", true)
            .is("parent_id", null)
            .order("product_count", { ascending: false })
            .limit(40),

          applyFilters(
            supabaseRef.current
              .from("products")
              .select(`
              id, name, slug, price, currency, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sold_count,
              claimed_pct, rating, review_count, is_free_shipping, vendor_id, category_id,
              vendors(id, verification_status)
            `)
              .eq("status", "active")
              .eq("is_active", true)
              .is("deleted_at", null)
              .in("product_type", [...typeFilter])
              .or("is_flash_deal.eq.true,compare_at_price.not.is.null")
              .order("is_flash_deal", { ascending: false })
              .order("view_count", { ascending: false })
              .limit(12),
          ),

          skipTrending
            ? Promise.resolve({ data: null, error: null })
            : applyFilters(
                supabaseRef.current
                  .from("products")
                  .select(`
              id, name, slug, price, currency, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sale_count,
              rating, review_count, is_free_shipping, vendor_id, category_id, sku,
              source, source_metadata,
              vendors(id, verification_status)
            `)
                  .eq("status", "active")
                  .eq("is_active", true)
                  .is("deleted_at", null)
                  .in("product_type", [...typeFilter])
                  .order("view_count", { ascending: false })
                  .range(0, MARKETPLACE_PAGE_SIZE - 1),
              ),

          applyFilters(
            supabaseRef.current
              .from("products")
              .select("*", { count: "exact", head: true })
              .eq("status", "active")
              .eq("is_active", true)
              .is("deleted_at", null)
              .in("product_type", [...typeFilter]),
          ),
        ]);

      if (loadGeneration !== loadGenRef.current) return;

      const productError = dealsRes.error || trendRes.error || countRes.error;
      if (productError) {
        console.error("[marketplace] browse load failed:", productError);
        setBrowseError(true);
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      const catRows = catsRes.data;
      const deals = dealsRes.data;
      const trend = trendRes.data;
      const count = countRes.count;

      let nextCategories = (catRows ?? []) as DbCategory[];
      if (nextCategories.length === 0 && (count ?? 0) > 0) {
        nextCategories = resolveShopCategories(type, []) as DbCategory[];
      }

      const dealList = dedupeProductsByIdentity((deals ?? []) as DbProduct[]);
      const trendList = dedupeProductsByIdentity((trend ?? []) as DbProduct[]);
      const dealPool = dedupeProductsByIdentity([...dealList, ...trendList]);
      const resolvedDeals = resolveMarketplaceFlashDeals(
        dealPool,
        count ?? 0,
        HOMEPAGE_FLASH_DEALS_LIMIT,
      );
      const videoMap = await fetchProductVideosMap(
        supabaseRef.current,
        [...resolvedDeals, ...trendList].map((p) => p.id),
      );

      if (loadGeneration !== loadGenRef.current) return;

      const nextDeals = attachProductVideos(resolvedDeals, videoMap);
      const nextTrending = attachProductVideos(trendList, videoMap);
      const nextCount = count ?? 0;

      setFlashDeals(nextDeals);
      if (!skipTrending) {
        setTrending(nextTrending);
        setListingCount(nextCount);
      }
      setCategories(nextCategories);
      setCategoriesType(type);

      if (defaultBrowse && !debouncedSearch) {
        cacheRef.current[type] = {
          flashDeals: nextDeals,
          trending: nextTrending,
          categories: nextCategories,
          listingCount: nextCount,
        };
      }

      setLoading(false);
      setProductsLoading(false);
    }

    void load().catch((err) => {
      console.error("[marketplace] browse load failed:", err);
      if (loadGeneration === loadGenRef.current) {
        setBrowseError(true);
        setLoading(false);
        setProductsLoading(false);
      }
    });
  }, [type, filtersKey, debouncedSearch, urlType, initialType, browseRetry]);

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchExactMatch(true);
      setSearchError(false);
      return;
    }

    prefetchRef.current.clear();
    prefetchingRef.current.clear();
    setNewProductIds(new Set());
    setLoadingMore(false);
    setSearchError(false);
    // Clear stale browse results so loading never flashes unrelated products
    setTrending([]);

    const controller = new AbortController();
    const searchGeneration = ++searchGenRef.current;
    // Invalidate in-flight browse so it cannot overwrite search results later
    loadGenRef.current += 1;
    setProductsLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/marketplace/search?q=${encodeURIComponent(debouncedSearch)}&type=${type}&limit=40`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (controller.signal.aborted || searchGeneration !== searchGenRef.current) return;

        // Exact results only for the primary grid. Similar stays labeled; never dump popular as "results".
        const primary = (
          data.exactMatch ? data.results : data.similar
        ) as DbProduct[] | undefined;
        const list = Array.isArray(primary) ? primary : [];

        const videoMap = await fetchProductVideosMap(
          supabaseRef.current,
          list.map((p) => p.id),
        );
        if (controller.signal.aborted || searchGeneration !== searchGenRef.current) return;

        setTrending(dedupeProductsByIdentity(attachProductVideos(list, videoMap)));
        setSearchExactMatch(Boolean(data.exactMatch));
        setListingCount(list.length);
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        if (searchGeneration === searchGenRef.current) {
          setTrending([]);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted && searchGeneration === searchGenRef.current) {
          setProductsLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, type, searchRetry]);

  // Intentionally no "hydrate all remaining products" effect.
  // SSR ships one page; Load more / pagination grows the list on demand.

  // Flash deals — unique IDs only (server bundle already ranked)
  const displayTrending = useMemo(
    () => dedupeProductsByIdentity(trending),
    [trending],
  );

  const displayFlashDeals = useMemo(() => {
    const deals = dedupeProductsByIdentity(flashDeals);
    if (deals.length > 0 || listingCount === 0) return deals;
    return resolveMarketplaceFlashDeals(
      displayTrending,
      listingCount,
      HOMEPAGE_FLASH_DEALS_LIMIT,
    );
  }, [flashDeals, displayTrending, listingCount]);

  const shopCategories = useMemo(
    () => resolveShopCategories(type, categoriesType === type ? categories : []),
    [categories, type, categoriesType],
  );

  const displayCategories = useMemo(() => {
    const target = isMobile ? 6 : 7;
    return shopCategories.slice(0, target);
  }, [shopCategories, isMobile]);

  const POPULAR_SEARCHES = useMemo(
    () => ["Wireless Earbuds", "Gaming Headset", "Smart Watch", "Portable Speaker"],
    [],
  );

  const RECENT_KEY = "marketplace_recent_searches_v1";
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchPopoverRef = useRef<MarketplaceSearchPopoverHandle>(null);

  function readRecentSearches(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => typeof x === "string").slice(0, 8);
    } catch {
      return [];
    }
  }

  useEffect(() => {
    if (searchFocused) setRecentSearches(readRecentSearches());
  }, [searchFocused]);

  function pushRecent(term: string) {
    if (typeof window === "undefined") return;
    const t = term.trim();
    if (!t) return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      const next = [t, ...list.filter((x) => String(x).toLowerCase() !== t.toLowerCase())].slice(0, 12);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecentSearches(next.slice(0, 8));
    } catch {
      // ignore
    }
  }

  function clearRecentHistory() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(RECENT_KEY);
      setRecentSearches([]);
    } catch {
      // ignore
    }
  }

  function applySearch(term: string) {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    setSearch(t);
    setDebouncedSearch(t);
    setSearchFocused(false);
  }

  function applyCategoryFilter(categoryName: string) {
    const name = categoryName.trim();
    if (!name) return;
    setSearch("");
    setDebouncedSearch("");
    setSearchFocused(false);
    setCategory(name);
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setSearchFocused(false);
  }

  function submitSearch(term?: string) {
    const t = (term ?? search).trim();
    if (!t) return;
    applySearch(t);
  }

  const q = search.trim();

  const trendingCategorySuggestions = useMemo(() => {
    return shopCategories
      .slice()
      .sort((a, b) => Number(b.product_count ?? 0) - Number(a.product_count ?? 0))
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 5);
  }, [shopCategories]);

  const showSearchPopover = searchFocused;
  const searchPending = productsLoading && search.trim() === debouncedSearch && debouncedSearch.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
      {/* Stretch with the grid so sticky can pin; do not self-start this column. */}
      <div className="hidden lg:block lg:w-[15rem] lg:shrink-0">
        <div
          data-marketplace-sidebar
          className="lg:sticky lg:top-[calc(var(--navbar-height)+0.75rem)] lg:z-20 lg:max-h-[calc(100dvh-var(--navbar-height)-1.5rem)] lg:overflow-y-auto lg:overflow-x-clip lg:overscroll-contain"
        >
          <Sidebar type={type} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:gap-4">
      {/* Search — aligns top with Categories */}
      <div className="min-w-0">
        <div className="flex flex-col gap-2 relative">
          <div className={marketplaceSearchBarClassName(searchFocused)}>
            <button
              type="button"
              aria-label="Search marketplace"
              onClick={() => submitSearch()}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35"
            >
              <MarketplaceSearchIcon active={q.length > 0} loading={searchPending} />
            </button>
            <MarketplaceSearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                if (!v.trim()) setDebouncedSearch("");
              }}
              type={type}
              loading={searchPending}
              onClear={clearSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (showSearchPopover && searchPopoverRef.current?.onKeyDown(e)) return;
                if (e.key === "Enter") submitSearch();
                if (e.key === "Escape") {
                  setSearchFocused(false);
                  (e.target as HTMLInputElement)?.blur();
                }
              }}
            />

            <button
              type="button"
              aria-label="AI visual search — describe what you want"
              title="Describe a product with AI"
              onClick={() => {
                const q = search.trim();
                if (q) {
                  router.push(`/marketplace/search?q=${encodeURIComponent(q)}&ai=1&type=${type}`);
                } else {
                  openAssistant("Help me find a product. Describe what you're looking for.");
                }
              }}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[#fd5000]"
            >
              <Camera className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const q = search.trim();
                if (q) {
                  router.push(`/marketplace/search?q=${encodeURIComponent(q)}&ai=1&type=${type}`);
                } else {
                  openAssistant("Search Jimvio marketplace with AI");
                }
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-[#fd5000] via-[#ff6a1a] to-[#ff8c00] px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-3.5" />
              AI
            </button>

            <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-[var(--color-border)] p-1 sm:flex">
              {(["physical", "digital"] as ProductType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className="rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all"
                  style={{
                    background: type === t ? "var(--color-accent)" : "transparent",
                    color: type === t ? "white" : "var(--color-text-muted)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <MarketplaceSearchPopover
            ref={searchPopoverRef}
            query={search}
            type={type}
            open={showSearchPopover}
            recentSearches={recentSearches}
            popularSearches={POPULAR_SEARCHES}
            trendingCategories={trendingCategorySuggestions}
            onPick={(term) => applySearch(term)}
            onCategoryPick={applyCategoryFilter}
            onSubmit={submitSearch}
            onClearRecent={clearRecentHistory}
          />

          <div className="flex items-center justify-center gap-2 sm:hidden">
            {(["physical", "digital"] as ProductType[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className="flex-1 rounded-full px-4 py-2 text-sm font-bold capitalize transition-all"
                style={{
                  background: type === t ? "var(--color-accent)" : "var(--color-surface-secondary)",
                  color: type === t ? "white" : "var(--color-text-muted)",
                  border: type === t ? "none" : "1px solid var(--color-border)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content below search */}
      <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden lg:gap-5">
        <HeroBannerView physical={heroPhysical} digital={heroDigital} initialType={type} />

        <div className="w-full min-w-0">
        <MarketplaceTrustStrip stats={stats} listingCount={listingCount} />
        </div>

        {isDefaultBrowseState(filters, debouncedSearch) && (
          <PersonalizedMarketplaceFeed
            catalog={displayTrending}
            flashDeals={displayFlashDeals}
            newProductIds={newProductIds}
            productType={type}
            loading={loading && trending.length === 0}
          />
        )}

        {/* ── Flash Deals — skeleton only this section while loading ── */}
        <section
          id="flash-deals-section"
          className="overflow-hidden rounded-2xl"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 text-white"
            style={{
              background: "linear-gradient(90deg, var(--color-accent) 0%, #ff8c00 100%)",
            }}
          >
            <div className="flex items-center gap-2">
              <Zap className="size-4 fill-current" />
              <span className="font-bold">Flash Deals</span>
              <span className="hidden text-xs text-white/80 sm:inline">
                Limited time offers – Don&apos;t miss out!
              </span>
            </div>
            <div className="flex items-center gap-4">
              <FlashDealsCountdown />
              <Link
                href="/marketplace/flash-deals"
                className="flex items-center gap-1 text-xs font-semibold text-white/90 transition-colors hover:text-white"
              >
                View All Deals <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="p-2">
            {loading && displayFlashDeals.length === 0 ? (
              <SkeletonDeals />
            ) : displayFlashDeals.length > 0 ? (
              <FlashDealsClient deals={displayFlashDeals} />
            ) : null}
          </div>
        </section>

        {/* ── Shop by Category — always rendered ── */}
        {displayCategories.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-black tracking-[-0.02em] text-[var(--color-text-primary)]">Shop by Category</h2>
            <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 md:gap-3.5 lg:grid-cols-4 xl:grid-cols-7">
              {displayCategories.map((c) => (
                <CategoryCard key={c.id} c={c} type={type} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Products — skeleton only this section while loading ── */}
        <section id="marketplace-products">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text-primary)]">
              {debouncedSearch
                ? `Results for: ${debouncedSearch}`
                : filters.category &&
                    filters.category !== "" &&
                    filters.category !== SELECT_CATEGORY_LABEL
                  ? filters.category
                  : `Trending ${type === "digital" ? "Digital " : ""}Products`}
            </h2>
            {debouncedSearch ? (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                ✕ Clear search
              </button>
            ) : filters.category &&
                filters.category !== "" &&
                filters.category !== SELECT_CATEGORY_LABEL ? (
              <button
                type="button"
                onClick={() => setCategory("")}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                ✕ Clear
              </button>
            ) : null}
          </div>
          {debouncedSearch && !searchError && !searchExactMatch && !productsLoading && (
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
              No exact matches found — showing similar products
            </p>
          )}
          {(loading || productsLoading) && displayTrending.length === 0 ? (
            <SkeletonGrid />
          ) : searchError && debouncedSearch ? (
            <div
              className="rounded-2xl border border-dashed px-6 py-14 text-center"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Couldn’t load search results
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchError(false);
                  setSearchRetry((n) => n + 1);
                }}
                className="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : browseError && !debouncedSearch ? (
            <div
              className="rounded-2xl border border-dashed px-6 py-14 text-center"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Couldn’t load products
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setBrowseError(false);
                  setBrowseRetry((n) => n + 1);
                }}
                className="mt-4 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          ) : displayTrending.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed px-6 py-14 text-center"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface-secondary)",
                animation: "fadeInUp 280ms ease-out",
              }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-light)]">
                <Search className="size-6 text-[var(--color-accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {debouncedSearch ? `No products found for “${debouncedSearch}”` : "No products match your filters"}
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {debouncedSearch
                  ? "Try another keyword or clear search to browse all products."
                  : "Try adjusting or clearing your filters."}
              </p>
              {debouncedSearch && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => applySearch(term)}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/40"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <TrendingProductsClient
                key={type}
                products={displayTrending}
                type={type}
                newProductIds={newProductIds}
                loadingMore={loadingMore}
              />
              {!debouncedSearch && (
                <MarketplacePagination
                  hasMore={displayTrending.length < listingCount}
                  loading={loadingMore}
                  onLoadMore={loadMore}
                  total={listingCount}
                  pageSize={MARKETPLACE_PAGE_SIZE}
                />
              )}
            </>
          )}
        </section>

        <MarketplaceEngagementHub
          productType={type}
          listingCount={listingCount}
          onSearchPick={applySearch}
        />
      </div>
      </div>
    </div>
  );
} 