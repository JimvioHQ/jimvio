"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Play } from "lucide-react";
import type { UGCCampaign } from "@/types/ugc";
import { buildResources } from "@/lib/ugc/campaign-detail";
import { Button } from "@/components/ui/button";
import {
  UGCFilterBar,
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

export function UGCClippingHubPage() {
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/ugc/campaigns?type=clipping&limit=50", { cache: "no-store" }),
        fetch("/api/ugc/participants?status=accepted", { cache: "no-store" }),
      ]);
      if (!cRes.ok) throw new Error("campaigns failed");
      const cJson = await cRes.json();
      setCampaigns(cJson.data ?? []);
      if (pRes.ok) {
        const pJson = await pRes.json();
        const ids = new Set(
          (pJson.data ?? [])
            .map((p: { campaign?: { id?: string } }) => p.campaign?.id)
            .filter(Boolean) as string[],
        );
        setJoinedIds(ids);
      }
    } catch {
      setError("Could not load clipping hub.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resources = useMemo(() => {
    const joined = campaigns.filter((c) => joinedIds.has(c.id));
    return joined.flatMap((c) =>
      buildResources(c).map((r) => ({ ...r, campaignId: c.id, campaignTitle: c.title })),
    );
  }, [campaigns, joinedIds]);

  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.vendor?.business_name?.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  const filteredResources = useMemo(() => {
    if (!search.trim()) return resources;
    const q = search.toLowerCase();
    return resources.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.campaignTitle.toLowerCase().includes(q),
    );
  }, [resources, search]);

  return (
    <UGCPageShell
      titleKey="clippingHub"
      subtitleKey="clippingSubtitle"
    >
      <UGCFilterBar search={search} onSearchChange={setSearch} />

      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <div className="space-y-5">
          <section>
            <h2 className="mb-3 text-[14px] font-bold text-[#111827]">Clipping campaigns</h2>
            {filteredCampaigns.length === 0 ? (
              <UGCPageEmpty
                title="No clipping campaigns"
                description="Check back soon for new clipping opportunities."
                action={
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/ugc">Browse all campaigns</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-[16px] border border-[#EEF0F2] bg-white p-4"
                  >
                    <p className="text-[11px] font-semibold uppercase text-[#9CA3AF]">
                      {c.vendor?.business_name}
                    </p>
                    <h3 className="text-[15px] font-bold text-[#111827]">{c.title}</h3>
                    <div className="mt-3 flex gap-2">
                      <Button asChild size="sm" className="rounded-xl bg-[#FF5A1F]">
                        <Link href={joinedIds.has(c.id) ? `/ugc/${c.id}/` : `/ugc/${c.id}`}>
                          {joinedIds.has(c.id) ? "Open project" : "View campaign"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[14px] font-bold text-[#111827]">
              Your resource library
            </h2>
            {filteredResources.length === 0 ? (
              <p className="text-[13px] text-[#6B7280]">
                Join a clipping campaign to unlock downloadable assets.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredResources.map((r) => (
                  <div
                    key={`${r.campaignId}-${r.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[#EEF0F2] bg-white p-3"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#FFF4EF]">
                      {r.type === "video" ? (
                        <Play className="h-4 w-4 text-[#FF5A1F]" />
                      ) : (
                        <Download className="h-4 w-4 text-[#FF5A1F]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{r.label}</p>
                      <p className="text-[11px] text-[#6B7280]">{r.campaignTitle}</p>
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-[#111827] px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
