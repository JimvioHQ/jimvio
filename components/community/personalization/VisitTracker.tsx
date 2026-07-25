"use client";

import { useEffect } from "react";
import {
  usePersonalizationStore,
  type PersonalItemKind,
} from "@/lib/community/personalization";
import { useClientReady } from "@/lib/community/use-client-ready";

/**
 * Invisible visit + continue-learning tracker for Group/Channel pages.
 */
export function VisitTracker({
  id,
  kind,
  communityId,
  title,
  href,
  subtitle,
  continueLearning,
}: {
  id: string;
  kind: PersonalItemKind;
  communityId: string;
  title: string;
  href: string;
  subtitle?: string | null;
  continueLearning?: {
    kind: "course" | "resource" | "knowledge" | "guide";
    progress?: number;
  } | null;
}) {
  const ready = useClientReady();
  const trackVisit = usePersonalizationStore((s) => s.trackVisit);
  const markCommunitySeen = usePersonalizationStore((s) => s.markCommunitySeen);
  const setContinueLearning = usePersonalizationStore((s) => s.setContinueLearning);

  useEffect(() => {
    if (!ready || !id || !communityId || !href) return;
    trackVisit({
      id,
      kind,
      communityId,
      title,
      href,
      subtitle: subtitle ?? null,
    });
    markCommunitySeen(communityId);
    if (continueLearning) {
      setContinueLearning({
        id,
        kind: continueLearning.kind,
        communityId,
        title,
        href,
        progress: continueLearning.progress,
      });
    }

    const channelId = kind === "channel" ? id : null;
    void fetch("/api/c/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId,
        path: href,
        channelId,
      }),
    }).catch(() => {
      /* resume tracking is best-effort */
    });
  }, [
    ready,
    id,
    kind,
    communityId,
    title,
    href,
    subtitle,
    continueLearning?.kind,
    continueLearning?.progress,
    trackVisit,
    markCommunitySeen,
    setContinueLearning,
  ]);

  return null;
}
