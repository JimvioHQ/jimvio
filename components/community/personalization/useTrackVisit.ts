"use client";

import { useEffect } from "react";
import {
  usePersonalizationStore,
  type PersonalItemKind,
} from "@/lib/community/personalization";
import { useClientReady } from "@/lib/community/use-client-ready";

/**
 * Record a workspace visit once per mount — feeds Continue / Recommendations.
 */
export function useTrackVisit(opts: {
  id: string;
  kind: PersonalItemKind;
  communityId: string;
  title: string;
  href: string;
  subtitle?: string | null;
  enabled?: boolean;
}) {
  const ready = useClientReady();
  const trackVisit = usePersonalizationStore((s) => s.trackVisit);
  const markCommunitySeen = usePersonalizationStore((s) => s.markCommunitySeen);

  useEffect(() => {
    if (!ready || opts.enabled === false) return;
    if (!opts.id || !opts.communityId || !opts.href) return;
    trackVisit({
      id: opts.id,
      kind: opts.kind,
      communityId: opts.communityId,
      title: opts.title,
      href: opts.href,
      subtitle: opts.subtitle ?? null,
    });
    markCommunitySeen(opts.communityId);
  }, [
    ready,
    opts.enabled,
    opts.id,
    opts.kind,
    opts.communityId,
    opts.title,
    opts.href,
    opts.subtitle,
    trackVisit,
    markCommunitySeen,
  ]);
}
