"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntelligenceFilters } from "@/lib/cj/import-intelligence/types";
import { DEFAULT_INTELLIGENCE_FILTERS } from "@/lib/cj/import-intelligence/filters";

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

export type AnalyticsFilterKey =
  | "ready"
  | "published"
  | "pendingEnrichment"
  | "requirementsMissing"
  | "adminOverride"
  | "missingVideo"
  | "missingSupplier"
  | "missingShipping"
  | "missingImages"
  | "missingDescription"
  | "missingVariants"
  | "missingStock"
  | "trendingMissing"
  | "draft"
  | "hidden"
  | "queue"
  | "processing"
  | "failed";

interface PipelineMetrics {
  draft: number;
  hidden: number;
  queuePending: number;
  queueProcessing: number;
  queueFailed: number;
  signalWatchPending: number;
}

const FILTER_MAP: Record<
  AnalyticsFilterKey,
  Partial<IntelligenceFilters>
> = {
  ready: { ...DEFAULT_INTELLIGENCE_FILTERS, autoPublishReady: true },
  published: { ...DEFAULT_INTELLIGENCE_FILTERS, isPublished: true },
  pendingEnrichment: { ...DEFAULT_INTELLIGENCE_FILTERS, autoPublishPending: true },
  requirementsMissing: {
    ...DEFAULT_INTELLIGENCE_FILTERS,
    autoPublishRequirementsMissing: true,
  },
  adminOverride: { ...DEFAULT_INTELLIGENCE_FILTERS, autoPublishAdminOverride: true },
  missingVideo: { ...DEFAULT_INTELLIGENCE_FILTERS, missingVideo: true },
  missingSupplier: { ...DEFAULT_INTELLIGENCE_FILTERS, missingSupplier: true },
  missingShipping: { ...DEFAULT_INTELLIGENCE_FILTERS, missingShipping: true },
  missingImages: { ...DEFAULT_INTELLIGENCE_FILTERS, missingImages: true },
  missingDescription: { ...DEFAULT_INTELLIGENCE_FILTERS, missingDescription: true },
  missingVariants: { ...DEFAULT_INTELLIGENCE_FILTERS, missingVariants: true },
  missingStock: { ...DEFAULT_INTELLIGENCE_FILTERS, missingStock: true },
  trendingMissing: { ...DEFAULT_INTELLIGENCE_FILTERS, missingTrending: true },
  draft: { ...DEFAULT_INTELLIGENCE_FILTERS, isDraft: true },
  hidden: { ...DEFAULT_INTELLIGENCE_FILTERS, isHidden: true },
  queue: { ...DEFAULT_INTELLIGENCE_FILTERS, publishQueueStatus: "pending" },
  processing: { ...DEFAULT_INTELLIGENCE_FILTERS, publishQueueStatus: "processing" },
  failed: { ...DEFAULT_INTELLIGENCE_FILTERS, publishQueueStatus: "failed" },
};

function StatCard({
  label,
  value,
  accent,
  filterKey,
  onApplyFilter,
}: {
  label: string;
  value: number | string;
  accent?: "green" | "amber" | "sky" | "violet";
  filterKey?: AnalyticsFilterKey;
  onApplyFilter?: (key: AnalyticsFilterKey) => void;
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

  const clickable = Boolean(filterKey && onApplyFilter && typeof value === "number" && value > 0);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => filterKey && onApplyFilter?.(filterKey)}
      className={cn(
        "rounded-[10px] border border-[#E5E7EB] bg-white px-2.5 py-2 text-left transition-all",
        clickable &&
          "cursor-pointer hover:border-[#FF5A1F]/50 hover:bg-[#FFF7F3] hover:shadow-sm active:scale-[0.98]",
        !clickable && "cursor-default"
      )}
    >
      <p className="text-[9px] font-medium text-[#9CA3AF]">{label}</p>
      <p className={cn("text-[15px] font-bold tabular-nums", accentClass)}>{value}</p>
      {clickable && (
        <p className="mt-0.5 text-[8px] font-medium text-[#FF5A1F]">View products →</p>
      )}
    </button>
  );
}

export function AutoPublishAnalyticsDashboard({
  className,
  onApplyFilter,
  pollIntervalMs = 15_000,
}: {
  className?: string;
  onApplyFilter?: (filters: IntelligenceFilters) => void;
  pollIntervalMs?: number;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading((prev) => (refresh ? prev : true));
    try {
      const [analyticsRes, countsRes] = await Promise.all([
        fetch(`/api/admin/cj/auto-publish/analytics${refresh ? "?refresh=1" : ""}`),
        fetch("/api/admin/cj/catalog/filter-counts"),
      ]);
      const analyticsJson = await analyticsRes.json();
      const countsJson = await countsRes.json();
      if (analyticsJson.success) setData(analyticsJson.analytics);
      if (countsJson.success && countsJson.pipeline) {
        setPipeline(countsJson.pipeline as PipelineMetrics);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(true), pollIntervalMs);
    return () => window.clearInterval(id);
  }, [load, pollIntervalMs]);

  const handleCardFilter = useCallback(
    (key: AnalyticsFilterKey) => {
      const patch = FILTER_MAP[key];
      if (patch && onApplyFilter) onApplyFilter(patch as IntelligenceFilters);
    },
    [onApplyFilter]
  );

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
          <span className="text-[9px] text-[#9CA3AF]">· live</span>
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
        <StatCard
          label="Ready"
          value={data.ready}
          accent="green"
          filterKey="ready"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Published"
          value={data.published}
          accent="green"
          filterKey="published"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Pending Enrichment"
          value={data.pendingEnrichment}
          accent="sky"
          filterKey="pendingEnrichment"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Requirements Missing"
          value={data.requirementsMissing}
          accent="amber"
          filterKey="requirementsMissing"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Admin Override"
          value={data.adminOverride}
          accent="violet"
          filterKey="adminOverride"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Video"
          value={data.missingVideo}
          filterKey="missingVideo"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Supplier"
          value={data.missingSupplier}
          filterKey="missingSupplier"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Shipping"
          value={data.missingShipping}
          filterKey="missingShipping"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Images"
          value={data.missingImages}
          filterKey="missingImages"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Description"
          value={data.missingDescription}
          filterKey="missingDescription"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Variants"
          value={data.missingVariants}
          filterKey="missingVariants"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Missing Stock"
          value={data.missingStock}
          filterKey="missingStock"
          onApplyFilter={handleCardFilter}
        />
        <StatCard
          label="Trending Missing"
          value={data.trendingMissing}
          filterKey="trendingMissing"
          onApplyFilter={handleCardFilter}
        />
        {pipeline && (
          <>
            <StatCard
              label="Draft"
              value={pipeline.draft}
              accent="sky"
              filterKey="draft"
              onApplyFilter={handleCardFilter}
            />
            <StatCard
              label="Hidden"
              value={pipeline.hidden}
              accent="violet"
              filterKey="hidden"
              onApplyFilter={handleCardFilter}
            />
            <StatCard
              label="Queue"
              value={pipeline.queuePending}
              accent="green"
              filterKey="queue"
              onApplyFilter={handleCardFilter}
            />
            <StatCard
              label="Processing"
              value={pipeline.queueProcessing}
              accent="amber"
              filterKey="processing"
              onApplyFilter={handleCardFilter}
            />
            <StatCard
              label="Failed"
              value={pipeline.queueFailed}
              filterKey="failed"
              onApplyFilter={handleCardFilter}
            />
          </>
        )}
        <StatCard label="Avg Publish Score" value={`${data.avgPublishScore}`} />
        <StatCard label="Avg Enrichment Time" value={avgEnrichmentSec} />
      </div>
    </div>
  );
}

export { FILTER_MAP as ANALYTICS_FILTER_MAP };
