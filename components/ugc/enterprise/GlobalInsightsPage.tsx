"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import { EnterpriseOutlineButton, MetricCard, cardClass } from "./enterprise-ui";

type InsightsPayload = {
  topCountries?: Array<{ country?: string; name?: string; count?: number }>;
  campaignTypes?: Array<{ type?: string; campaign_type?: string; count?: number }>;
  topCreatorsByEarnings?: Array<{
    display_name?: string;
    name?: string;
    username?: string;
    total_earnings?: number;
  }>;
  topBrandsBySpend?: Array<{ business_name?: string; name?: string; spend?: number }>;
  trendingCampaigns?: Array<{ id?: string; title?: string; views?: number; total_views_tracked?: number }>;
};

export function GlobalInsightsPage() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/insights", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load insights");
      setData(json as InsightsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <UGCPageShell
      title="Insights"
      subtitle="Platform-wide campaign, creator, and brand performance signals."
      actions={
        <EnterpriseOutlineButton onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </EnterpriseOutlineButton>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}

      {!loading && !error && data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Top countries" value={(data.topCountries ?? []).length} />
            <MetricCard label="Campaign types" value={(data.campaignTypes ?? []).length} />
            <MetricCard label="Trending" value={(data.trendingCampaigns ?? []).length} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightList
              title="Top countries"
              empty="No country data yet."
              rows={(data.topCountries ?? []).map((r) => ({
                label: r.country || r.name || "Unknown",
                value: String(r.count ?? 0),
              }))}
            />
            <InsightList
              title="Campaign types"
              empty="No type breakdown yet."
              rows={(data.campaignTypes ?? []).map((r) => ({
                label: r.type || r.campaign_type || "unknown",
                value: String(r.count ?? 0),
              }))}
            />
            <InsightList
              title="Top creators"
              empty="No creator earnings yet."
              rows={(data.topCreatorsByEarnings ?? []).map((r) => ({
                label: r.display_name || r.name || r.username || "Creator",
                value: Number(r.total_earnings ?? 0).toLocaleString(),
              }))}
            />
            <InsightList
              title="Top brands"
              empty="No brand spend yet."
              rows={(data.topBrandsBySpend ?? []).map((r) => ({
                label: r.business_name || r.name || "Brand",
                value: Number(r.spend ?? 0).toLocaleString(),
              }))}
            />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold text-[#111827]">Trending campaigns</h2>
            {(data.trendingCampaigns ?? []).length === 0 ? (
              <UGCPageEmpty title="No trending campaigns" description="Active campaigns with views will surface here." />
            ) : (
              <div className="space-y-2">
                {(data.trendingCampaigns ?? []).map((c, i) => (
                  <div key={c.id ?? i} className={`${cardClass} flex items-center justify-between`}>
                    <p className="text-sm font-semibold text-[#111827]">{c.title || c.id}</p>
                    <p className="text-sm font-bold text-[#FF5A1F]">
                      {Number(c.views ?? c.total_views_tracked ?? 0).toLocaleString()} views
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}

function InsightList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-[#111827]">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[#6B7280]">{empty}</p>
      ) : (
        rows.slice(0, 8).map((r) => (
          <div key={`${r.label}-${r.value}`} className={`${cardClass} flex items-center justify-between`}>
            <p className="text-sm text-[#374151]">{r.label}</p>
            <p className="text-sm font-bold text-[#111827]">{r.value}</p>
          </div>
        ))
      )}
    </div>
  );
}
