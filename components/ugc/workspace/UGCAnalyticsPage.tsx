"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import {
  UGCPageEmpty,
  UGCPageError,
  UGCPageLoading,
  UGCPageShell,
} from "./UGCPageShell";

type StatsResponse = {
  needsProfile?: boolean;
  summary?: {
    totalViews: number;
    ugcEarnings: number;
    approvalRate: number;
    totalSubmissions: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    activeProjects: number;
    rpm: number;
    cpm: number;
  };
  topCampaigns: { id: string; title: string; views: number; earnings: number; submissions: number }[];
  topVideos: {
    id: string;
    platform: string;
    views: number;
    earnings: number;
    status: string;
    campaign: { id: string; title: string } | null;
  }[];
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#EEF0F2] bg-white p-3">
      <p className="text-[10px] font-semibold uppercase text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-[18px] font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

export function UGCAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ugc/creator/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
    } catch {
      setError("Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;

  return (
    <UGCPageShell
      title="Analytics"
      subtitle="Views, revenue, approval rate, and top-performing campaigns."
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && (!data?.summary || data.needsProfile) ? (
        <UGCPageEmpty
          title="No analytics yet"
          description="Join campaigns and submit content to see performance data."
          action={
            <Button asChild className="rounded-xl bg-[var(--color-accent)]">
              <Link href="/ugc">Discover campaigns</Link>
            </Button>
          }
        />
      ) : null}

      {!loading && !error && s ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total views" value={s.totalViews.toLocaleString()} />
            <Metric label="UGC earnings" value={formatMoney(s.ugcEarnings, "USD")} />
            <Metric label="Approval rate" value={`${s.approvalRate}%`} />
            <Metric label="RPM" value={formatMoney(s.rpm, "USD")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Submissions" value={String(s.totalSubmissions)} />
            <Metric label="Approved" value={String(s.approvedCount)} />
            <Metric label="Active projects" value={String(s.activeProjects)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <h2 className="text-[14px] font-bold text-[#111827]">Top campaigns</h2>
              <div className="mt-3 space-y-2">
                {data.topCampaigns?.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No campaign data yet.</p>
                ) : (
                  data.topCampaigns?.map((c) => (
                    <Link
                      key={c.id}
                      href={`/ugc/${c.id}/dashboard`}
                      className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2 hover:bg-[#FFF4EF]"
                    >
                      <span className="truncate text-[13px] font-medium">{c.title}</span>
                      <span className="text-[12px] font-bold text-[var(--color-accent)]">
                        {formatMoney(c.earnings, "USD")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4">
              <h2 className="text-[14px] font-bold text-[#111827]">Top videos</h2>
              <div className="mt-3 space-y-2">
                {data.topVideos?.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No video data yet.</p>
                ) : (
                  data.topVideos?.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-3 py-2"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{v.platform.toUpperCase()}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {(v.campaign as { title?: string } | null)?.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-bold">{v.views.toLocaleString()} views</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {formatMoney(v.earnings, "USD")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </UGCPageShell>
  );
}
