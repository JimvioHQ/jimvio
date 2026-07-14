"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogHealth {
  healthPercent: number;
  healthLabel: string;
  ready: number;
  published: number;
  pending: number;
  draft: number;
  hidden: number;
  unpublished: number;
  supplierIssues: number;
  shippingIssues: number;
  videoMissing: number;
  duplicateCount: number;
  readyPercent: number;
  publishPercent: number;
  marketplaceHealth: number;
}

interface Recommendation {
  category: string;
  issue: string;
  productCount: number;
  recommendation: string;
}

function HealthRing({ percent, label }: { percent: number; label: string }) {
  const color =
    percent >= 95
      ? "text-emerald-600"
      : percent >= 80
        ? "text-sky-600"
        : percent >= 60
          ? "text-amber-600"
          : "text-rose-600";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-[3px] bg-white",
          percent >= 95
            ? "border-emerald-500"
            : percent >= 80
              ? "border-sky-500"
              : percent >= 60
                ? "border-amber-500"
                : "border-rose-500"
        )}
      >
        <span className={cn("text-[15px] font-bold tabular-nums", color)}>
          {percent}%
        </span>
      </div>
      <div>
        <p className="text-[11px] font-medium text-[#9CA3AF]">Catalog Health</p>
        <p className={cn("text-[14px] font-semibold", color)}>{label}</p>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[#F3F4F6] bg-[#FAFAFA] px-2 py-1.5">
      <p className="text-[9px] font-medium text-[#9CA3AF]">{label}</p>
      <p className="text-[13px] font-semibold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

export function CatalogHealthV3Panel({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cj/auto-publish/catalog-health");
      const json = await res.json();
      if (json.success) {
        setHealth(json.health);
        setRecommendations(json.recommendations ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !health) void load();
  }, [open, health, load]);

  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04)]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-accent)]" />
          <span className="text-[12px] font-semibold text-[#111827]">
            Catalog Health v3
          </span>
          {health && (
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
              {health.healthPercent}% {health.healthLabel}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#F3F4F6] px-3 pb-3 pt-2">
          {loading && !health ? (
            <div className="flex items-center gap-2 py-4 text-[11px] text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalog health…
            </div>
          ) : health ? (
            <div className="space-y-3">
              <HealthRing percent={health.healthPercent} label={health.healthLabel} />

              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                <MetricPill label="Ready" value={health.ready} />
                <MetricPill label="Published" value={health.published} />
                <MetricPill label="Pending" value={health.pending} />
                <MetricPill label="Draft" value={health.draft} />
                <MetricPill label="Hidden" value={health.hidden} />
                <MetricPill label="Unpublished" value={health.unpublished} />
                <MetricPill label="Supplier Issues" value={health.supplierIssues} />
                <MetricPill label="Shipping Issues" value={health.shippingIssues} />
                <MetricPill label="Video Missing" value={health.videoMissing} />
                <MetricPill label="Duplicates" value={health.duplicateCount} />
              </div>

              {recommendations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                      AI Recommendations
                    </p>
                  </div>
                  {recommendations.slice(0, 4).map((r) => (
                    <div
                      key={r.issue}
                      className="rounded-[8px] border border-[#F3F4F6] bg-[#FAFAFA] px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-[#111827]">
                          {r.issue}
                        </p>
                        <span className="text-[10px] tabular-nums text-[#9CA3AF]">
                          {r.productCount.toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-[#6B7280]">
                        {r.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
