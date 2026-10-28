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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type AppliedFilters,
  type DeliveryTime,
  type ProductType,
} from "@/lib/utils";
import {
  marketplaceFiltersHref,
  marketplaceTypeFromPathname,
  readMarketplaceFilters,
  type MarketplaceFilterSnapshot,
} from "@/lib/marketplace/experience";

type PendingFilters = Pick<
  AppliedFilters,
  "shippingFrom" | "deliveryTimes" | "priceRange" | "minRating" | "offer" | "format"
>;

const DEFAULT_PENDING: PendingFilters = {
  shippingFrom: [],
  deliveryTimes: [],
  priceRange: [0, 5000],
  minRating: 0,
  offer: "",
  format: "",
};

type MarketplaceContextValue = {
  filters: AppliedFilters;
  pending: PendingFilters;
  page: number;
  setSearch: (search: string) => void;
  setProductType: (type: ProductType) => void;
  setCategory: (category: string) => void;
  toggleShippingFrom: (name: string) => void;
  toggleDeliveryTime: (time: DeliveryTime) => void;
  setPriceRange: (range: [number, number]) => void;
  setMinRating: (rating: number) => void;
  setOffer: (offer: AppliedFilters["offer"]) => void;
  setFormat: (format: AppliedFilters["format"]) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  /** Writes `page` without refetching. Returns false when the URL is unchanged. */
  setPage: (page: number) => boolean;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function snapshotToApplied(type: ProductType, snap: MarketplaceFilterSnapshot): AppliedFilters {
  return {
    search: "",
    productType: type,
    category: snap.category,
    shippingFrom: snap.shippingFrom,
    deliveryTimes: snap.deliveryTimes,
    priceRange: snap.priceRange,
    minRating: 0,
    offer: type === "physical" ? snap.offer : "",
    format: type === "digital" ? snap.format : "",
  };
}

function snapshotToPending(snap: MarketplaceFilterSnapshot): PendingFilters {
  return {
    shippingFrom: snap.shippingFrom,
    deliveryTimes: snap.deliveryTimes,
    priceRange: snap.priceRange,
    minRating: 0,
    offer: snap.offer,
    format: snap.format,
  };
}

function sameApplied(a: AppliedFilters, b: AppliedFilters) {
  return (
    a.productType === b.productType &&
    a.category === b.category &&
    a.minRating === b.minRating &&
    (a.offer ?? "") === (b.offer ?? "") &&
    (a.format ?? "") === (b.format ?? "") &&
    a.priceRange[0] === b.priceRange[0] &&
    a.priceRange[1] === b.priceRange[1] &&
    sameList(a.shippingFrom, b.shippingFrom) &&
    sameList(a.deliveryTimes, b.deliveryTimes)
  );
}

function toSnapshot(filters: AppliedFilters, page: number): MarketplaceFilterSnapshot {
  return {
    category: filters.category,
    priceRange: filters.priceRange,
    minRating: filters.minRating,
    offer: filters.offer ?? "",
    format: filters.format ?? "",
    shippingFrom: filters.shippingFrom,
    deliveryTimes: filters.deliveryTimes,
    page,
  };
}

/** Filter state for the canonical marketplace route. The pathname owns product type. */
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = marketplaceTypeFromPathname(pathname) ?? "physical";
  const paramsKey = searchParams.toString();
  const currentHref = paramsKey ? `${pathname}?${paramsKey}` : pathname;
  const selfHref = useRef<string | null>(null);

  const [filters, setFilters] = useState<AppliedFilters>(() =>
    snapshotToApplied(type, readMarketplaceFilters(searchParams, type)),
  );
  const [pending, setPending] = useState<PendingFilters>(() =>
    snapshotToPending(readMarketplaceFilters(searchParams, type)),
  );

  const page = useMemo(
    () => readMarketplaceFilters(new URLSearchParams(paramsKey), type).page,
    [paramsKey, type],
  );

  useEffect(() => {
    if (selfHref.current === currentHref) {
      selfHref.current = null;
      return;
    }
    const snap = readMarketplaceFilters(new URLSearchParams(paramsKey), type);
    const next = snapshotToApplied(type, snap);
    setFilters((prev) => (sameApplied(prev, next) ? prev : next));
    setPending(snapshotToPending(snap));
  }, [currentHref, paramsKey, type]);

  const publish = useCallback(
    (next: AppliedFilters, nextPage: number) => {
      const href = marketplaceFiltersHref(
        type,
        toSnapshot(next, nextPage),
        new URLSearchParams(paramsKey),
      );
      if (href === currentHref) return false;
      selfHref.current = href;
      router.replace(href, { scroll: false });
      return true;
    },
    [currentHref, paramsKey, router, type],
  );

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setProductType = useCallback((productType: ProductType) => {
    setFilters((prev) => ({ ...prev, productType }));
  }, []);

  const setCategory = useCallback(
    (category: string) => {
      const next = { ...filters, category, productType: type };
      setFilters(next);
      publish(next, 1);
    },
    [filters, publish, type],
  );

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

  const setOffer = useCallback((offer: AppliedFilters["offer"]) => {
    setPending((prev) => ({ ...prev, offer: offer ?? "" }));
  }, []);

  const setFormat = useCallback((format: AppliedFilters["format"]) => {
    setPending((prev) => ({ ...prev, format: format ?? "" }));
  }, []);

  const applyFilters = useCallback(() => {
    const next: AppliedFilters = {
      ...filters,
      productType: type,
      shippingFrom: type === "physical" ? pending.shippingFrom : [],
      deliveryTimes: type === "physical" ? pending.deliveryTimes : [],
      priceRange: pending.priceRange,
      minRating: 0,
      offer: type === "physical" ? pending.offer ?? "" : "",
      format: type === "digital" ? pending.format ?? "" : "",
    };
    setFilters(next);
    setPending({
      shippingFrom: next.shippingFrom,
      deliveryTimes: next.deliveryTimes,
      priceRange: next.priceRange,
      minRating: 0,
      offer: next.offer,
      format: next.format,
    });
    publish(next, 1);
  }, [filters, pending, publish, type]);

  const clearFilters = useCallback(() => {
    const next: AppliedFilters = {
      ...filters,
      productType: type,
      category: "",
      shippingFrom: [],
      deliveryTimes: [],
      priceRange: DEFAULT_PENDING.priceRange,
      minRating: 0,
      offer: "",
      format: "",
    };
    setPending(DEFAULT_PENDING);
    setFilters(next);
    publish(next, 1);
  }, [filters, publish, type]);

  const setPage = useCallback(
    (nextPage: number) => publish(filters, nextPage),
    [filters, publish],
  );

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      filters,
      pending,
      page,
      setSearch,
      setProductType,
      setCategory,
      toggleShippingFrom,
      toggleDeliveryTime,
      setPriceRange,
      setMinRating,
      setOffer,
      setFormat,
      applyFilters,
      clearFilters,
      setPage,
    }),
    [
      filters,
      pending,
      page,
      setSearch,
      setProductType,
      setCategory,
      toggleShippingFrom,
      toggleDeliveryTime,
      setPriceRange,
      setMinRating,
      setOffer,
      setFormat,
      applyFilters,
      clearFilters,
      setPage,
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
