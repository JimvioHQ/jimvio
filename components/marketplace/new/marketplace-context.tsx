"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_FILTERS,
  filterListings,
  type AppliedFilters,
  type DeliveryTime,
  type FilterableListing,
  type ProductType,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketplaceProduct = FilterableListing & {
  id: string;
  price_raw: number;
  compare_at_price: number | null;
  discount_label: string | null;
  images: string[] | null;
  affiliate_commission: number | null;
  is_flash_deal: boolean;
  sold_count: number | null;
  claimed_pct: number | null;
  review_count: number | null;
};

type PendingFilters = Pick<
  AppliedFilters,
  "shippingFrom" | "deliveryTimes" | "priceRange" | "minRating"
>;

const DEFAULT_PENDING: PendingFilters = {
  shippingFrom: [],
  deliveryTimes: [],
  priceRange: [0, 5000],
  minRating: 0,
};

type MarketplaceContextValue = {
  filters: AppliedFilters;
  pending: PendingFilters;
  listingCount: number;
  filteredTrending: MarketplaceProduct[];
  filteredDeals: MarketplaceProduct[];
  loading: boolean;
  setSearch: (search: string) => void;
  setProductType: (type: ProductType) => void;
  setCategory: (category: string) => void;
  toggleShippingFrom: (name: string) => void;
  toggleDeliveryTime: (time: DeliveryTime) => void;
  setPriceRange: (range: [number, number]) => void;
  setMinRating: (rating: number) => void;
  applyFilters: () => void;
  clearFilters: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function fmtCount(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function adaptRow(row: any): MarketplaceProduct {
  return {
    id:                  row.id,
    name:                row.name ?? "",
    price:               fmtPrice(row.price ?? 0),
    price_raw:           row.price ?? 0,
    compare_at_price:    row.compare_at_price ?? null,
    discount_label:      row.discount_label ?? null,
    images:              row.images ?? null,
    affiliate_commission: row.affiliate_commission ?? null,
    is_flash_deal:       row.is_flash_deal ?? false,
    sold_count:          row.sold_count ?? null,
    claimed_pct:         row.claimed_pct ?? null,
    category:            row.category ?? "Trending Now",
    shippingFrom:        row.shipping_from ?? "",
    deliveryTime:        (row.delivery_time as DeliveryTime) ?? "standard",
    type:                (row.type as ProductType) ?? "physical",
    rating:              row.rating ? String(row.rating) : undefined,
    review_count:        row.review_count ?? null,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const fetchedRef = useRef(false);

  const [allProducts, setAllProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<AppliedFilters>({
    ...DEFAULT_FILTERS,
    shippingFrom: [],
  });
  const [pending, setPending] = useState<PendingFilters>(DEFAULT_PENDING);

  // ── Fetch all products once on mount ────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, price, compare_at_price, discount_label,
          images, affiliate_commission, is_flash_deal,
          sold_count, claimed_pct, category,
          shipping_from, delivery_time, type,
          rating, review_count, view_count, status
        `)
        .eq("status", "active")
        .order("view_count", { ascending: false })
        .limit(200);

      if (!error && data) {
        setAllProducts(data.map(adaptRow));
      }

      setLoading(false);
    }

    load();
  }, []);

  // ── Derived lists ────────────────────────────────────────────────────────────

  const trending = useMemo(
    () => allProducts.filter((p) => !p.is_flash_deal),
    [allProducts],
  );

  const flashDeals = useMemo(
    () => allProducts.filter((p) => p.is_flash_deal),
    [allProducts],
  );

  const filteredTrending = useMemo(
    () => filterListings(trending, filters),
    [trending, filters],
  );

  const filteredDeals = useMemo(
    () => filterListings(flashDeals, filters),
    [flashDeals, filters],
  );

  const listingCount = useMemo(() => {
    const ids = new Set<string>();
    for (const item of [...filteredTrending, ...filteredDeals]) {
      ids.add(item.id);
    }
    return ids.size;
  }, [filteredTrending, filteredDeals]);

  // ── Filter actions ───────────────────────────────────────────────────────────

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setProductType = useCallback((productType: ProductType) => {
    setFilters((prev) => ({ ...prev, productType }));
  }, []);

  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const toggleShippingFrom = useCallback((name: string) => {
    setPending((prev) => ({
      ...prev,
      shippingFrom: prev.shippingFrom.includes(name)
        ? prev.shippingFrom.filter((s) => s !== name)
        : [...prev.shippingFrom, name],
    }));
  }, []);

  const toggleDeliveryTime = useCallback((time: DeliveryTime) => {
    setPending((prev) => ({
      ...prev,
      deliveryTimes: prev.deliveryTimes.includes(time)
        ? prev.deliveryTimes.filter((t) => t !== time)
        : [...prev.deliveryTimes, time],
    }));
  }, []);

  const setPriceRange = useCallback((priceRange: [number, number]) => {
    setPending((prev) => ({ ...prev, priceRange }));
  }, []);

  const setMinRating = useCallback((minRating: number) => {
    setPending((prev) => ({ ...prev, minRating }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      shippingFrom: pending.shippingFrom,
      deliveryTimes: pending.deliveryTimes,
      priceRange: pending.priceRange,
      minRating: pending.minRating,
    }));
  }, [pending]);

  const clearFilters = useCallback(() => {
    setPending(DEFAULT_PENDING);
    setFilters((prev) => ({ ...prev, ...DEFAULT_PENDING }));
  }, []);

  // ── Context value ────────────────────────────────────────────────────────────

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      filters,
      pending,
      listingCount,
      filteredTrending,
      filteredDeals,
      loading,
      setSearch,
      setProductType,
      setCategory,
      toggleShippingFrom,
      toggleDeliveryTime,
      setPriceRange,
      setMinRating,
      applyFilters,
      clearFilters,
    }),
    [
      filters,
      pending,
      listingCount,
      filteredTrending,
      filteredDeals,
      loading,
      setSearch,
      setProductType,
      setCategory,
      toggleShippingFrom,
      toggleDeliveryTime,
      setPriceRange,
      setMinRating,
      applyFilters,
      clearFilters,
    ],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}