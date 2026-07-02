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
import { HeroBannerView } from "./HeroBannerView";
import { MarketplaceTrustStrip } from "./MarketplaceTrustStrip";
import type { HeroProduct } from "@/types";
import { useMarketplace } from "./marketplace-context";
import type { DbProduct } from "@/lib/utils";
import { isRenderableUrl } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MarketplacePagination } from "./MarketplacePagination";
import { MARKETPLACE_PAGE_SIZE, parseMarketplacePage } from "@/lib/marketplace/constants";
import { dedupeCategories } from "@/lib/marketplace/category-dedup";
import {
  MarketplaceSearchBar,
  MarketplaceSearchIcon,
  marketplaceSearchBarClassName,
} from "./MarketplaceSearchBar";
import Link from "next/link";

type ProductType = "physical" | "digital";

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
  initialType: "physical" | "digital";
  initialListingCount: number;
  initialFlashDeals: DbProduct[];
  initialTrending: DbProduct[];
  initialCategories: DbCategory[];
  initialStats: Stats;
  heroPhysical: HeroProduct[] | null;
  heroDigital: HeroProduct[] | null;
};

// ─── Category image map — local assets from category.zip ─────────────────────
const CATEGORY_IMAGE_BASE = "/images/categories/";

const CATEGORY_IMAGE_MAP: { keywords: string[]; file: string }[] = [
  { keywords: ["auto", "car", "vehicle", "motorcycle", "bike", "motor"], file: "Automobiles & Motorcycles.png" },
  { keywords: ["bag", "shoe", "sneaker", "backpack", "purse", "footwear", "boot", "sandal", "luggage"], file: "Bags & Shoes.png" },
  { keywords: ["computer", "office", "laptop", "pc", "printer", "stationery", "monitor", "keyboard", "mouse", "desk"], file: "Computer & Office.png" },
  { keywords: ["electron", "gadget", "tv", "television", "camera", "audio", "speaker", "smart", "wearable", "drone"], file: "Consumer Electronics.png" },
  { keywords: ["health", "beauty", "hair", "makeup", "cosmetic", "wellness", "skincare", "perfume", "fragrance", "nail"], file: "Health, Beauty & Hair.png" },
  { keywords: ["home improvement", "tool", "hardware", "diy", "repair", "drill", "saw", "plumbing", "electrical"], file: "Home Improvement.png" },
  { keywords: ["home", "garden", "furniture", "kitchen", "living", "household", "plant", "sofa", "cookware", "bedding", "decor", "lamp", "curtain"], file: "Home, Garden & Furniture.png" },
  { keywords: ["jewel", "watch", "ring", "earring", "necklace", "bracelet", "accessory", "pendant", "gemstone"], file: "Jewelry & Watches.png" },
  { keywords: ["men", "shirt", "jacket", "trouser", "pant", "coat", "outerwear", "suit", "hoodie", "sweatshirt"], file: "Men's Clothing.png" },
  { keywords: ["pet", "dog", "cat", "animal", "aquarium", "bird", "hamster"], file: "Pet Supplies.png" },
  { keywords: ["phone", "smartphone", "mobile", "tablet", "iphone", "android", "charger", "case", "screen protector"], file: "Phones & Accessories.png" },
  { keywords: ["sport", "fitness", "gym", "outdoor", "camping", "basketball", "soccer", "cycling", "running", "yoga", "hiking"], file: "Sports & Outdoors.png" },
  { keywords: ["toy", "kids", "children", "baby", "infant", "game", "puzzle", "doll", "lego"], file: "Toys, Kids & Babies.png" },
  { keywords: ["women", "dress", "tops", "blouse", "skirt", "fashion", "cloth", "wear", "leggings", "lingerie"], file: "Women's Clothing.png" },
];

function getCategoryImageSrc(name: string): string {
  const n = name.toLowerCase();
  const match = CATEGORY_IMAGE_MAP.find(({ keywords }) =>
    keywords.some((kw) => n.includes(kw))
  );
  return `${CATEGORY_IMAGE_BASE}${match ? match.file : "Consumer Electronics.png"}`;
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({ c, type }: { c: DbCategory; type: ProductType }) {
  const [imgErr, setImgErr] = useState(false);

  const uploadedSrc =
    c.image_url && isRenderableUrl(c.image_url) ? c.image_url.trim() : null;
  const imgSrc = uploadedSrc ?? getCategoryImageSrc(c.name);
  const showImg = !imgErr;

  return (
    <Link
      href={`/marketplace?type=${type}&category=${c.slug}`}
      className="group relative flex h-[118px] w-full flex-col overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] text-center shadow-sm transition-shadow duration-200 ease-out hover:shadow-lg md:h-auto md:rounded-xl"
    >
      <div className="relative h-[86px] w-full overflow-hidden bg-[var(--color-surface-secondary)] md:h-auto md:aspect-[4/3]">
        {showImg ? (
          <img
            src={imgSrc}
            alt={c.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: c.tint_color ?? "var(--color-surface-secondary)" }}
          >
            <span className="select-none text-3xl font-black uppercase text-[var(--color-text-primary)]/20">
              {c.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="w-full bg-[var(--color-surface)] px-2 py-1.5 md:py-2">
        <div className="line-clamp-2 text-[11px] font-bold leading-tight text-[var(--color-text-primary)] md:text-[12px]">
          {c.name}
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
  initialListingCount,
  initialFlashDeals,
  initialTrending,
  initialCategories,
  initialStats,
  heroPhysical,
  heroDigital,
}: Props) {
  const supabase = createClient();

  const { filters, setCategory, clearFilters } = useMarketplace();
  const openAssistant = useAIStore((s) => s.openAssistant);

  const router = useRouter();
  const searchParams = useSearchParams();

  const urlType = searchParams.get("type") as ProductType | null;
  const [type, setType] = useState<ProductType>(
    urlType === "digital" ? "digital" : urlType === "physical" ? "physical" : initialType
  );

  useEffect(() => {
    const next = searchParams.get("type");
    if (next === "digital" || next === "physical") {
      setType(next);
    }
  }, [searchParams]);

  function handleTypeChange(t: ProductType) {
    setType(t);
    setCategory("Trending Now");
    clearFilters();
    setCurrentPage(1);
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
  const [flashDeals, setFlashDeals] = useState<DbProduct[]>(initialFlashDeals);
  const [trending, setTrending] = useState<DbProduct[]>(initialTrending);
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [listingCount, setListingCount] = useState(initialListingCount);
  const [isMobile, setIsMobile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const supabaseRef = useRef(supabase);
  const filtersKey = JSON.stringify(filters);
  const loadDepsRef = useRef({
    type,
    filtersKey,
    debouncedSearch,
    currentPage,
  });

  // Skip the refetch on initial mount — we already have SSR data for page 1
  const isFirstRender = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
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
    if (isFirstRender.current && currentPage === 1) {
      isFirstRender.current = false;
      return;
    }
    isFirstRender.current = false;

    const prev = loadDepsRef.current;
    const filterOrSearchChanged =
      prev.filtersKey !== filtersKey ||
      prev.debouncedSearch !== debouncedSearch ||
      prev.type !== type;
    const onlyPageChanged =
      !filterOrSearchChanged &&
      prev.currentPage !== currentPage;
    const effectivePage = filterOrSearchChanged ? 1 : currentPage;

    if (filterOrSearchChanged && currentPage !== 1) {
      setCurrentPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      router.replace(`/marketplace?${params.toString()}`, { scroll: false });
    }

    loadDepsRef.current = { type, filtersKey, debouncedSearch, currentPage: effectivePage };

    async function load() {
      if (onlyPageChanged) setProductsLoading(true);
      else setLoading(true);

      const typeFilter =
        type === "digital"
          ? (["digital", "course", "ebook", "software", "template", "coaching"] as const)
          : (["physical"] as const);

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
        categoryId = catRow?.id ?? null;
      }

      function applyFilters(q: any): any {
        if (hasShipping) q = q.in("shipping_from", filters.shippingFrom);
        if (hasDelivery) q = q.in("delivery_time", filters.deliveryTimes);
        if (hasPriceMax) q = q.lte("price", filters.priceRange[1]);
        if (hasPriceMin) q = q.gte("price", filters.priceRange[0]);
        if (hasRating) q = q.gte("rating", filters.minRating);
        if (categoryId) q = q.eq("category_id", categoryId);
        if (debouncedSearch) q = q.ilike("name", `%${debouncedSearch}%`);
        return q;
      }

      const offset = (effectivePage - 1) * MARKETPLACE_PAGE_SIZE;

      if (onlyPageChanged) {
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

        const trendList = (trend ?? []) as DbProduct[];
        const videoMap = await fetchProductVideosMap(
          supabaseRef.current,
          trendList.map((p) => p.id),
        );
        setTrending(attachProductVideos(trendList, videoMap));
        setListingCount(count ?? 0);
        setProductsLoading(false);
        return;
      }

      const { data: catIds } = await supabaseRef.current
        .from("products")
        .select("category_id")
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", [...typeFilter])
        .not("category_id", "is", null);

      const ids = [...new Set((catIds ?? []).map((r: { category_id: string | null }) => r.category_id).filter(Boolean))];

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
        nextCategories = (catRows ?? []) as DbCategory[];
      }
      // Always keep Shop by Category filled (even when duplicates are removed)
      if (nextCategories.length < 12) {
        const { data: catRows } = await supabaseRef.current
          .from("product_categories")
          .select("id, name, slug, product_count, image_url, tint_color")
          .eq("is_active", true)
          .eq("visible", true)
          .is("parent_id", null)
          .order("product_count", { ascending: false })
          .limit(60);
        nextCategories = (catRows ?? []) as DbCategory[];
      }
      setCategories(nextCategories);

      const [{ data: deals }, { data: trend }, { count }] = await Promise.all([
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

      const dealList = (deals ?? []) as DbProduct[];
      const trendList = (trend ?? []) as DbProduct[];
      const videoMap = await fetchProductVideosMap(
        supabaseRef.current,
        [...dealList, ...trendList].map((p) => p.id),
      );

      setFlashDeals(attachProductVideos(dealList, videoMap));
      setTrending(attachProductVideos(trendList, videoMap));
      setListingCount(count ?? 0);
      setLoading(false);
    }

    load();
  }, [type, filtersKey, currentPage, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(listingCount / MARKETPLACE_PAGE_SIZE));

  useEffect(() => {
    if (listingCount > 0 && currentPage > totalPages) {
      goToPage(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only clamp when result set shrinks
  }, [listingCount, totalPages]);

  // Client-side filter for flash deals only (small set)
  const filteredDeals = debouncedSearch
    ? flashDeals.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : flashDeals;

  const displayCategories = useMemo(() => {
    const unique = dedupeCategories(categories);
    const target = isMobile ? 6 : 7;
    return unique.slice(0, target);
  }, [categories, isMobile]);

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

  const q = search.trim();
  const qLower = q.toLowerCase();
  const matchedProducts = useMemo(() => {
    if (!q) return [] as DbProduct[];
    return trending.filter((p) => p.name.toLowerCase().includes(qLower)).slice(0, 6);
  }, [q, qLower, trending]);

  const matchedCategories = useMemo(() => {
    if (!q) return [] as DbCategory[];
    const uniq = new Map<string, DbCategory>();
    for (const c of categories) {
      const key = c.slug?.toLowerCase().trim() || c.name?.toLowerCase().trim() || c.id;
      if (!key || uniq.has(key)) continue;
      if (!c.name?.toLowerCase().includes(qLower) && !c.slug?.toLowerCase().includes(qLower)) continue;
      uniq.set(key, c);
      if (uniq.size >= 6) break;
    }
    return [...uniq.values()];
  }, [q, qLower, categories]);

  const trendingCategorySuggestions = useMemo(() => {
    return categories
      .slice()
      .sort((a, b) => Number(b.product_count ?? 0) - Number(a.product_count ?? 0))
      .map((c) => c.name)
      .filter(Boolean)
      .slice(0, 5);
  }, [categories]);

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
            <MarketplaceSearchIcon active={q.length > 0} />
            <MarketplaceSearchBar
              value={search}
              onChange={setSearch}
              type={type}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter") pushRecent(search);
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

          {showSearchPopover && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
              style={{
                transform: "translate3d(0,0,0)",
                willChange: "transform, opacity",
                animation: "fadeInUp 160ms ease-out",
              }}
            >
              <div className="p-2 sm:p-3">
                {q.length === 0 ? (
                  <div className="space-y-3">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                          Recent
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.slice(0, 8).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSearch(t);
                                pushRecent(t);
                              }}
                              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-transform duration-150 hover:scale-[1.02]"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                        Popular searches
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearch(t);
                              pushRecent(t);
                            }}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-transform duration-150 hover:scale-[1.02]"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                        <span
                          className="relative inline-flex items-center overflow-hidden rounded-full px-2 py-0.5 text-[9px] font-black text-white"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(253,80,0,1) 0%, rgba(255,140,0,1) 100%)",
                          }}
                        >
                          Trending
                          <span
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(110deg, transparent 0%, rgba(255,255,255,.35) 45%, transparent 70%)",
                              transform: "translateX(-120%)",
                              animation: "marketplaceShimmer 1.8s linear infinite",
                            }}
                          />
                        </span>
                        Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trendingCategorySuggestions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearch(t);
                              pushRecent(t);
                            }}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-transform duration-150 hover:scale-[1.02]"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchedProducts.length > 0 && (
                      <div style={{ animation: "fadeInUp 160ms ease-out" }}>
                        <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                          Instant results
                        </div>
                        <div className="space-y-1">
                          {matchedProducts.map((p) => (
                            <Link
                              key={p.id}
                              href={`/marketplace/${p.slug}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => pushRecent(search)}
                              className="flex items-center justify-between rounded-lg px-2 py-2 transition-transform duration-150 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
                            >
                              <span className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                                {p.name}
                              </span>
                              <span className="ml-3 shrink-0 text-[11px] font-bold text-[var(--color-accent)]">
                                View
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchedCategories.length > 0 && (
                      <div style={{ animation: "fadeInUp 160ms ease-out" }}>
                        <div className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--color-text-muted)]">
                          Categories
                        </div>
                        <div className="space-y-1">
                          {matchedCategories.map((c) => (
                            <Link
                              key={c.id}
                              href={`/marketplace?type=${type}&category=${c.slug}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => pushRecent(search)}
                              className="flex items-center justify-between rounded-lg px-2 py-2 transition-transform duration-150 hover:scale-[1.02] hover:bg-[var(--color-surface-secondary)]"
                            >
                              <span className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                                {c.name}
                              </span>
                              <span className="ml-3 shrink-0 text-[11px] font-bold text-[var(--color-text-muted)]">
                                Explore
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {matchedProducts.length === 0 && matchedCategories.length === 0 && (
                      <div className="rounded-lg bg-[var(--color-surface-secondary)] px-3 py-3">
                        <div className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                          No quick matches yet
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          Try searching popular items like “Wireless Earbuds” or “Smart Watch”.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
        <HeroBannerView physical={heroPhysical} digital={heroDigital} initialType={type} />

        <div className="w-full min-w-0">
        <MarketplaceTrustStrip stats={stats} listingCount={listingCount} />
        </div>

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
            {loading ? (
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
        {categories.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">Shop by Category</h2>
              <button
                className="text-xs font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                Explore top categories
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-7">
              {displayCategories.map((c) => (
                <CategoryCard key={c.id} c={c} type={type} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending Products — skeleton only this section while loading ── */}
        <section id="marketplace-products">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">
              {filters.category && filters.category !== "Trending Now"
                ? filters.category
                : `Trending ${type === "digital" ? "Digital " : ""}Products`}
            </h2>
            {filters.category && filters.category !== "Trending Now" && (
              <button
                type="button"
                onClick={() => setCategory("Trending Now")}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                ✕ Clear
              </button>
            )}
            <button
              type="button"
              className="ml-auto flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              View all <ArrowRight className="size-3.5" />
            </button>
          </div>
          {loading || productsLoading ? (
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
                Try adjusting or clearing your filters
              </p>
            </div>
          ) : (
            <>
              <TrendingProductsClient products={trending} type={type} />
              <MarketplacePagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={listingCount}
                pageSize={MARKETPLACE_PAGE_SIZE}
                onPageChange={goToPage}
              />
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