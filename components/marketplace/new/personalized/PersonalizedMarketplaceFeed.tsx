"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedProduct } from "@/lib/marketplace/personalization";
import {
  buildPersonalizedFeed,
  collectPersonalizationSignals,
} from "@/lib/marketplace/personalization";
import { useCartStore } from "@/lib/store/use-cart-store";
import { PersonalizedFeedSection } from "./PersonalizedFeedSection";
import { PersonalizedForYouGate } from "./PersonalizedForYouGate";

const MIN_CATALOG_FOR_GATE = 3;

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

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "recently_viewed" || event.key === "marketplace_recent_searches_v1") {
        setSignalTick((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signals = useMemo(() => {
    void signalTick;
    return collectPersonalizationSignals(extractCartProductIds(orders), []);
  }, [orders, signalTick]);

  const sections = useMemo(
    () =>
      buildPersonalizedFeed({
        catalog,
        flashDeals,
        newProductIds,
        signals,
        productType,
      }),
    [catalog, flashDeals, newProductIds, signals, productType],
  );

  if (!loading && catalog.length < MIN_CATALOG_FOR_GATE) return null;
  if (!loading && sections.length === 0) return null;

  return (
    <PersonalizedForYouGate sectionCount={loading ? 3 : sections.length} loading={loading}>
      {() =>
        loading
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
