"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Search, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UGCPageEmpty, UGCPageError, UGCPageLoading, UGCPageShell } from "@/components/ugc/workspace/UGCPageShell";
import { Pill, SectionCard } from "@/components/ugc/campaign-detail/campaign-detail-ui";
import { cn } from "@/lib/utils";
import { useUgcBrandWorkspace } from "@/components/ugc/workspace/UgcBrandWorkspaceProvider";

type CreatorRow = {
  influencerId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  country: string | null;
  language: string | null;
  totalFollowers: number;
  engagementRate: number;
  avgViews: number | null;
  approvalRate: number | null;
  niche: string[];
  platforms: string[];
  totalCampaigns: number;
  pastCampaignTitles: string[];
};

type CampaignRow = {
  id: string;
  title: string;
  status: string;
};

type ParticipantRow = {
  id: string;
  influencer_id: string;
  status: string;
};

type InviteMap = Map<string, ParticipantRow>;

const PLATFORM_OPTIONS = [
  { value: "", label: "Any platform" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
];

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/g).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function CreatorRecruitmentClient() {
  const { ugcFetch } = useUgcBrandWorkspace();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [platform, setPlatform] = useState("");
  const [minFollowers, setMinFollowers] = useState<number | null>(null);
  const [maxFollowers, setMaxFollowers] = useState<number | null>(null);
  const [minEngagement, setMinEngagement] = useState<number | null>(null);
  const [niche, setNiche] = useState("");
  const [verified, setVerified] = useState(false);
  const [minCompletedCampaigns, setMinCompletedCampaigns] = useState<number | null>(null);

  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteMap, setInviteMap] = useState<InviteMap>(new Map());

  const debounceRef = useRef<number | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    setError(null);
    try {
      const res = await ugcFetch("/api/ugc/campaigns?status=all&limit=50&mine=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load campaigns");
      const json = await res.json();
      const list = (json.data ?? []) as CampaignRow[];
      const filtered = list.filter((c) => c.status === "active" || c.status === "draft" || c.status === "paused");
      setCampaigns(filtered);
      setCampaignId(filtered[0]?.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  }, [ugcFetch]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const loadInviteMap = useCallback(async () => {
    if (!campaignId) {
      setInviteMap(new Map());
      return;
    }
    try {
      const res = await ugcFetch(`/api/ugc/campaigns/${campaignId}/participants`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load campaign participants");
      const json = await res.json();
      const rows = (json.data ?? json ?? []) as any[];
      const map = new Map<string, ParticipantRow>();
      for (const row of rows) {
        const influencerId = String(row.influencer_id ?? row.influencer?.id ?? "");
        if (!influencerId) continue;
        map.set(influencerId, {
          id: String(row.id),
          influencer_id: influencerId,
          status: String(row.status ?? ""),
        });
      }
      setInviteMap(map);
    } catch {
      setInviteMap(new Map());
    }
  }, [campaignId, ugcFetch]);

  useEffect(() => {
    void loadInviteMap();
  }, [loadInviteMap]);

  const runSearch = useCallback(async () => {
    setLoadingCreators(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (country.trim()) sp.set("country", country.trim());
      if (language.trim()) sp.set("language", language.trim());
      if (platform.trim()) sp.set("platform", platform.trim());
      if (verified) sp.set("verified", "true");
      if (minFollowers != null) sp.set("minFollowers", String(minFollowers));
      if (maxFollowers != null) sp.set("maxFollowers", String(maxFollowers));
      if (minEngagement != null) sp.set("minEngagement", String(minEngagement));
      if (niche.trim()) sp.set("niche", niche.trim());
      if (minCompletedCampaigns != null) sp.set("minCompletedCampaigns", String(minCompletedCampaigns));

      const res = await ugcFetch(`/api/ugc/brand/creators/search?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setCreators((json.data ?? []) as CreatorRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creator search failed");
    } finally {
      setLoadingCreators(false);
    }
  }, [country, language, maxFollowers, minCompletedCampaigns, minEngagement, minFollowers, niche, platform, q, verified, ugcFetch]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch();
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [runSearch]);

  const inviteCampaign = useCallback(
    async (creator: CreatorRow) => {
      if (!campaignId) return;
      const participant = inviteMap.get(creator.influencerId);
      if (!participant) return;
      try {
        const res = await ugcFetch(`/api/ugc/campaigns/${campaignId}/participants`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: participant.id, action: "invite" }),
        });
        if (!res.ok) throw new Error("Invite failed");
        await loadInviteMap();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invite failed");
      }
    },
    [campaignId, inviteMap, loadInviteMap, ugcFetch],
  );

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId],
  );

  return (
    <UGCPageShell
      titleKey="creatorRecruitment"
      subtitleKey="recruitmentSubtitle"
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link href="/ugc/campaign-center/create">Create Campaign</Link>
        </Button>
      }
    >
      {loadingCampaigns ? <UGCPageLoading /> : null}
      {!loadingCampaigns && error ? <UGCPageError message={error} onRetry={() => void runSearch()} /> : null}

      {!loadingCampaigns && !error && campaigns.length === 0 ? (
        <UGCPageEmpty
          title="No campaigns available"
          description="Create and fund a campaign to start inviting creators."
          illustration="campaigns"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
              <Link href="/ugc/campaign-center/create">Create Campaign</Link>
            </Button>
          }
        />
      ) : null}

      {!loadingCampaigns && !error && selectedCampaign ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                    Target Campaign
                  </p>
                  <h2 className="mt-1 text-[18px] font-bold text-[#111827]">{selectedCampaign.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCampaign.status === "active" ? (
                    <Pill tone="success">Active</Pill>
                  ) : selectedCampaign.status === "draft" ? (
                    <Pill tone="warning">Draft</Pill>
                  ) : (
                    <Pill tone="info">{selectedCampaign.status}</Pill>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <label className="text-[12px] font-semibold text-[#374151]">
                  Choose campaign
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-[12px] leading-relaxed text-[#6B7280]">
                  Invite buttons are enabled for creators who already have a participation record for this campaign.
                </p>
              </div>
            </SectionCard>

            <SectionCard>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                Creator Filters
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search creators by name…"
                      className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Country
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. RW"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[#374151]">
                  Language
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. en"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  />
                </label>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Platform
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Niche
                  <input
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. beauty"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  />
                </label>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Min followers
                  <input
                    value={minFollowers ?? ""}
                    onChange={(e) => setMinFollowers(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                    inputMode="numeric"
                  />
                </label>
                <label className="text-[12px] font-semibold text-[#374151]">
                  Max followers
                  <input
                    value={maxFollowers ?? ""}
                    onChange={(e) => setMaxFollowers(e.target.value ? Number(e.target.value) : null)}
                    placeholder="—"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                    inputMode="numeric"
                  />
                </label>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Min engagement rate (%)
                  <input
                    value={minEngagement ?? ""}
                    onChange={(e) => setMinEngagement(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                    inputMode="decimal"
                  />
                </label>

                <label className="text-[12px] font-semibold text-[#374151]">
                  Completed campaigns (min)
                  <input
                    value={minCompletedCampaigns ?? ""}
                    onChange={(e) => setMinCompletedCampaigns(e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    className="mt-2 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm"
                    inputMode="numeric"
                  />
                </label>

                <label className="flex items-center gap-2 text-[12px] font-semibold text-[#374151]">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E5E7EB]"
                  />
                  Verified only
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone="brand">Performance-based ranking</Pill>
                <Pill tone="neutral">Up to 30 creators per search</Pill>
              </div>
            </SectionCard>
          </div>

          <SectionCard className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#FF5A1F]">
                  Results
                </p>
                <h2 className="mt-1 text-[18px] font-bold text-[#111827]">
                  {loadingCreators ? "Searching…" : `${creators.length} creators`}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                <Sparkles className="h-4 w-4 text-[#FF5A1F]" />
                Invite qualified creators to <span className="font-semibold text-[#111827]">{selectedCampaign.title}</span>
              </div>
            </div>

            {loadingCreators ? (
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-2xl bg-[#F3F4F6]" />
                ))}
              </div>
            ) : creators.length === 0 ? (
              <UGCPageEmpty
                title="No creators found"
                description="Try adjusting filters or expanding your search."
                illustration="default"
              />
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {creators.map((c) => {
                  const participant = inviteMap.get(c.influencerId) ?? null;
                  const inviteable = participant && !["accepted", "invited"].includes(participant.status);
                  return (
                    <div key={c.influencerId} className="rounded-2xl border border-[#EEF0F2] bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#FFF4EF] text-[#FF5A1F] font-bold">
                            {c.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>{initialsFromName(c.displayName)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold text-[#111827]">{c.displayName}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              <span className="text-[11px] font-semibold text-[#6B7280]">
                                {formatFollowers(c.totalFollowers)} followers
                              </span>
                              {c.isVerified ? (
                                <Pill tone="success">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Verified
                                </Pill>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                              Avg views
                            </p>
                            <p className="mt-1 text-[13px] font-bold text-[#111827]">
                              {c.avgViews != null ? c.avgViews.toLocaleString() : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                              Approval rate
                            </p>
                            <p className="mt-1 text-[13px] font-bold text-[#111827]">
                              {c.approvalRate != null ? `${c.approvalRate}%` : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#EEF0F2] bg-[#FAFAFA] p-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                            Engagement
                          </p>
                          <p className="mt-1 text-[13px] font-bold text-[#111827]">
                            {c.engagementRate ? `${c.engagementRate}%` : "—"}{" "}
                            <span className="text-[11px] text-[#6B7280]">rate</span>
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                            Past campaigns
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {(c.pastCampaignTitles ?? []).length === 0 ? (
                              <span className="text-[12px] text-[#6B7280]">No history</span>
                            ) : (
                              c.pastCampaignTitles.slice(0, 3).map((t) => (
                                <span key={t} className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#4B5563]">
                                  {t.length > 18 ? `${t.slice(0, 18)}…` : t}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          className={cn(
                            "h-10 flex-1 rounded-xl text-[12px] font-bold",
                            inviteable ? "bg-[#FF5A1F] text-white" : "bg-[#F3F4F6] text-[#9CA3AF] hover:bg-[#F3F4F6]",
                          )}
                          disabled={!inviteable}
                          onClick={() => void inviteCampaign(c)}
                        >
                          {inviteable ? "Invite creator" : participant ? "Invited/Approved" : "Not applied"}
                        </Button>
                        <Link
                          href={c.username ? `/influencers/${c.username}` : `/influencers/${c.influencerId}`}
                          className="h-10 w-10 rounded-xl border border-[#E5E7EB] bg-white text-[#374151] grid place-items-center hover:bg-[#F9FAFB]"
                          aria-label="View creator"
                        >
                          <Users className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}
    </UGCPageShell>
  );
}

