"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_FILTERS,
  type AppliedFilters,
  type DeliveryTime,
  type ProductType,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Context ──────────────────────────────────────────────────────────────────

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

/** Filter state only — product data is owned by MarketplacePageClient. */
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<AppliedFilters>({
    ...DEFAULT_FILTERS,
    shippingFrom: [],
  });
  const [pending, setPending] = useState<PendingFilters>(DEFAULT_PENDING);

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
    setFilters((prev) => ({
      ...prev,
      category: "",
      ...DEFAULT_PENDING,
    }));
  }, []);

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      filters,
      pending,
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
