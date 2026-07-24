"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { useCreatorOSStore } from "@/lib/community/os";
import {
  buildWorkspaceFromOpportunity,
  deriveCareerCoach,
  deriveCreatorProfilePro,
  deriveGlobalDiscovery,
  deriveOpportunities,
  deriveReputation,
  recommendMatches,
  useBrandCrmStore,
  type EconomyOverviewInput,
} from "@/lib/community/economy";
import { OpportunityMarketplace } from "./OpportunityMarketplace";
import { CreatorProfileProCard } from "./CreatorProfileProCard";
import { AiMatchingEngine } from "./AiMatchingEngine";
import { CampaignWorkspacePanel } from "./CampaignWorkspacePanel";
import { ReputationEngine } from "./ReputationEngine";
import { AiCareerCoach, GlobalDiscovery } from "./AiCareerCoach";
import { BrandCrmPanel } from "./BrandCrmPanel";

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
  const [activeOppId, setActiveOppId] = useState<string | null>(null);

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

  const upsertWorkspace = useBrandCrmStore((s) => s.upsertWorkspace);
  const setApproval = useBrandCrmStore((s) => s.setApproval);
  const releasePayout = useBrandCrmStore((s) => s.releasePayout);
  const workspacesRaw = useBrandCrmStore(useShallow((s) => s.workspaces));

  const storeItems = clientReady ? storeItemsRaw : [];
  const affiliateStats = clientReady ? affiliateRaw : [];
  const openTaskCount = clientReady ? openTasksRaw.length : 0;
  const workspaces = clientReady ? workspacesRaw : [];

  const overviewWithName = useMemo(
    () => ({
      ...overview,
      communityName: communityName ?? overview?.communityName,
    }),
    [communityName, overview]
  );

  const opportunities = useMemo(
    () => deriveOpportunities({ base, overview: overviewWithName }),
    [base, overviewWithName]
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

  const activeOpp =
    opportunities.find((o) => o.id === activeOppId) ?? opportunities[0] ?? null;

  // Ensure selected opportunity has a persisted workspace for approval/payout actions.
  const workspace = useMemo(() => {
    if (!clientReady || !activeOpp) return null;
    const existing = workspaces.find((w) => w.opportunityId === activeOpp.id);
    if (existing) return existing;
    return buildWorkspaceFromOpportunity(communityId, activeOpp);
  }, [activeOpp, clientReady, communityId, workspaces]);

  function openWorkspace(id: string) {
    setActiveOppId(id);
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) return;
    const existing = useBrandCrmStore.getState().workspaceFor(id);
    if (!existing) {
      upsertWorkspace(buildWorkspaceFromOpportunity(communityId, opp));
    }
  }

  function ensureWorkspace() {
    if (!activeOpp) return;
    const existing = useBrandCrmStore.getState().workspaceFor(activeOpp.id);
    if (!existing) {
      upsertWorkspace(buildWorkspaceFromOpportunity(communityId, activeOpp));
    }
  }

  return (
    <div className="space-y-5" aria-label="Global creator economy">
      <OpportunityMarketplace
        opportunities={opportunities}
        onOpenWorkspace={openWorkspace}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <AiMatchingEngine recommendations={matches} />
          <CampaignWorkspacePanel
            opportunity={activeOpp}
            workspace={workspace}
            onApprove={() => {
              ensureWorkspace();
              if (activeOpp) setApproval(activeOpp.id, "approved");
            }}
            onRequestChanges={() => {
              ensureWorkspace();
              if (activeOpp) setApproval(activeOpp.id, "changes_requested");
            }}
            onReleasePayout={() => {
              ensureWorkspace();
              if (activeOpp) releasePayout(activeOpp.id);
            }}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ReputationEngine reputation={reputation} />
          <CreatorProfileProCard profile={profile} />
        </div>
      </div>

      <AiCareerCoach tips={tips} />
      <GlobalDiscovery items={discovery} />
      <BrandCrmPanel communityId={communityId} overview={overviewWithName} />
    </div>
  );
}
