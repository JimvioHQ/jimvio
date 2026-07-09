"use client";

import { useCallback, useEffect, useState } from "react";
import type { UGCCampaign, UGCSubmission } from "@/types/ugc";
import type { ParticipantInfo } from "@/lib/ugc/active-project";
import { getProjectFlags } from "@/lib/ugc/project-storage";

export type ActiveProjectState =
  | { status: "loading" }
  | { status: "error"; kind: "not_found" | "forbidden" | "pending" | "offline"; message: string }
  | {
      status: "ready";
      campaign: UGCCampaign;
      submissions: UGCSubmission[];
      participant: ParticipantInfo;
      canAccessResources: boolean;
      flags: { briefRead: boolean; assetsDownloaded: boolean };
    };

export function useActiveProject(campaignId: string) {
  const [state, setState] = useState<ActiveProjectState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const refresh = useCallback(async () => {
    const [cRes, sRes, pRes] = await Promise.all([
      fetch(`/api/ugc/campaigns/${campaignId}`, { cache: "no-store" }),
      fetch(`/api/ugc/submissions?campaignId=${campaignId}`, { cache: "no-store" }),
      fetch(`/api/ugc/campaigns/${campaignId}/participant`, { cache: "no-store" }),
    ]);

    if (!cRes.ok) {
      return {
        status: "error" as const,
        kind: cRes.status === 404 ? ("not_found" as const) : ("offline" as const),
        message: "Could not load project.",
      };
    }

    const { campaign } = (await cRes.json()) as { campaign: UGCCampaign };
    const pJson = pRes.ok ? await pRes.json() : { status: null, canAccessResources: false, participant: null };

    if (pJson.status !== "accepted") {
      if (pJson.status === "pending" || pJson.status === "waitlisted") {
        return {
          status: "error" as const,
          kind: "pending" as const,
          message: "Your application is still under review.",
        };
      }
      return {
        status: "error" as const,
        kind: "forbidden" as const,
        message: "You need approved access to open this project.",
      };
    }

    const submissions = sRes.ok ? ((await sRes.json()).data as UGCSubmission[]) ?? [] : [];
    const participant: ParticipantInfo = {
      status: pJson.status,
      joined_at: pJson.participant?.joined_at,
      eligibility_score: pJson.participant?.eligibility_score,
    };

    return {
      status: "ready" as const,
      campaign,
      submissions,
      participant,
      canAccessResources: Boolean(pJson.canAccessResources ?? true),
      flags: getProjectFlags(campaignId),
    };
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void refresh()
      .then((next) => {
        if (!cancelled && next) setState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", kind: "offline", message: "Network error. Please retry." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, retryKey, refresh]);

  const reload = useCallback(() => {
    void refresh().then((next) => {
      if (next) setState(next);
    });
  }, [refresh]);

  return { state, retry, reload };
}
