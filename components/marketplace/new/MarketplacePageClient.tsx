"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap, ChevronRight, ArrowRight,
  Sparkles, Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchProductVideosMap, attachProductVideos } from "@/lib/product-videos";
import { useAIStore } from "@/lib/store/use-ai-store";
import { FlashDealsClient } from "./FlashDealsClient";
import { TrendingProductsClient } from "./TrendingProductsClient";
import { FlashDealsCountdown } from "./FlashDealsCountdown";
import { MarketplaceEngagementHub } from "./MarketplaceEngagementHub";
import { ProductTestimonialsCarousel } from "./ProductTestimonialsCarousel";
import { MarketplaceTrustStrip } from "./MarketplaceTrustStrip";
import { useMarketplace } from "./marketplace-context";
import type { DbProduct } from "@/lib/utils";
import { isRenderableUrl } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MarketplacePagination } from "./MarketplacePagination";
import { MARKETPLACE_PAGE_SIZE, parseMarketplacePage } from "@/lib/marketplace/constants";
import {
  getMarketplaceTypeFilter,
  type MarketplacePageBundle,
  type MarketplaceProductType,
  type TopReviewedProduct,
} from "@/lib/marketplace/fetch-page-data";
import { DEFAULT_FILTERS } from "@/lib/utils";
import { resolveShopCategories } from "@/lib/marketplace/category-catalog";
import { getCategoryImageFallbacks } from "@/lib/marketplace/category-images";
import {
  MarketplaceSearchBar,
  MarketplaceSearchIcon,
  marketplaceSearchBarClassName,
} from "./MarketplaceSearchBar";
import { MarketplaceSearchPopover } from "./MarketplaceSearchPopover";
import Link from "next/link";

type ProductType = MarketplaceProductType;

function parseUrlType(raw: string | null, fallback: ProductType): ProductType {
  if (raw === "digital") return "digital";
  if (raw === "physical") return "physical";
  return fallback;
}

function isDefaultBrowseState(
  filters: typeof DEFAULT_FILTERS & { shippingFrom: string[] },
  debouncedSearch: string,
  page: number,
) {
  return (
    !debouncedSearch &&
    page === 1 &&
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
  setters.setFlashDeals(bundle.flashDeals);
  setters.setTrending(bundle.trending);
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

type Props = {
  initialType: ProductType;
  initialBundles: Record<ProductType, MarketplacePageBundle>;
  initialStats: Stats;
  heroPhysical: unknown[] | null;
  heroDigital: unknown[] | null;
  testimonials: Record<ProductType, TopReviewedProduct[]>;
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
  const imgSrc = fallbacks[fallbackIdx] ?? fallbacks[0];

  useEffect(() => {
    setFallbackIdx(0);
  }, [c.id, c.image_url, c.name, c.slug]);

  if (!imgSrc) return null;

  const count = c.product_count
    ? c.product_count >= 1000
      ? `${(c.product_count / 1000).toFixed(1).replace(/\.0$/, "")}K+`
      : `${c.product_count}+`
    : "0+";

  return (
    <Link
      href={`/marketplace?type=${type}&category=${c.slug}`}
      className="group relative flex-shrink-0 w-48 sm:w-56 lg:w-64 h-56 sm:h-64 lg:h-72 rounded-2xl overflow-hidden border border-white/10 bg-[#122019] hover:border-[#FD5000]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#FD5000]/5"
      aria-label={`Browse ${c.name}`}
    >
      <img
        src={imgSrc}
        alt={c.name}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
        onError={() => {
          setFallbackIdx((i) => (i + 1 < fallbacks.length ? i + 1 : i));
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#122019] via-[#122019]/40 to-transparent" />
      <div className="relative h-full p-4 lg:p-6 flex flex-col justify-end">
        <div>
          <h3 className="font-display font-semibold text-lg lg:text-xl tracking-tight text-[#F3EFE4] group-hover:text-[#FD5000] transition-colors">{c.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-[#F3EFE4]/40">{count}</p>
        </div>
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-body text-[#F3EFE4]/60 group-hover:text-[#F3EFE4]/90 transition-colors">
          <span>Browse</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}


// ─── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonDeals() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-xl"
          style={{ background: "var(--color-surface-secondary)" }}
        />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-xl"
          style={{ background: "var(--color-surface-secondary)" }}
        />
      ))}
    </div>
  );
}

// ─── MarketplacePageClient ────────────────────────────────────────────────────

export function MarketplacePageClient({
  initialType,
  initialBundles,
  initialStats,
  testimonials,
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

  const cacheRef = useRef<Record<ProductType, MarketplacePageBundle>>(initialBundles);
  const loadGenRef = useRef(0);
  const skipInitialFetchRef = useRef(true);

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
    setType(t);
    setCategory("Trending Now");
    clearFilters();
    setCurrentPage(1);
    setSearch("");
    setDebouncedSearch("");
    applyCachedType(t);
    setLoading(false);
    setProductsLoading(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("type", t);
    params.delete("category");
    params.delete("page");
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
  }

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(() =>
    parseMarketplacePage(searchParams.get("page")),
  );
  const [flashDeals, setFlashDeals] = useState<DbProduct[]>(startingBundle.flashDeals);
  const [trending, setTrending] = useState<DbProduct[]>(startingBundle.trending);
  const [categories, setCategories] = useState<DbCategory[]>(startingBundle.categories);
  const [categoriesType, setCategoriesType] = useState<ProductType>(initialType);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [listingCount, setListingCount] = useState(startingBundle.listingCount);
  const [isMobile, setIsMobile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchExactMatch, setSearchExactMatch] = useState(true);

  const supabaseRef = useRef(supabase);
  const filtersKey = JSON.stringify(filters);
  const loadDepsRef = useRef({
    type: urlType,
    filtersKey,
    debouncedSearch: "",
    currentPage: parseMarketplacePage(searchParams.get("page")),
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

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

  useEffect(() => {
    const page = parseMarketplacePage(searchParams.get("page"));
    setCurrentPage(page);
  }, [searchParams]);

  function goToPage(page: number) {
    const next = Math.max(1, page);
    setCurrentPage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    router.replace(`/marketplace?${params.toString()}`, { scroll: false });
    document.getElementById("marketplace-products")?.scrollIntoView({ behavior: "smooth" });
  }

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
      loadDepsRef.current = { type, filtersKey, debouncedSearch, currentPage };
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
    const onlyPageChanged =
      !filterOrSearchChanged &&
      !typeChanged &&
      prev.currentPage !== currentPage;

    const effectivePage = filterOrSearchChanged || typeChanged ? 1 : currentPage;

    if ((filterOrSearchChanged || typeChanged) && currentPage !== 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      router.replace(`/marketplace?${params.toString()}`, { scroll: false });
    }

    loadDepsRef.current = { type, filtersKey, debouncedSearch, currentPage: effectivePage };

    const defaultBrowse = isDefaultBrowseState(filters, debouncedSearch, effectivePage);

    if (typeChanged && defaultBrowse && !debouncedSearch && cacheRef.current[type]) {
      applyCachedType(type);
      setLoading(false);
      setProductsLoading(false);
      return;
    }

    const loadGeneration = ++loadGenRef.current;
    const typeFilter = getMarketplaceTypeFilter(type);

    async function load() {
      const showSectionSkeleton =
        !defaultBrowse || !cacheRef.current[type]?.trending?.length;
      if (onlyPageChanged) setProductsLoading(true);
      else if (showSectionSkeleton) setLoading(true);

      const hasShipping = filters.shippingFrom.length > 0;
      const hasDelivery = filters.deliveryTimes.length > 0;
      const hasPriceMax = filters.priceRange[1] < 5000;
      const hasPriceMin = filters.priceRange[0] > 0;
      const hasRating = filters.minRating > 0;
      const hasCategory = filters.category && filters.category !== "Trending Now";

      let categoryId: string | null = null;
      if (hasCategory) {
        const { data: catRow } = await supabaseRef.current
          .from("product_categories")
          .select("id")
          .ilike("name", filters.category)
          .single();
        if (loadGeneration !== loadGenRef.current) return;
        categoryId = catRow?.id ?? null;
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

      const offset = (effectivePage - 1) * MARKETPLACE_PAGE_SIZE;
      const skipTrending = Boolean(debouncedSearch);

      if (onlyPageChanged && !skipTrending) {
        const [{ data: trend }, { count }] = await Promise.all([
          applyFilters(
            supabaseRef.current
              .from("products")
              .select(`
              id, name, slug, price, currency, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sale_count,
              rating, review_count, is_free_shipping, vendor_id, category_id,
              vendors(id, verification_status)
            `)
              .eq("status", "active")
              .eq("is_active", true)
              .is("deleted_at", null)
              .in("product_type", [...typeFilter])
              .order("view_count", { ascending: false })
              .range(offset, offset + MARKETPLACE_PAGE_SIZE - 1),
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

        const trendList = (trend ?? []) as DbProduct[];
        const videoMap = await fetchProductVideosMap(
          supabaseRef.current,
          trendList.map((p) => p.id),
        );
        if (loadGeneration !== loadGenRef.current) return;

        const nextTrending = attachProductVideos(trendList, videoMap);
        setTrending(nextTrending);
        setListingCount(count ?? 0);
        setProductsLoading(false);
        return;
      }

      if (onlyPageChanged && skipTrending) {
        setProductsLoading(false);
        return;
      }

      const [{ data: catIds }, { data: deals }, { data: trend }, { count }] =
        await Promise.all([
          supabaseRef.current
            .from("products")
            .select("category_id")
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", [...typeFilter])
            .not("category_id", "is", null),

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

          applyFilters(
            supabaseRef.current
              .from("products")
              .select(`
              id, name, slug, price, currency, compare_at_price, images, product_type,
              status, is_flash_deal, discount_label, shipping_from,
              delivery_time, affiliate_commission_rate, sale_count,
              rating, review_count, is_free_shipping, vendor_id, category_id,
              vendors(id, verification_status)
            `)
              .eq("status", "active")
              .eq("is_active", true)
              .is("deleted_at", null)
              .in("product_type", [...typeFilter])
              .order("view_count", { ascending: false })
              .range(offset, offset + MARKETPLACE_PAGE_SIZE - 1),
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

      const ids = [
        ...new Set(
          (catIds ?? [])
            .map((r: { category_id: string | null }) => r.category_id)
            .filter(Boolean),
        ),
      ] as string[];

      let nextCategories: DbCategory[] = [];
      if (ids.length > 0) {
        const { data: catRows } = await supabaseRef.current
          .from("product_categories")
          .select("id, name, slug, product_count, image_url, tint_color")
          .eq("is_active", true)
          .eq("visible", true)
          .is("parent_id", null)
          .in("id", ids)
          .order("product_count", { ascending: false })
          .limit(40);
        if (loadGeneration !== loadGenRef.current) return;
        nextCategories = (catRows ?? []) as DbCategory[];
      }

      const dealList = (deals ?? []) as DbProduct[];
      const trendList = (trend ?? []) as DbProduct[];
      const videoMap = await fetchProductVideosMap(
        supabaseRef.current,
        [...dealList, ...trendList].map((p) => p.id),
      );

      if (loadGeneration !== loadGenRef.current) return;

      const nextDeals = attachProductVideos(dealList, videoMap);
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

    load();
  }, [type, filtersKey, currentPage, debouncedSearch, filters, router, searchParams, urlType, initialType]);

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchExactMatch(true);
      if (isDefaultBrowseState(filters, "", currentPage) && cacheRef.current[type]) {
        applyCachedType(type);
      }
      return;
    }

    let cancelled = false;
    const searchGeneration = ++loadGenRef.current;
    setProductsLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/marketplace/search?q=${encodeURIComponent(debouncedSearch)}&type=${type}&limit=40`,
        );
        const data = await res.json();
        if (cancelled || searchGeneration !== loadGenRef.current) return;

        const primary = (data.exactMatch ? data.results : data.similar) ?? [];
        const related = data.exactMatch ? [] : (data.recommended ?? []);
        const seen = new Set<string>();
        const combined = [...primary, ...related].filter((p: DbProduct) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        const videoMap = await fetchProductVideosMap(
          supabaseRef.current,
          combined.map((p: DbProduct) => p.id),
        );
        setTrending(attachProductVideos(combined, videoMap));
        setSearchExactMatch(Boolean(data.exactMatch));
        setListingCount(combined.length);
      } catch {
        if (!cancelled && searchGeneration === loadGenRef.current) setTrending([]);
      } finally {
        if (!cancelled && searchGeneration === loadGenRef.current) setProductsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, type]);

  const totalPages = Math.max(1, Math.ceil(listingCount / MARKETPLACE_PAGE_SIZE));

  useEffect(() => {
    if (listingCount > 0 && currentPage > totalPages) {
      goToPage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only clamp when result set shrinks
  }, [listingCount, totalPages]);

  // Flash deals stay unfiltered during search (section unchanged)
  const filteredDeals = flashDeals;

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
  const recentSearches = useMemo(() => {
    if (typeof window === "undefined") return [] as string[];
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => typeof x === "string").slice(0, 8);
    } catch {
      return [];
    }
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

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setSearchFocused(false);
  }

  function submitSearch(term?: string) {
    applySearch(term ?? search);
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

  const showSearchPopover = searchFocused && (q.length > 0 || recentSearches.length > 0);

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-4 lg:gap-y-3">
      {/* Sidebar — sticky while scrolling product feed */}
      <div className="hidden lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:block lg:self-start lg:sticky lg:top-[calc(var(--navbar-height,64px)+0.75rem)] lg:z-20 lg:max-h-[calc(100dvh-var(--navbar-height,64px)-1.5rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain lg:pr-0.5 [scrollbar-width:thin]">
        <Sidebar type={type} />
      </div>

      {/* Search — aligns top with Categories */}
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col gap-2 relative">
          <div className={marketplaceSearchBarClassName(searchFocused)}>
            <button
              type="button"
              aria-label="Search marketplace"
              onClick={() => submitSearch()}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <MarketplaceSearchIcon active={q.length > 0} />
            </button>
            <MarketplaceSearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                if (!v.trim()) setDebouncedSearch("");
              }}
              type={type}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
                if (e.key === "Escape") (e.target as HTMLInputElement)?.blur();
              }}
            />

            <button
              type="button"
              aria-label="Visual search"
              className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <Camera className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => openAssistant(search.trim() || undefined)}
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
            <span
              className="hidden shrink-0 items-center gap-1.5 text-xs lg:flex"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span className="size-1.5 rounded-full bg-green-500" />
              {listingCount} listings
            </span>
          </div>

          <MarketplaceSearchPopover
            query={search}
            type={type}
            open={showSearchPopover}
            recentSearches={recentSearches}
            popularSearches={POPULAR_SEARCHES}
            trendingCategories={trendingCategorySuggestions}
            onPick={(term) => applySearch(term)}
            onSubmit={submitSearch}
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
      <div className="flex min-w-0 flex-col gap-3 overflow-x-hidden lg:col-start-2 lg:row-start-2">
        <ProductTestimonialsCarousel
          products={testimonials[type] ?? []}
          type={type}
        />

        <div className="w-full min-w-0">
        <MarketplaceTrustStrip stats={stats} listingCount={listingCount} />
        </div>

        {/* ── Flash Deals — skeleton only this section while loading ── */}
        <section id="flash-deals-section">
          <div className="flex flex-col px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4" style={{ color: "var(--color-accent)" }} />
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Flash Deals</h2>
              </div>
              <div className="flex items-center gap-4">
                <FlashDealsCountdown />
                <Link
                  href="/marketplace/flash-deals"
                  className="font-mono text-sm text-[#FD5000] transition-colors hover:text-[#ff7a2e]"
                >
                  View All Deals
                </Link>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Limited time offers – Don&apos;t miss out!
            </p>
          </div>
          <div className="px-4 pb-4">
            {loading && filteredDeals.length === 0 ? (
              <SkeletonDeals />
            ) : filteredDeals.length > 0 ? (
              <FlashDealsClient deals={filteredDeals} />
            ) : trending.length > 0 ? (
              <FlashDealsClient deals={trending.slice(0, 12)} />
            ) : (
              <p
                className="py-6 text-center text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                No deals available right now — check back soon
              </p>
            )}
          </div>
        </section>

        {/* ── Shop by Category — always rendered ── */}
        {displayCategories.length > 0 && (
          <section className="py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-normal uppercase tracking-[0.12em]" style={{ color: "var(--color-accent)" }}>
                    Marketplace
                  </span>
                  <h2 className="mt-2 font-['var(--font-fraunces)'] text-[30px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-[38px] lg:text-[44px]">
                    Shop by Category
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-[var(--color-text-muted)] sm:mb-2">
                  Explore top categories
                </p>
              </div>

              <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                <div className="flex gap-3 min-w-max">
                  {displayCategories.map((c) => (
                    <CategoryCard key={c.id} c={c} type={type} />
                  ))}
                </div>
              </div>

              <div className="mt-5 text-center sm:hidden">
                <Link
                  href="/marketplace"
                  className="font-mono text-sm transition-colors hover:text-[#ff7a2e]"
                  style={{ color: "var(--color-accent)" }}
                >
                  All products →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Trending Products — skeleton only this section while loading ── */}
        <section id="marketplace-products">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">
              {debouncedSearch
                ? `Results for: ${debouncedSearch}`
                : filters.category && filters.category !== "Trending Now"
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
            ) : filters.category && filters.category !== "Trending Now" ? (
              <button
                type="button"
                onClick={() => setCategory("Trending Now")}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                ✕ Clear
              </button>
            ) : null}
            {!debouncedSearch && (
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                View all <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
          {debouncedSearch && !searchExactMatch && !productsLoading && (
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">
              No exact matches found — showing similar products
            </p>
          )}
          {(loading || productsLoading) && trending.length === 0 ? (
            <SkeletonGrid />
          ) : trending.length === 0 ? (
            <div
              className="rounded-xl border-dashed px-6 py-12 text-center"
              style={{
                border: "1px dashed var(--color-border)",
                background: "var(--color-surface-secondary)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                No products match your filters
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {debouncedSearch
                  ? "Try a different keyword or clear search to browse all products"
                  : "Try adjusting or clearing your filters"}
              </p>
            </div>
          ) : (
            <>
              <TrendingProductsClient key={type} products={trending} type={type} />
              {!debouncedSearch && (
                <MarketplacePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={listingCount}
                  pageSize={MARKETPLACE_PAGE_SIZE}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </section>

        <MarketplaceEngagementHub
          productType={type}
          listingCount={listingCount}
          onSearchPick={setSearch}
        />
      </div>
    </div>
  );
} 