"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AffiliateEmptyState,
  AffiliateMetricTile,
  AffiliatePageShell,
} from "./AffiliatePageShell";
import { formatAffiliateMoney } from "./sections/shared";

const COLORS = ["#FF5A1F", "#111827", "#F59E0B", "#10B981", "#6366F1", "#EC4899"];

type Bundle = {
  analytics?: {
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
    ctr: number;
  };
  series?: Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
  topProducts?: Array<{ name: string; commission: number; conversions: number }>;
  countries?: Array<{ name: string; value: number }>;
  platforms?: Array<{ name: string; value: number }>;
  trafficSources?: Array<{ name: string; value: number }>;
};

export function AffiliateAnalyticsClient() {
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliates/dashboard?days=30", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setError(res.status === 401 ? "Sign in required" : "Activate affiliate access");
        return;
      }
      if (!res.ok) throw new Error("fail");
      setData(await res.json());
    } catch {
      setError("Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const series = useMemo(
    () => (data?.series ?? []).map((r) => ({ ...r, label: r.date.slice(5) })),
    [data?.series]
  );

  return (
    <AffiliatePageShell
      title="Affiliate Analytics"
      subtitle="Clicks, conversions, revenue, products, countries, platforms, and traffic sources."
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#F3F4F6]" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <AffiliateEmptyState
          title="Analytics unavailable"
          description={error}
          actionHref={
            error.includes("Activate")
              ? "/activate/affiliate"
              : "/login?next=/affiliates/analytics"
          }
          actionLabel={error.includes("Activate") ? "Activate" : "Sign in"}
        />
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AffiliateMetricTile label="Clicks" value={String(data.analytics?.clicks ?? 0)} />
            <AffiliateMetricTile
              label="Conversions"
              value={String(data.analytics?.conversions ?? 0)}
            />
            <AffiliateMetricTile
              label="Revenue"
              value={formatAffiliateMoney(data.analytics?.revenue ?? 0, "USD")}
            />
            <AffiliateMetricTile
              label="Commission"
              value={formatAffiliateMoney(data.analytics?.commission ?? 0, "USD")}
              accent
              hint={`CTR ${data.analytics?.ctr ?? 0}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Clicks & conversions">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                  <Area type="monotone" dataKey="clicks" stroke="#FF5A1F" fill="#FF5A1F22" name="Clicks" />
                  <Area type="monotone" dataKey="conversions" stroke="#111827" fill="#11182711" name="Conversions" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue & commission">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#111827" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="commission" fill="#FF5A1F" radius={[4, 4, 0, 0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Products">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data.topProducts ?? []).map((p) => ({
                    name: p.name.slice(0, 14),
                    commission: p.commission,
                  }))}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                  <Bar dataKey="commission" fill="#FF5A1F" radius={[0, 4, 4, 0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Countries">
              <Donut data={data.countries ?? []} />
            </ChartCard>

            <ChartCard title="Platforms">
              <Donut data={data.platforms ?? []} />
            </ChartCard>

            <ChartCard title="Traffic sources">
              <Donut data={data.trafficSources ?? []} />
            </ChartCard>
          </div>
        </div>
      ) : null}
    </AffiliatePageShell>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-[14px] font-bold text-[#111827]">{title}</h2>
      <div className="h-[220px] w-full">{children}</div>
    </div>
  );
}

function Donut({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) {
    return <p className="grid h-full place-items-center text-[13px] text-[#9CA3AF]">No data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
