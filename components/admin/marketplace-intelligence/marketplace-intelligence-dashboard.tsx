"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Brain, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthData {
  healthPercent: number;
  healthLabel: string;
  avgQuality: number;
  avgShippingDays: number | null;
  conversionRate: number;
  refundPrediction: number;
  supplierHealth: number;
  videoPercent: number;
  duplicatePercent: number;
  trendingPercent: number;
  fastShippingPercent: number;
  totalProducts: number;
  activeProducts: number;
  revenue7d: number;
  orders7d: number;
  ctrAvg: number;
  snapshotAt: string;
}

interface AnalyticsData {
  health: HealthData | null;
  totals: {
    intelligenceRows: number;
    duplicatesHidden: number;
    avgRankScore: number;
    avgTrendingScore: number;
    avgQualityScore: number;
  };
  recommendations: Array<{
    category: string;
    issue: string;
    productCount: number;
    recommendation: string;
    action: string;
    priority: number;
  }>;
  topRanked: Array<{
    productId: string;
    rankScore: number;
    marketplaceRank: number | null;
    trendingScore: number;
    qualityScore: number;
    qualityLabel: string;
  }>;
  computedAt: string;
}

function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | string;
  suffix?: string;
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
      <p className={cn("text-[15px] font-bold tabular-nums", accentClass)}>
        {value}
        {suffix}
      </p>
    </div>
  );
}

export function MarketplaceIntelligenceDashboard({ className }: { className?: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketplace-intelligence/analytics");
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
        <span className="text-[11px] text-[#9CA3AF]">Loading Marketplace Intelligence v4…</span>
      </div>
    );
  }

  const health = data?.health;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-600" />
          <h3 className="text-[12px] font-semibold text-[#111827]">
            Marketplace Intelligence v4
          </h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1 rounded-[8px] border border-[#E5E7EB] px-2 py-1 text-[10px] text-[#6B7280] hover:bg-[#F9FAFB]"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {health && (
        <div className="rounded-[12px] border border-violet-200 bg-violet-50/50 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-600" />
            <span className="text-[11px] font-semibold text-violet-800">
              Marketplace Health: {health.healthPercent}% — {health.healthLabel}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Avg Quality" value={health?.avgQuality ?? data?.totals.avgQualityScore ?? 0} accent="green" />
        <StatCard label="Avg Rank" value={data?.totals.avgRankScore ?? 0} accent="violet" />
        <StatCard label="Trending Score" value={data?.totals.avgTrendingScore ?? 0} accent="sky" />
        <StatCard label="Conversion" value={((health?.conversionRate ?? 0) * 100).toFixed(2)} suffix="%" />
        <StatCard label="Video %" value={health?.videoPercent ?? 0} suffix="%" accent="amber" />
        <StatCard label="Fast Ship %" value={health?.fastShippingPercent ?? 0} suffix="%" accent="green" />
        <StatCard label="Duplicate %" value={health?.duplicatePercent ?? 0} suffix="%" />
        <StatCard label="Supplier Health" value={health?.supplierHealth ?? 0} accent="green" />
        <StatCard label="Refund Pred." value={((health?.refundPrediction ?? 0) * 100).toFixed(1)} suffix="%" />
        <StatCard label="Active Products" value={health?.activeProducts ?? 0} />
        <StatCard label="Revenue 7d" value={`$${(health?.revenue7d ?? 0).toLocaleString()}`} accent="green" />
        <StatCard label="Orders 7d" value={health?.orders7d ?? 0} />
      </div>

      {data?.recommendations && data.recommendations.length > 0 && (
        <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[11px] font-semibold text-[#111827]">AI Recommendations</span>
          </div>
          <div className="space-y-1.5">
            {data.recommendations.slice(0, 5).map((rec, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-[8px] bg-[#F9FAFB] px-2 py-1.5">
                <div>
                  <p className="text-[10px] font-medium text-[#111827]">{rec.recommendation}</p>
                  <p className="text-[9px] text-[#9CA3AF]">
                    {rec.category} · {rec.productCount} products
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-medium text-amber-700">
                  P{rec.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
