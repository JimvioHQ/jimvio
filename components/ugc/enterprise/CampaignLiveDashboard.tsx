"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import {
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "@/components/ugc/workspace/UGCPageShell";
import { EnterpriseOutlineButton, MetricCard } from "./enterprise-ui";

type LiveMetrics = {
  activeCreators: number;
  pendingSubmissions: number;
  revisionRequested: number;
  budgetRemaining: number | null;
  views: number;
  earningsSum: number | null;
  approvalQueueSize?: number;
  totalBudget?: number | null;
  spentBudget?: number | null;
};

export function CampaignLiveDashboard({ campaignId }: { campaignId: string }) {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${campaignId}/live`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load live metrics");
      setMetrics(json.metrics as LiveMetrics);
      setTitle(String(json.title ?? ""));
      setStatus(String(json.status ?? ""));
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load live metrics");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(t);
  }, [load]);

  return (
    <UGCPageShell
      title={title || "Live Dashboard"}
      subtitle={`Real-time campaign health${status ? ` · ${status}` : ""}${updatedAt ? ` · updated ${updatedAt}` : ""}`}
      actions={
        <>
          <EnterpriseOutlineButton onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </EnterpriseOutlineButton>
          <Link
            href={`/ugc/${campaignId}`}
            className="inline-flex items-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151]"
          >
            Campaign page
          </Link>
        </>
      }
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && metrics ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Active creators" value={metrics.activeCreators} />
          <MetricCard label="Submissions" value={metrics.pendingSubmissions} hint="Pending review" />
          <MetricCard label="Revisions" value={metrics.revisionRequested} />
          {metrics.budgetRemaining != null ? (
            <MetricCard
              label="Budget remaining"
              value={Number(metrics.budgetRemaining).toLocaleString()}
              hint={
                metrics.totalBudget != null
                  ? `of ${Number(metrics.totalBudget).toLocaleString()} total`
                  : undefined
              }
            />
          ) : null}
          <MetricCard label="Views" value={Number(metrics.views).toLocaleString()} />
          {metrics.earningsSum != null ? (
            <MetricCard label="Earnings" value={Number(metrics.earningsSum).toLocaleString()} />
          ) : null}
        </div>
      ) : null}
    </UGCPageShell>
  );
}
