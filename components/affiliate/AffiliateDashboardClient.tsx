"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bell,
  FileSpreadsheet,
  Link2,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  AffiliateEmptyState,
  AffiliateMetricTile,
  AffiliatePageShell,
} from "./AffiliatePageShell";
import {
  AFFILIATE_BTN_PRIMARY,
  AFFILIATE_BTN_SECONDARY,
  formatAffiliateMoney,
} from "./sections/shared";
import { cn } from "@/lib/utils";

type DashboardPayload = {
  today?: {
    clicks: number;
    conversions: number;
    commission: number;
    ctr: number;
  };
  analytics?: {
    clicks: number;
    conversions: number;
    commission: number;
    ctr: number;
    balances?: { pending: number; available: number; paid: number };
  };
  balances?: { pending: number; available: number; paid: number; total?: number };
  series?: Array<{ date: string; clicks: number; conversions: number; commission: number }>;
  topProducts?: Array<{
    id: string;
    name: string;
    slug: string | null;
    image: string | null;
    conversions: number;
    commission: number;
  }>;
  recentLinks?: Array<{
    id: string;
    linkCode: string;
    clicks: number;
    conversions: number;
    product: { name: string; slug: string } | null;
  }>;
  ledger?: Array<{ id: string; entry_type: string; amount: number; created_at: string; note?: string }>;
};

type Notif = { id: string; title?: string; body?: string; created_at?: string; read?: boolean };

export function AffiliateDashboardClient() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, notifRes] = await Promise.all([
        fetch("/api/affiliates/dashboard?days=30", { cache: "no-store" }),
        fetch("/api/notifications?limit=8", { cache: "no-store" }).catch(() => null),
      ]);
      if (dashRes.status === 401) {
        setError("Sign in to view your affiliate dashboard.");
        setData(null);
        return;
      }
      if (dashRes.status === 403) {
        setError("Activate affiliate access to unlock your dashboard.");
        setData(null);
        return;
      }
      if (!dashRes.ok) throw new Error("Failed to load dashboard");
      setData(await dashRes.json());
      if (notifRes?.ok) {
        const n = await notifRes.json();
        const items = Array.isArray(n?.items)
          ? n.items
          : Array.isArray(n?.notifications)
            ? n.notifications
            : Array.isArray(n)
              ? n
              : [];
        setNotifs(
          items.map((item: Record<string, unknown>) => ({
            id: String(item.id ?? crypto.randomUUID()),
            title: String(item.title ?? item.type ?? "Update"),
            body: String(item.message ?? item.body ?? item.description ?? ""),
            created_at: item.created_at ? String(item.created_at) : undefined,
            read: Boolean(item.read_at ?? item.is_read),
          }))
        );
      }
    } catch {
      setError("Could not load affiliate dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((r) => ({
        ...r,
        label: r.date.slice(5),
      })),
    [data?.series]
  );

  const pending = Number(data?.balances?.pending ?? data?.analytics?.balances?.pending ?? 0);
  const paid = Number(data?.balances?.paid ?? data?.analytics?.balances?.paid ?? 0);
  const commission = Number(data?.analytics?.commission ?? 0);

  return (
    <AffiliatePageShell
      title="Affiliate Dashboard"
      subtitle="Today’s performance, commissions, top products, and recent tracked links."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/affiliates" className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px]")}>
            Find products
          </Link>
          <Link href="/affiliates/links" className={cn(AFFILIATE_BTN_PRIMARY, "h-10 px-3.5 text-[12.5px]")}>
            <Link2 className="h-3.5 w-3.5" />
            Link Manager
          </Link>
        </div>
      }
    >
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#F3F4F6]" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <AffiliateEmptyState
          title="Dashboard unavailable"
          description={error}
          actionHref={
            error.includes("Activate")
              ? "/dashboard/activate/affiliate"
              : error.includes("Sign in")
                ? "/login?next=/affiliates/dashboard"
                : "/affiliates"
          }
          actionLabel={
            error.includes("Activate")
              ? "Activate affiliate"
              : error.includes("Sign in")
                ? "Sign in"
                : "Browse products"
          }
        />
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AffiliateMetricTile label="Today's clicks" value={String(data.today?.clicks ?? 0)} />
            <AffiliateMetricTile
              label="Conversions"
              value={String(data.today?.conversions ?? 0)}
              hint={`${data.analytics?.conversions ?? 0} in last 30 days`}
            />
            <AffiliateMetricTile
              label="CTR"
              value={`${data.today?.ctr ?? 0}%`}
              hint={`30d CTR ${data.analytics?.ctr ?? 0}%`}
            />
            <AffiliateMetricTile
              label="Commission"
              value={formatAffiliateMoney(data.today?.commission ?? 0, "USD")}
              accent
              hint={`${formatAffiliateMoney(commission, "USD")} / 30d`}
            />
            <AffiliateMetricTile label="Pending" value={formatAffiliateMoney(pending, "USD")} />
            <AffiliateMetricTile label="Paid" value={formatAffiliateMoney(paid, "USD")} accent />
            <AffiliateMetricTile
              label="Available"
              value={formatAffiliateMoney(Number(data.balances?.available ?? 0), "USD")}
            />
            <AffiliateMetricTile
              label="30d clicks"
              value={String(data.analytics?.clicks ?? 0)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-bold text-[#111827]">Performance</h2>
                <span className="text-[11px] font-medium text-[#9CA3AF]">Last 30 days</span>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="affClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="#FF5A1F"
                      fill="url(#affClicks)"
                      strokeWidth={2}
                      name="Clicks"
                    />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      stroke="#111827"
                      fill="transparent"
                      strokeWidth={1.5}
                      name="Conversions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#FF5A1F]" />
                <h2 className="text-[14px] font-bold text-[#111827]">Notifications</h2>
              </div>
              {notifs.length === 0 ? (
                <p className="text-[13px] text-[#6B7280]">No recent notifications.</p>
              ) : (
                <ul className="space-y-3">
                  {notifs.slice(0, 6).map((n) => (
                    <li key={n.id} className="border-b border-[#F3F4F6] pb-2 last:border-0">
                      <p className="text-[13px] font-semibold text-[#111827]">
                        {n.title ?? "Update"}
                      </p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6B7280]">{n.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-3 text-[14px] font-bold text-[#111827]">Top products</h2>
              {(data.topProducts ?? []).length === 0 ? (
                <p className="text-[13px] text-[#6B7280]">Promote products to see rankings here.</p>
              ) : (
                <ul className="space-y-3">
                  {(data.topProducts ?? []).map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-[#F3F4F6]">
                        {p.image ? (
                          <Image src={p.image} alt="" fill className="object-cover" sizes="44px" unoptimized />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={p.slug ? `/affiliates/promote/${p.slug}` : "/affiliates"}
                          className="block truncate text-[13px] font-semibold text-[#111827] hover:text-[#FF5A1F]"
                        >
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-[#6B7280]">
                          {p.conversions} sales · {formatAffiliateMoney(p.commission, "USD")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[18px] border border-[#E8EAED] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-[#111827]">Recent links</h2>
                <Link href="/affiliates/links" className="text-[12px] font-semibold text-[#FF5A1F]">
                  Manage
                </Link>
              </div>
              {(data.recentLinks ?? []).length === 0 ? (
                <p className="text-[13px] text-[#6B7280]">No links yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {(data.recentLinks ?? []).slice(0, 6).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#F3F4F6] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#111827]">
                          {l.product?.name ?? l.linkCode}
                        </p>
                        <p className="font-mono text-[11px] text-[#9CA3AF]">{l.linkCode}</p>
                      </div>
                      <p className="shrink-0 text-[11px] font-medium tabular-nums text-[#6B7280]">
                        {l.clicks} clicks · {l.conversions} conv.
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/affiliates/ai" className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px]")}>
              <Sparkles className="h-3.5 w-3.5" />
              AI Promotion
            </Link>
            <Link href="/affiliates/analytics" className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px]")}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Analytics
            </Link>
            <Link href="/affiliates/payouts" className={cn(AFFILIATE_BTN_SECONDARY, "h-10 px-3.5 text-[12.5px]")}>
              <Wallet className="h-3.5 w-3.5" />
              Payouts
            </Link>
          </div>
        </div>
      ) : null}
    </AffiliatePageShell>
  );
}
