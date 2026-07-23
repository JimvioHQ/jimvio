"use client";

import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  buildIntelligenceSnapshot,
  useIntelligenceStore,
  type AutomationSuggestion,
  type IntelligenceInput,
} from "@/lib/community/intelligence";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import { useLiveCollabStore } from "@/lib/community/live-collab";
import { useRoomMessageIndex } from "@/lib/community/chat/room-message-index";
import { IntelligenceDashboard } from "./IntelligenceDashboard";
import { toast } from "sonner";

type OverviewBits = {
  memberCount?: number | null;
  spacesCount?: number | null;
  courses?: { id: string }[] | null;
  liveNow?: number | null;
  healthScore?: { score: number } | null;
  totalCommunityXp?: number | null;
  featuredPosts?: { title: string | null; body: string }[] | null;
  challenges?: { title: string }[] | null;
};

function snapshotFingerprint(snapshot: {
  communityId: string;
  domains: unknown;
  recommendations: unknown;
  automations: unknown;
  analytics: unknown;
}) {
  return JSON.stringify({
    communityId: snapshot.communityId,
    domains: snapshot.domains,
    recommendations: snapshot.recommendations,
    automations: snapshot.automations,
    analytics: snapshot.analytics,
  });
}

/**
 * Hook-up component: builds snapshot from phase stores (no new APIs).
 */
export function CommunityIntelligenceHost({
  communityId,
  communityName,
  base,
  overview,
  roomId,
  compact,
}: {
  communityId: string;
  communityName?: string;
  base: string;
  overview?: OverviewBits | null;
  roomId?: string | null;
  compact?: boolean;
}) {
  const cards = useCollaborationStore(
    useShallow((s) => s.cards.filter((c) => c.communityId === communityId))
  );
  const tasks = useCreatorOSStore(
    useShallow((s) => s.tasks.filter((t) => t.communityId === communityId))
  );
  const events = useCreatorOSStore(
    useShallow((s) => s.events.filter((e) => e.communityId === communityId))
  );
  const commerceItems = useCreatorCommerceStore(
    useShallow((s) => s.itemsForCommunity(communityId))
  );
  const messages = useRoomMessageIndex(
    useShallow((s) => (roomId ? (s.byRoom[roomId]?.messages ?? []) : []))
  );
  const liveKnowledge = useLiveCollabStore((s) => {
    const entries = Object.values(s.knowledgeBySession);
    return entries[0] ?? null;
  });
  const liveQa = useLiveCollabStore(
    useShallow((s) => {
      const all = Object.values(s.qaBySession).flat();
      return all.slice(0, 20);
    })
  );
  const putSnapshot = useIntelligenceStore((s) => s.putSnapshot);
  const lastFingerprint = useRef<string>("");

  const input: IntelligenceInput = useMemo(
    () => ({
      communityId,
      base,
      communityName,
      memberCount: overview?.memberCount ?? undefined,
      spacesCount: overview?.spacesCount ?? undefined,
      coursesCount: overview?.courses?.length ?? 0,
      liveNow: overview?.liveNow ?? 0,
      healthScore: overview?.healthScore?.score,
      totalXp: overview?.totalCommunityXp ?? undefined,
      messages,
      knowledgeCards: cards,
      tasks,
      events,
      commerceItems,
      liveKnowledge,
      liveQa,
      featuredPosts: overview?.featuredPosts ?? undefined,
      challenges: overview?.challenges ?? undefined,
    }),
    // Depend on primitive overview fields so parent identity churn does not rebuild forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional primitive deps
    [
      communityId,
      base,
      communityName,
      overview?.memberCount,
      overview?.spacesCount,
      overview?.courses?.length,
      overview?.liveNow,
      overview?.healthScore?.score,
      overview?.totalCommunityXp,
      // Stabilize array deps by length + titles so parent remounts don't rebuild forever.
      overview?.featuredPosts?.length,
      overview?.featuredPosts?.map((p) => p.title ?? p.body).join("\0"),
      overview?.challenges?.length,
      overview?.challenges?.map((c) => c.title).join("\0"),
      messages,
      cards,
      tasks,
      events,
      commerceItems,
      liveKnowledge,
      liveQa,
    ]
  );

  const snapshot = useMemo(() => buildIntelligenceSnapshot(input), [input]);

  useEffect(() => {
    const fp = snapshotFingerprint(snapshot);
    if (fp === lastFingerprint.current) return;
    lastFingerprint.current = fp;
    // Fire-and-forget cache; display uses local `snapshot` prop only.
    putSnapshot(snapshot);
  }, [snapshot, putSnapshot]);

  function onAct(a: AutomationSuggestion) {
    toast.success(`Queued: ${a.title}`, {
      description: "Open Knowledge, Tasks, or Commerce to complete the action.",
    });
  }

  return (
    <IntelligenceDashboard
      snapshot={snapshot}
      onActAutomation={onAct}
      compact={compact}
    />
  );
}
