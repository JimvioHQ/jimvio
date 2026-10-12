"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UGCCampaign } from "@/types/ugc";
import {
  getBookmarkedIds,
  toggleBookmark as toggleBookmarkStorage,
  type CreatorProfileSnapshot,
} from "@/lib/ugc/campaign-detail";

export type CampaignDetailState =
  | { status: "loading" }
  | { status: "error"; kind: "not_found" | "offline" | "unauthorized" | "expired" | "private"; message: string }
  | {
      status: "ready";
      campaign: UGCCampaign;
      isJoined: boolean;
      isPending: boolean;
      participantStatus: string | null;
      submissionStatus: string | null;
      isBookmarked: boolean;
      profile: CreatorProfileSnapshot | null;
      similar: UGCCampaign[];
    };

export function useCampaignDetail(campaignId: string) {
  const [state, setState] = useState<CampaignDetailState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const toggleBookmark = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const saved = toggleBookmarkStorage(prev.campaign.id);
      const campaignId = prev.campaign.id;
      void (async () => {
        try {
          if (saved) {
            await fetch("/api/ugc/saves", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaign_id: campaignId }),
            });
          } else {
            await fetch(`/api/ugc/saves?campaign_id=${encodeURIComponent(campaignId)}`, {
              method: "DELETE",
            });
          }
        } catch {
          /* localStorage remains cache */
        }
      })();
      return { ...prev, isBookmarked: saved };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });

      try {
        const [cRes, pRes, similarRes] = await Promise.all([
          fetch(`/api/ugc/campaigns/${campaignId}`, { cache: "no-store" }),
          fetch(`/api/ugc/campaigns/${campaignId}/participant`, { cache: "no-store" }),
          fetch(`/api/ugc/campaigns?status=active&limit=24`, { cache: "no-store" }),
        ]);

        if (!cRes.ok) {
          if (cRes.status === 404) {
            setState({ status: "error", kind: "not_found", message: "This campaign may have ended or been removed." });
            return;
          }
          if (cRes.status === 401) {
            setState({ status: "error", kind: "unauthorized", message: "Sign in to view this campaign." });
            return;
          }
          setState({ status: "error", kind: "offline", message: "Unable to load campaign. Check your connection." });
          return;
        }

        const { campaign } = (await cRes.json()) as { campaign: UGCCampaign };

        if (campaign.status === "draft") {
          setState({ status: "error", kind: "private", message: "This campaign is not publicly available yet." });
          return;
        }

        if (campaign.status === "completed" || campaign.status === "cancelled") {
          const ended =
            campaign.ends_at && new Date(campaign.ends_at).getTime() < Date.now();
          if (ended && campaign.status === "completed") {
            // still show completed campaigns for reference
          }
        }

        let isJoined = false;
        let isPending = false;
        let participantStatus: string | null = null;
        let submissionStatus: string | null = null;
        if (pRes.ok) {
          const pJson = await pRes.json();
          const status = pJson.status as string | null;
          participantStatus = status;
          isJoined = status === "accepted";
          isPending = status === "pending" || status === "waitlisted";
        }

        if (isJoined) {
          const subRes = await fetch(`/api/ugc/submissions?campaignId=${encodeURIComponent(campaignId)}&limit=10`, {
            cache: "no-store",
          });
          if (subRes.ok) {
            const subJson = (await subRes.json()) as { data?: { status?: string; created_at?: string }[] };
            const rows = subJson.data ?? [];
            const latest = [...rows].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0];
            submissionStatus = latest?.status ?? null;
          }
        }

        let similar: UGCCampaign[] = [];
        if (similarRes.ok) {
          const json = (await similarRes.json()) as { data?: UGCCampaign[] };
          const { pickSimilarCampaigns } = await import("@/lib/ugc/campaign-detail");
          similar = pickSimilarCampaigns(campaign, json.data ?? []);
        }

        let profile: CreatorProfileSnapshot | null = null;
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const [{ data: inf }, { data: profileRow }] = await Promise.all([
              supabase
                .from("influencers")
                .select("id, total_followers, social_platforms, niche, created_at, is_verified")
                .eq("user_id", user.id)
                .maybeSingle(),
              supabase.from("profiles").select("country").eq("id", user.id).maybeSingle(),
            ]);
            const country = profileRow?.country ?? null;

            if (inf) {
              const platformsRaw = inf.social_platforms;
              const platforms: string[] = Array.isArray(platformsRaw)
                ? platformsRaw.map((p) => String(p).toLowerCase())
                : typeof platformsRaw === "object" && platformsRaw
                  ? Object.keys(platformsRaw as object)
                  : [];

              const ageDays = inf.created_at
                ? Math.floor((Date.now() - new Date(inf.created_at).getTime()) / 86400000)
                : null;

              profile = {
                hasProfile: true,
                totalFollowers: inf.total_followers,
                platforms,
                niche: (inf.niche as string[]) ?? [],
                accountAgeDays: ageDays,
                isVerified: Boolean(inf.is_verified),
                country,
              };
            } else {
              profile = {
                hasProfile: false,
                totalFollowers: null,
                platforms: [],
                niche: [],
                accountAgeDays: null,
                isVerified: false,
                country,
              };
            }
          }
        } catch {
          profile = null;
        }

        if (cancelled) return;

        setState({
          status: "ready",
          campaign,
          isJoined,
          isPending,
          participantStatus,
          submissionStatus,
          isBookmarked: getBookmarkedIds().has(campaign.id),
          profile,
          similar,
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            kind: "offline",
            message: "Network error. Please try again.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, retryKey]);

  return { state, retry, toggleBookmark };
}
