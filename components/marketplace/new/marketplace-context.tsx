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

import { usePathname, useRouter, useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import {
  type AppliedFilters,
  type DeliveryTime,
  type ProductType,
} from "@/lib/utils";
import {
  marketplaceFiltersHref,
  marketplaceSwitchHref,
  marketplaceTypeFromPathname,
  readMarketplaceFilters,
  type MarketplaceFilterSnapshot,
} from "@/lib/marketplace/experience";

type PendingFilters = Pick<
  AppliedFilters,
  | "shippingFrom"
  | "deliveryTimes"
  | "priceRange"
  | "minRating"
  | "offer"
  | "format"
  | "arrivals"
  | "trending"
  | "fastShipping"
  | "aiPowered"
>;

const DEFAULT_PENDING: PendingFilters = {
  shippingFrom: [],
  deliveryTimes: [],
  priceRange: [0, 5000],
  minRating: 0,
  offer: "",
  format: "",
  arrivals: false,
  trending: false,
  fastShipping: false,
  aiPowered: false,
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
  setArrivals: (arrivals: boolean) => void;
  setTrending: (trending: boolean) => void;
  setFastShipping: (fastShipping: boolean) => void;
  setAiPowered: (aiPowered: boolean) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  /** Writes `page` without refetching. Returns false when the URL is unchanged. */
  setPage: (page: number) => boolean;
  /** Active catalog. A type click updates this before the route commit. */
  marketplaceType: ProductType;
  navigateMarketplace: (destination: ProductType) => void;
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
    arrivals: snap.arrivals,
    trending: snap.trending,
    fastShipping: snap.fastShipping,
    aiPowered: snap.aiPowered,
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
    arrivals: snap.arrivals,
    trending: snap.trending,
    fastShipping: snap.fastShipping,
    aiPowered: snap.aiPowered,
  };
}

function sameApplied(a: AppliedFilters, b: AppliedFilters) {
  return (
    a.productType === b.productType &&
    a.category === b.category &&
    a.minRating === b.minRating &&
    (a.offer ?? "") === (b.offer ?? "") &&
    (a.format ?? "") === (b.format ?? "") &&
    Boolean(a.arrivals) === Boolean(b.arrivals) &&
    Boolean(a.trending) === Boolean(b.trending) &&
    Boolean(a.fastShipping) === Boolean(b.fastShipping) &&
    Boolean(a.aiPowered) === Boolean(b.aiPowered) &&
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
    arrivals: Boolean(filters.arrivals),
    trending: Boolean(filters.trending),
    fastShipping: Boolean(filters.fastShipping),
    aiPowered: Boolean(filters.aiPowered),
    shippingFrom: filters.shippingFrom,
    deliveryTimes: filters.deliveryTimes,
    page,
  };
}

/** Filter state for the canonical marketplace route. The pathname owns product type. */
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathType: ProductType =
    segment === "digital" || segment === "physical"
      ? segment
      : marketplaceTypeFromPathname(pathname) ?? "physical";
  const paramsKey = searchParams.toString();
  const currentHref = paramsKey ? `${pathname}?${paramsKey}` : pathname;
  const selfHref = useRef<string | null>(null);
  const urlFix = useRef(0);
  const navGen = useRef(0);
  const [announcedType, setAnnouncedType] = useState<ProductType | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const type = announcedType ?? pathType;
  const effectiveParamsKey = pendingHref != null ? (pendingHref.split("?")[1] ?? "") : paramsKey;

  const [filters, setFilters] = useState<AppliedFilters>(() =>
    snapshotToApplied(type, readMarketplaceFilters(searchParams, type)),
  );
  const [pending, setPending] = useState<PendingFilters>(() =>
    snapshotToPending(readMarketplaceFilters(searchParams, type)),
  );

  const page = useMemo(
    () => readMarketplaceFilters(new URLSearchParams(effectiveParamsKey), type).page,
    [effectiveParamsKey, type],
  );

  useEffect(() => {
    const onPop = () => {
      selfHref.current = null;
      urlFix.current += 1;
      setAnnouncedType(null);
      setPendingHref(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (selfHref.current && selfHref.current !== currentHref) return;
    if (selfHref.current === currentHref) selfHref.current = null;
    if (pendingHref && (pendingHref === currentHref || announcedType === pathType)) setPendingHref(null);
    if (announcedType && announcedType === pathType) setAnnouncedType(null);
    const snap = readMarketplaceFilters(new URLSearchParams(paramsKey), type);
    const next = snapshotToApplied(type, snap);
    setFilters((prev) => (sameApplied(prev, next) ? prev : next));
    setPending(snapshotToPending(snap));
  }, [announcedType, currentHref, paramsKey, pathType, pendingHref, type]);

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
      // A same-page query change is fetched, then Next commits the prefetched
      // pathname and the new search string never reaches the address bar.
      // Write it back so refresh, back, and forward keep these filters.
      const fixId = ++urlFix.current;
      const started = Date.now();
      const correctUrl = () => {
        if (fixId !== urlFix.current) return;
        const actual = `${window.location.pathname}${window.location.search}`;
        if (actual !== href) window.history.replaceState(null, "", href);
        if (Date.now() - started < 2500) window.setTimeout(correctUrl, 200);
      };
      window.setTimeout(correctUrl, 0);
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

  const setArrivals = useCallback((arrivals: boolean) => {
    setPending((prev) => ({ ...prev, arrivals }));
  }, []);

  const setTrending = useCallback((trending: boolean) => {
    setPending((prev) => ({ ...prev, trending }));
  }, []);

  const setFastShipping = useCallback((fastShipping: boolean) => {
    setPending((prev) => ({ ...prev, fastShipping }));
  }, []);

  const setAiPowered = useCallback((aiPowered: boolean) => {
    setPending((prev) => ({ ...prev, aiPowered }));
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
      arrivals: Boolean(pending.arrivals),
      trending: Boolean(pending.trending),
      fastShipping: type === "physical" ? Boolean(pending.fastShipping) : false,
      aiPowered: type === "digital" ? Boolean(pending.aiPowered) : false,
    };
    setFilters(next);
    setPending({
      shippingFrom: next.shippingFrom,
      deliveryTimes: next.deliveryTimes,
      priceRange: next.priceRange,
      minRating: 0,
      offer: next.offer,
      format: next.format,
      arrivals: Boolean(next.arrivals),
      trending: Boolean(next.trending),
      fastShipping: Boolean(next.fastShipping),
      aiPowered: Boolean(next.aiPowered),
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
      arrivals: false,
      trending: false,
      fastShipping: false,
      aiPowered: false,
    };
    setPending(DEFAULT_PENDING);
    setFilters(next);
    publish(next, 1);
  }, [filters, publish, type]);

  const setPage = useCallback(
    (nextPage: number) => publish(filters, nextPage),
    [filters, publish],
  );

  const navigateMarketplace = useCallback(
    (destination: ProductType) => {
      if (destination === type) return;
      const href = marketplaceSwitchHref(destination, new URLSearchParams(paramsKey));
      const snap = readMarketplaceFilters(new URLSearchParams(href.split("?")[1] ?? ""), destination);
      const next = snapshotToApplied(destination, snap);
      selfHref.current = href;
      urlFix.current += 1;
      setPendingHref(href);
      setAnnouncedType(destination);
      setFilters(next);
      setPending(snapshotToPending(snap));
      // Show the new URL immediately. The __NA marker keeps Next from turning this
      // into a full document load; router.replace then syncs the App Router entry.
      const currentState = window.history.state;
      const markedState =
        currentState && typeof currentState === "object"
          ? { ...currentState, __NA: true }
          : { __NA: true };
      window.history.pushState(markedState, "", href);
      const navId = ++navGen.current;
      window.setTimeout(() => {
        if (navId !== navGen.current) return;
        router.replace(href, { scroll: false });
      }, 0);
    },
    [paramsKey, router, type],
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
      setArrivals,
      setTrending,
      setFastShipping,
      setAiPowered,
      applyFilters,
      clearFilters,
      setPage,
      marketplaceType: type,
      navigateMarketplace,
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
      setArrivals,
      setTrending,
      setFastShipping,
      setAiPowered,
      applyFilters,
      clearFilters,
      setPage,
      type,
      navigateMarketplace,
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
