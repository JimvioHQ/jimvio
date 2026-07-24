"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import {
  deriveAiBusinessInsights,
  deriveCommerceMetrics,
  deriveCustomer360,
  deriveProductHub,
  deriveSalesFunnel,
  type CommerceOverviewInput,
  type CommercePeriod,
} from "@/lib/community/commerce/unified";
import { CommerceCommandCenter } from "./CommerceCommandCenter";
import { SalesFunnel } from "./SalesFunnel";
import { Customer360Card } from "./Customer360Card";
import { ProductHub } from "./ProductHub";
import { AiBusinessInsights } from "./AiBusinessInsights";
import { CreatorAutomationsBuilder } from "./CreatorAutomationsBuilder";

/**
 * Unified Creator Commerce shell — additive to Creator OS / Community Store.
 * Does not replace CommunityStorefront or Command Center.
 */
export function UnifiedCreatorCommerceShell({
  base,
  communityId,
  overview,
}: {
  base: string;
  communityId: string;
  overview: CommerceOverviewInput | null | undefined;
}) {
  const router = useRouter();
  const clientReady = useClientReady();
  const [period, setPeriod] = useState<CommercePeriod>("monthly");

  const storeItemsRaw = useCreatorCommerceStore(
    useShallow((s) => s.itemsForCommunity(communityId))
  );
  const affiliateRaw = useCreatorCommerceStore(
    useShallow((s) => s.affiliateStats)
  );
  const donationsTotalRaw = useCreatorCommerceStore((s) =>
    s.donations
      .filter((d) => d.communityId === communityId)
      .reduce((sum, d) => sum + d.amount, 0)
  );

  const storeItems = clientReady ? storeItemsRaw : [];
  const affiliateStats = clientReady ? affiliateRaw : [];
  const donationsTotal = clientReady ? donationsTotalRaw : 0;

  const metrics = useMemo(
    () =>
      deriveCommerceMetrics({
        base,
        period,
        overview,
        storeItems,
        affiliateStats,
        donationsTotal,
      }),
    [affiliateStats, base, donationsTotal, overview, period, storeItems]
  );

  const funnel = useMemo(
    () => deriveSalesFunnel({ overview, storeItems, affiliateStats, period }),
    [affiliateStats, overview, period, storeItems]
  );

  const productGroups = useMemo(
    () => deriveProductHub({ base, storeItems, overview, affiliateStats }),
    [affiliateStats, base, overview, storeItems]
  );

  const insights = useMemo(
    () =>
      deriveAiBusinessInsights({
        base,
        overview,
        storeItems,
        affiliateStats,
        period,
      }),
    [affiliateStats, base, overview, period, storeItems]
  );

  const customer = useMemo(
    () => deriveCustomer360({ overview, storeItems, affiliateStats }),
    [affiliateStats, overview, storeItems]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === "u") {
        e.preventDefault();
        document
          .getElementById("unified-creator-commerce")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (key === "o") {
        e.preventDefault();
        router.push("/dashboard/orders");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      id="unified-creator-commerce"
      className="space-y-5 scroll-mt-4"
      aria-label="Unified creator commerce"
    >
      <CommerceCommandCenter
        metrics={metrics}
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SalesFunnel steps={funnel} />
        </div>
        <div className="lg:col-span-2">
          <Customer360Card profile={customer} />
        </div>
      </div>

      <ProductHub groups={productGroups} />
      <AiBusinessInsights insights={insights} />
      <CreatorAutomationsBuilder communityId={communityId} />

      <p className="text-[10.5px] text-[var(--color-text-muted)]">
        Shortcuts: ⌘⇧U jump to commerce · ⌘⇧O orders
      </p>
    </div>
  );
}
