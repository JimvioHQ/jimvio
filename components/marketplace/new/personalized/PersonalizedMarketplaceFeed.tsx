"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedProduct, PersonalizationSignals } from "@/lib/marketplace/personalization";
import {
  buildPersonalizedFeed,
  collectPersonalizationSignals,
} from "@/lib/marketplace/personalization";
import { useCartStore } from "@/lib/store/use-cart-store";
import { PersonalizedFeedSection } from "./PersonalizedFeedSection";
import { PersonalizedForYouGate } from "./PersonalizedForYouGate";

const EMPTY_SIGNALS: PersonalizationSignals = {
  viewedProductIds: [],
  viewedProducts: [],
  viewedCategoryIds: [],
  cartProductIds: [],
  wishlistProductIds: [],
  searchTerms: [],
  countryCode: "US",
  language: "en",
  creatorInterestTags: [],
};

function extractCartProductIds(orders: unknown[]): string[] {
  const ids = new Set<string>();
  for (const order of orders) {
    const items = (order as { order_items?: Array<{ product_id?: string | null }> })
      .order_items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item.product_id) ids.add(item.product_id);
    }
  }
  return [...ids];
}

type PersonalizedMarketplaceFeedProps = {
  catalog: FeedProduct[];
  flashDeals: FeedProduct[];
  newProductIds?: Set<string>;
  productType: "physical" | "digital";
  loading?: boolean;
};

export function PersonalizedMarketplaceFeed({
  catalog,
  flashDeals,
  newProductIds,
  productType,
  loading = false,
}: PersonalizedMarketplaceFeedProps) {
  const orders = useCartStore((s) => s.orders);
  const [signalTick, setSignalTick] = useState(0);
  const [signalsReady, setSignalsReady] = useState(false);
  /** Stays true after first expand — caches recommendations for instant re-open. */
  const [contentRequested, setContentRequested] = useState(false);

  useEffect(() => {
    setSignalsReady(true);
  }, []);

  useEffect(() => {
    if (!contentRequested) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === "recently_viewed" || event.key === "marketplace_recent_searches_v1") {
        setSignalTick((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [contentRequested]);

  const handleExpandedChange = useCallback((expanded: boolean) => {
    if (expanded) setContentRequested(true);
  }, []);

  const signals = useMemo(() => {
    if (!contentRequested || !signalsReady) return EMPTY_SIGNALS;
    void signalTick;
    return collectPersonalizationSignals(extractCartProductIds(orders), []);
  }, [contentRequested, signalsReady, orders, signalTick]);

  const sections = useMemo(() => {
    if (!contentRequested) return [];
    return buildPersonalizedFeed({
      catalog,
      flashDeals,
      newProductIds,
      signals,
      productType,
    });
  }, [contentRequested, catalog, flashDeals, newProductIds, signals, productType]);

  const panelLoading = contentRequested && loading && sections.length === 0;
  const sectionCount = contentRequested ? sections.length : null;

  return (
    <PersonalizedForYouGate
      sectionCount={sectionCount}
      loading={panelLoading}
      onExpandedChange={handleExpandedChange}
    >
      {() =>
        panelLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <PersonalizedFeedSection
                key={`personalized-loading-${i}`}
                section={{
                  id: "recommended-for-you",
                  title: "Loading recommendations",
                  description: "Preparing your feed…",
                  viewAllHref: "/marketplace",
                  products: [],
                }}
                index={i}
                loading
              />
            ))
          : sections.map((section, index) => (
              <PersonalizedFeedSection
                key={section.id}
                section={section}
                index={index}
              />
            ))
      }
    </PersonalizedForYouGate>
  );
}
