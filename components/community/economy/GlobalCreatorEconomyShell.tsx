"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { useCreatorOSStore } from "@/lib/community/os";
import {
  deriveCareerCoach,
  deriveCreatorProfilePro,
  deriveGlobalDiscovery,
  deriveOpportunities,
  deriveReputation,
  recommendMatches,
  type EconomyOverviewInput,
} from "@/lib/community/economy";
import { OpportunityMarketplace } from "./OpportunityMarketplace";
import type { LiveCampaignLike } from "@/lib/community/economy/opportunities";
import { CreatorProfileProCard } from "./CreatorProfileProCard";
import { AiMatchingEngine } from "./AiMatchingEngine";
import { ReputationEngine } from "./ReputationEngine";
import { AiCareerCoach, GlobalDiscovery } from "./AiCareerCoach";

/**
 * Global Creator Economy shell — additive to Creator OS / Commerce / Community.
 * Does not replace UGC hub or existing creator profiles.
 */
export function GlobalCreatorEconomyShell({
  base,
  communityId,
  communityName,
  overview,
}: {
  base: string;
  communityId: string;
  communityName?: string;
  overview: EconomyOverviewInput | null | undefined;
}) {
  const clientReady = useClientReady();

  const storeItemsRaw = useCreatorCommerceStore(
    useShallow((s) => s.itemsForCommunity(communityId))
  );
  const affiliateRaw = useCreatorCommerceStore(
    useShallow((s) => s.affiliateStats)
  );
  const openTasksRaw = useCreatorOSStore(
    useShallow((s) =>
      s.tasks.filter(
        (t) => t.communityId === communityId && t.status !== "completed"
      )
    )
  );


  const storeItems = clientReady ? storeItemsRaw : [];
  const affiliateStats = clientReady ? affiliateRaw : [];
  const openTaskCount = clientReady ? openTasksRaw.length : 0;

  const overviewWithName = useMemo(
    () => ({
      ...overview,
      communityName: communityName ?? overview?.communityName,
    }),
    [communityName, overview]
  );

  // Live UGC campaigns only — no placeholder catalog.
  const [liveCampaigns, setLiveCampaigns] = useState<LiveCampaignLike[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ugc/campaigns?limit=12&sort=newest")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: LiveCampaignLike[]; campaigns?: LiveCampaignLike[] } | null) => {
        if (!cancelled) setLiveCampaigns(j?.data ?? j?.campaigns ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const opportunities = useMemo(
    () => deriveOpportunities({ base, overview: overviewWithName, campaigns: liveCampaigns }),
    [base, overviewWithName, liveCampaigns]
  );

  const reputation = useMemo(
    () =>
      deriveReputation({
        overview: overviewWithName,
        storeItems,
        affiliateStats,
        openTaskCount,
      }),
    [affiliateStats, openTaskCount, overviewWithName, storeItems]
  );

  const profile = useMemo(
    () =>
      deriveCreatorProfilePro({
        overview: overviewWithName,
        reputation,
        storeItems,
      }),
    [overviewWithName, reputation, storeItems]
  );

  const matches = useMemo(
    () =>
      recommendMatches({
        overview: overviewWithName,
        base,
        limit: 10,
      }),
    [base, overviewWithName]
  );

  const tips = useMemo(
    () =>
      deriveCareerCoach({
        base,
        overview: overviewWithName,
        reputation,
      }),
    [base, overviewWithName, reputation]
  );

  const discovery = useMemo(
    () =>
      deriveGlobalDiscovery({
        base,
        overview: overviewWithName,
        storeItems,
      }),
    [base, overviewWithName, storeItems]
  );

  return (
    <div className="space-y-5" aria-label="Global creator economy">
      {/* Opportunities link to the real campaign page, where creators join and submit. */}
      <OpportunityMarketplace opportunities={opportunities} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <AiMatchingEngine recommendations={matches} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ReputationEngine reputation={reputation} />
          <CreatorProfileProCard profile={profile} />
        </div>
      </div>

      <AiCareerCoach tips={tips} />
      <GlobalDiscovery items={discovery} />
    </div>
  );
}
