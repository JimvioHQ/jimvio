"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import {
  deriveHostSeats,
  deriveLiveAiAssist,
  deriveLiveAnalytics,
  deriveLiveClips,
  deriveLiveCommunity,
  deriveLiveCourse,
  derivePinnedOffers,
  getLiveMediaProvider,
  useLiveNetworkStore,
  type LiveClipDraft,
  type LiveNetworkContext,
} from "@/lib/community/live-network";
import { LiveStudioDashboard } from "./LiveStudioDashboard";
import { MultiHostStage } from "./MultiHostStage";
import { LiveCommerceNetworkPanel } from "./LiveCommerceNetworkPanel";
import { LiveCommunityPanel } from "./LiveCommunityPanel";
import { LiveCoursesPanel } from "./LiveCoursesPanel";
import { LiveAnalyticsPanel } from "./LiveAnalyticsPanel";
import { AiLiveAssistant } from "./AiLiveAssistant";
import { LiveClippingPanel } from "./LiveClippingPanel";

/**
 * Live Commerce Network shell — additive to Creator OS / hub live studio.
 * Reuses commerce store + LiveKit provider registry; does not replace hub-live.
 */
export function LiveCommerceNetworkShell({
  base,
  communityId,
  communityName,
  overview,
}: {
  base: string;
  communityId: string;
  communityName?: string;
  overview?: LiveNetworkContext["overview"];
}) {
  const clientReady = useClientReady();
  const ensureControls = useLiveNetworkStore((s) => s.ensureControls);
  const patchControls = useLiveNetworkStore((s) => s.patchControls);
  const setLayout = useLiveNetworkStore((s) => s.setLayout);
  const tickLive = useLiveNetworkStore((s) => s.tickLive);
  const addStageRequest = useLiveNetworkStore((s) => s.addStageRequest);
  const clearStageRequest = useLiveNetworkStore((s) => s.clearStageRequest);

  const controlsRaw = useLiveNetworkStore(
    (s) => s.controlsByCommunity[communityId]
  );
  const requestsRaw = useLiveNetworkStore(
    useShallow((s) => s.stageRequests[communityId] ?? [])
  );

  const storeItemsRaw = useCreatorCommerceStore(
    useShallow((s) => s.itemsForCommunity(communityId))
  );
  const affiliateRaw = useCreatorCommerceStore(
    useShallow((s) => s.affiliateStats)
  );

  const storeItems = clientReady ? storeItemsRaw : [];
  const affiliateStats = clientReady ? affiliateRaw : [];
  const requests = clientReady ? requestsRaw : [];
  const controls =
    (clientReady ? controlsRaw : undefined) ??
    getLiveMediaProvider().getStudioDefaults();

  const [offerPins, setOfferPins] = useState<Record<string, boolean>>({});
  const [clips, setClips] = useState<LiveClipDraft[]>([]);

  const ctx = useMemo<LiveNetworkContext>(
    () => ({
      base,
      communityId,
      communityName,
      overview: overview ?? null,
    }),
    [base, communityId, communityName, overview]
  );

  useEffect(() => {
    if (!clientReady) return;
    ensureControls(communityId);
  }, [clientReady, communityId, ensureControls]);

  useEffect(() => {
    if (!clientReady) return;
    const id = window.setInterval(() => tickLive(communityId), 1000);
    return () => window.clearInterval(id);
  }, [clientReady, communityId, tickLive]);

  useEffect(() => {
    setClips(deriveLiveClips(ctx));
  }, [ctx]);

  const seats = useMemo(() => deriveHostSeats(ctx), [ctx]);
  const community = useMemo(() => deriveLiveCommunity(ctx), [ctx]);
  const course = useMemo(() => deriveLiveCourse(ctx), [ctx]);
  const analytics = useMemo(() => deriveLiveAnalytics(ctx), [ctx]);
  const ai = useMemo(() => deriveLiveAiAssist(ctx), [ctx]);

  const offers = useMemo(() => {
    const baseOffers = derivePinnedOffers({
      base,
      storeItems,
      affiliateStats,
    });
    return baseOffers.map((o) => ({
      ...o,
      pinned: offerPins[o.id] ?? o.pinned,
    }));
  }, [affiliateStats, base, offerPins, storeItems]);

  function togglePin(id: string) {
    setOfferPins((prev) => {
      const current = offers.find((o) => o.id === id);
      return { ...prev, [id]: !(prev[id] ?? current?.pinned ?? false) };
    });
  }

  function publishClip(id: string) {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "ready" } : c))
    );
  }

  return (
    <div className="space-y-5" aria-label="Live commerce network">
      <LiveStudioDashboard
        base={base}
        controls={controls}
        onPatch={(patch) => patchControls(communityId, patch)}
        onLayout={(layout) => setLayout(communityId, layout)}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <MultiHostStage
            seats={seats}
            requests={requests}
            onInvite={(name) => addStageRequest(communityId, name)}
            onClearRequest={(name) => clearStageRequest(communityId, name)}
          />
          <LiveCommerceNetworkPanel offers={offers} onTogglePin={togglePin} />
          <AiLiveAssistant items={ai} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <LiveAnalyticsPanel analytics={analytics} />
          <LiveCommunityPanel signal={community} />
          <LiveCoursesPanel course={course} />
        </div>
      </div>

      <LiveClippingPanel clips={clips} onPublish={publishClip} />
    </div>
  );
}
