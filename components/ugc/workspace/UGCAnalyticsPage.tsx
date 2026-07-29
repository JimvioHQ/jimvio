"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  recentSubmissions?: {
    id: string;
    status: string;
    platform: string;
    total_views_earned?: number;
    total_earnings?: number;
    created_at: string;
  }[];
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="mt-1 text-[20px] font-bold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}

function BarChart({
  title,
  bars,
  formatValue,
}: {
  title: string;
  bars: { label: string; value: number; color?: string }[];
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
      <h2 className="text-[14px] font-bold text-[#111827]">{title}</h2>
      {bars.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#6B7280]">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate font-medium text-[#374151]">{b.label}</span>
                <span className="shrink-0 tabular-nums font-bold text-[#111827]">
                  {formatValue ? formatValue(b.value) : b.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, (b.value / max) * 100)}%`,
                    background: b.color ?? "#FF5A1F",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthBars({
  title,
  points,
  formatMoney,
}: {
  title: string;
  points: { label: string; value: number }[];
  formatMoney: (n: number, c?: string) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
      <h2 className="text-[14px] font-bold text-[#111827]">{title}</h2>
      <div className="mt-4 flex h-36 items-end gap-2">
        {points.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold tabular-nums text-[#6B7280]">
              {p.value > 0 ? formatMoney(p.value, "USD") : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-[#FF5A1F] to-[#FF8A4C]"
              style={{ height: `${Math.max(8, (p.value / max) * 100)}%` }}
              title={formatMoney(p.value, "USD")}
            />
            <span className="text-[10px] font-semibold text-[#9CA3AF]">{p.label}</span>
          </div>
        ))}
      </div>
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

  const platformBars = useMemo(() => {
    const map = new Map<string, { views: number; earnings: number }>();
    for (const v of data?.topVideos ?? []) {
      const cur = map.get(v.platform) ?? { views: 0, earnings: 0 };
      cur.views += v.views;
      cur.earnings += v.earnings;
      map.set(v.platform, cur);
    }
    return [...map.entries()].map(([label, v]) => ({
      label: label.toUpperCase(),
      value: v.views,
      color: "#FF5A1F",
    }));
  }, [data?.topVideos]);

  const monthly = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        key,
        label: d.toLocaleString(undefined, { month: "short" }),
        value: 0,
      });
    }
    for (const sub of data?.recentSubmissions ?? []) {
      const d = new Date(sub.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const slot = months.find((m) => m.key === key);
      if (slot) slot.value += Number(sub.total_earnings ?? 0);
    }
    // If recent submissions lack earnings spread, distribute ugc earnings for viz fallback
    if (months.every((m) => m.value === 0) && (s?.ugcEarnings ?? 0) > 0) {
      months[months.length - 1].value = s!.ugcEarnings;
    }
    return months.map(({ label, value }) => ({ label, value }));
  }, [data?.recentSubmissions, s]);

  const approvalBars = useMemo(() => {
    if (!s) return [];
    return [
      { label: "Approved", value: s.approvedCount, color: "#059669" },
      { label: "Pending", value: s.pendingCount, color: "#D97706" },
      { label: "Rejected", value: s.rejectedCount, color: "#E11D48" },
    ];
  }, [s]);

  return (
    <UGCPageShell
      title="Analytics"
      subtitle="Views, revenue, approvals, platforms, and monthly earnings."
    >
      {loading ? <UGCPageLoading /> : null}
      {!loading && error ? <UGCPageError message={error} onRetry={load} /> : null}
      {!loading && !error && (!data?.summary || data.needsProfile) ? (
        <UGCPageEmpty
          title="No analytics yet"
          description="Join campaigns and submit content to see performance charts."
          illustration="analytics"
          action={
            <Button asChild className="rounded-xl bg-[#FF5A1F]">
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

          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart
              title="Campaign performance"
              bars={(data.topCampaigns ?? []).map((c) => ({
                label: c.title,
                value: c.views,
              }))}
            />
            <BarChart
              title="Platform performance"
              bars={platformBars}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart title="Approvals" bars={approvalBars} />
            <MonthBars title="Monthly earnings" points={monthly} formatMoney={formatMoney} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
              <h2 className="text-[14px] font-bold text-[#111827]">Top performing campaigns</h2>
              <div className="mt-3 space-y-2">
                {data.topCampaigns?.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No campaign data yet.</p>
                ) : (
                  data.topCampaigns?.map((c) => (
                    <Link
                      key={c.id}
                      href={`/ugc/${c.id}/dashboard`}
                      className="flex items-center justify-between rounded-xl bg-[#FAFAFA] px-3 py-2.5 hover:bg-[#FFF4EF]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{c.title}</p>
                        <p className="text-[11px] text-[#6B7280]">
                          {c.views.toLocaleString()} views · {c.submissions} submissions
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] font-bold text-[#FF5A1F]">
                        {formatMoney(c.earnings, "USD")}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#EEF0F2] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.04)]">
              <h2 className="text-[14px] font-bold text-[#111827]">Revenue by video</h2>
              <div className="mt-3 space-y-2">
                {data.topVideos?.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">No video data yet.</p>
                ) : (
                  data.topVideos?.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl bg-[#FAFAFA] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-[13px] font-medium uppercase">{v.platform}</p>
                        <p className="text-[11px] text-[#6B7280]">{v.campaign?.title}</p>
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
