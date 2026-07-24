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
