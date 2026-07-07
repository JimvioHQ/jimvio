"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  totalProducts: number;
  ready: number;
  published: number;
  pendingEnrichment: number;
  requirementsMissing: number;
  adminOverride: number;
  missingVideo: number;
  missingSupplier: number;
  missingShipping: number;
  missingImages: number;
  missingDescription: number;
  missingVariants: number;
  missingStock: number;
  trendingMissing: number;
  avgPublishScore: number;
  avgEnrichmentTimeMs: number | null;
  snapshotAt: string;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "green" | "amber" | "sky" | "violet";
}) {
  const accentClass =
    accent === "green"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : accent === "sky"
          ? "text-sky-600"
          : accent === "violet"
            ? "text-violet-600"
            : "text-[#111827]";

  return (
    <div className="rounded-[10px] border border-[#E5E7EB] bg-white px-2.5 py-2">
      <p className="text-[9px] font-medium text-[#9CA3AF]">{label}</p>
      <p className={cn("text-[15px] font-bold tabular-nums", accentClass)}>{value}</p>
    </div>
  );
}

export function AutoPublishAnalyticsDashboard({ className }: { className?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cj/auto-publish/analytics${refresh ? "?refresh=1" : ""}`
      );
      const json = await res.json();
      if (json.success) setData(json.analytics);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className={cn("flex items-center gap-2 rounded-[12px] border border-[#E5E7EB] bg-white p-3", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-[#9CA3AF]" />
        <span className="text-[11px] text-[#6B7280]">Loading Auto Publish analytics…</span>
      </div>
    );
  }

  if (!data) return null;

  const avgEnrichmentSec =
    data.avgEnrichmentTimeMs != null
      ? `${Math.round(data.avgEnrichmentTimeMs / 1000)}s`
      : "—";

  return (
    <div className={cn("rounded-[14px] border border-[#E5E7EB] bg-white", className)}>
      <div className="flex items-center justify-between border-b border-[#F3F4F6] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-[#FF5A1F]" />
          <h3 className="text-[12px] font-semibold text-[#111827]">Auto Publish Analytics</h3>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1 rounded-[8px] border border-[#E5E7EB] px-2 text-[10px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total Products" value={data.totalProducts} />
        <StatCard label="Ready" value={data.ready} accent="green" />
        <StatCard label="Published" value={data.published} accent="green" />
        <StatCard label="Pending Enrichment" value={data.pendingEnrichment} accent="sky" />
        <StatCard label="Requirements Missing" value={data.requirementsMissing} accent="amber" />
        <StatCard label="Admin Override" value={data.adminOverride} accent="violet" />
        <StatCard label="Missing Video" value={data.missingVideo} />
        <StatCard label="Missing Supplier" value={data.missingSupplier} />
        <StatCard label="Missing Shipping" value={data.missingShipping} />
        <StatCard label="Missing Images" value={data.missingImages} />
        <StatCard label="Missing Description" value={data.missingDescription} />
        <StatCard label="Missing Variants" value={data.missingVariants} />
        <StatCard label="Missing Stock" value={data.missingStock} />
        <StatCard label="Trending Missing" value={data.trendingMissing} />
        <StatCard label="Avg Publish Score" value={`${data.avgPublishScore}`} />
        <StatCard label="Avg Enrichment Time" value={avgEnrichmentSec} />
      </div>
    </div>
  );
}
