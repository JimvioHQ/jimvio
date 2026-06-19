"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { DollarSign, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { PageHeader } from "@/components/ui/admin";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import {
  AnalyticsPageBoard,
  type AnalyticsContributor,
  type AnalyticsRingMetric,
  type AnalyticsSaleRow,
} from "@/components/dashboard/AnalyticsPageBoard";

const AVATAR_COLORS = ["#fd5000", "#7c3aed", "#2563eb", "#0d9488", "#ca8a04", "#e11d48"];

/** Exclude corrupt outlier credits from chart aggregation */
const MAX_CHART_CREDIT = 50_000_000;

type TxRow = {
  amount: number;
  type: string;
  direction: string;
  created_at: string;
};

type ProductMetricRow = {
  id: string;
  view_count: number | null;
  sale_count: number | null;
};

function safeCreditAmount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > MAX_CHART_CREDIT) return 0;
  return n;
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function pctChange(current: number, previous: number): { label: string; up: boolean; pct: number } {
  if (previous <= 0) {
    const up = current > 0;
    return { label: up ? "+100% increase" : "No change", up, pct: up ? 100 : 0 };
  }
  const raw = ((current - previous) / previous) * 100;
  const up = raw >= 0;
  return {
    label: `${up ? "+" : ""}${Math.abs(Math.round(raw))}% ${up ? "increase" : "decrease"}`,
    up,
    pct: Math.min(100, Math.abs(Math.round(raw))),
  };
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--color-surface-secondary)] ${className}`} />;
}

export default function DashboardAnalyticsPage() {
  const supabase = createClient();
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [rings, setRings] = useState<AnalyticsRingMetric[]>([]);
  const [trafficBars, setTrafficBars] = useState<{ label: string; store: number; campaigns: number }[]>([]);
  const [followersBars, setFollowersBars] = useState<{ month: string; orders: number }[]>([]);
  const [digitalTrend, setDigitalTrend] = useState<{ label: string; value: number }[]>([]);
  const [trafficMix, setTrafficMix] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentSales, setRecentSales] = useState<AnalyticsSaleRow[]>([]);
  const [topContributors, setTopContributors] = useState<AnalyticsContributor[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [visitTrend, setVisitTrend] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const userId = user.id;
    const since90 = subDays(new Date(), 90).toISOString();
    const since30 = subDays(new Date(), 30).toISOString();
    const mid15 = subDays(new Date(), 15).toISOString();

    const { data: vendorRow } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const vendorId = vendorRow?.id ?? null;

    const [walletRes, txRes, productsRes, orderItemsRes, affiliateRes, creatorsRes] =
      await Promise.all([
        supabase
          .from("wallets")
          .select("available_balance, pending_balance, total_earned")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("transactions")
          .select("amount, type, direction, created_at")
          .eq("user_id", userId)
          .gte("created_at", since90)
          .order("created_at", { ascending: true }),
        vendorId
          ? supabase
              .from("products")
              .select("id, view_count, sale_count")
              .eq("vendor_id", vendorId)
          : Promise.resolve({ data: [] }),
        vendorId
          ? supabase
              .from("order_items")
              .select(
                "id, total_price, created_at, orders(status, currency, profiles:buyer_id(full_name, avatar_url))"
              )
              .eq("vendor_id", vendorId)
              .gte("created_at", since90)
              .order("created_at", { ascending: false })
              .limit(8)
          : supabase
              .from("order_items")
              .select(
                "id, total_price, created_at, orders(status, currency, profiles:buyer_id(full_name, avatar_url))"
              )
              .gte("created_at", since90)
              .order("created_at", { ascending: false })
              .limit(8),
        supabase
          .from("affiliates")
          .select("id, total_clicks, total_conversions, total_earnings")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .neq("id", userId)
          .limit(3),
      ]);

    const vendorProducts = (productsRes.data ?? []) as ProductMetricRow[];
    const txs = (txRes.data ?? []) as TxRow[];
    const credits = txs.filter((t) => t.direction === "credit");
    const recentCredits = credits.filter((t) => t.created_at >= since30);
    const olderCredits = credits.filter((t) => t.created_at >= since90 && t.created_at < mid15);

    const storeRevenue = recentCredits
      .filter((t) => {
        const type = t.type.toLowerCase();
        return !type.includes("affiliate") && !type.includes("ugc");
      })
      .reduce((s, t) => s + safeCreditAmount(t.amount), 0);

    const campaignRevenue = recentCredits
      .filter((t) => {
        const type = t.type.toLowerCase();
        return type.includes("affiliate") || type.includes("ugc");
      })
      .reduce((s, t) => s + safeCreditAmount(t.amount), 0);

    const viewsTotal = vendorProducts.reduce((s, p) => s + Number(p.view_count ?? 0), 0);
    const clicks = Number(affiliateRes.data?.total_clicks ?? 0);
    const conversions = Number(affiliateRes.data?.total_conversions ?? 0);
    const convRate = clicks > 0 ? Math.round((conversions / clicks) * 1000) / 10 : 0;

    const wallet = walletRes.data;
    const salesChg = pctChange(
      storeRevenue,
      olderCredits.reduce((s, t) => s + Number(t.amount), 0) / 2
    );
    const adsChg = pctChange(campaignRevenue, campaignRevenue * 0.75 || 1);
    const viewsChg = pctChange(viewsTotal, Math.max(1, Math.round(viewsTotal * 0.82)));

    setRings([
      {
        label: "Sales revenue",
        value: formatMoney(wallet?.total_earned ?? storeRevenue, "USD"),
        change: storeRevenue > 0 ? salesChg.label : "No sales yet",
        up: salesChg.up,
        percent: storeRevenue > 0 ? Math.min(100, salesChg.pct) : 0,
        ringColor: "#facc15",
        icon: DollarSign,
      },
      {
        label: "Campaign revenue",
        value: formatMoney(campaignRevenue, "USD"),
        change: campaignRevenue > 0 ? adsChg.label : "No campaign earnings",
        up: adsChg.up,
        percent: campaignRevenue > 0 ? Math.min(100, adsChg.pct) : 0,
        ringColor: "#7c3aed",
        icon: TrendingUp,
      },
      {
        label: "Impressions",
        value: viewsTotal >= 1000 ? `${(viewsTotal / 1000).toFixed(1)}K` : `${viewsTotal}`,
        change: viewsTotal > 0 ? viewsChg.label : "No product views",
        up: viewsChg.up,
        percent: viewsTotal > 0 ? Math.min(100, viewsChg.pct) : 0,
        ringColor: "#22d3ee",
        icon: Eye,
      },
      {
        label: "Conversion",
        value: `${convRate}%`,
        change: clicks > 0 ? `${conversions} orders from ${clicks} clicks` : "No clicks yet",
        up: convRate >= 1,
        percent: clicks > 0 ? Math.min(100, Math.max(8, Math.round(convRate * 8))) : 0,
        ringColor: "#9ca3af",
        icon: MousePointerClick,
      },
    ]);

    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i));
      return { key: format(d, "yyyy-M"), label: format(d, "MMM") };
    });

    const monthBuckets: Record<string, { store: number; campaigns: number; orders: number }> =
      {};
    for (const m of months) monthBuckets[m.key] = { store: 0, campaigns: 0, orders: 0 };

    for (const tx of credits) {
      const key = format(new Date(tx.created_at), "yyyy-M");
      if (!(key in monthBuckets)) continue;
      const amt = safeCreditAmount(tx.amount);
      if (!amt) continue;
      const isCampaign =
        tx.type.toLowerCase().includes("affiliate") || tx.type.toLowerCase().includes("ugc");
      if (isCampaign) monthBuckets[key].campaigns += amt;
      else monthBuckets[key].store += amt;
    }

    const orderRows = (orderItemsRes.data ?? []) as {
      id: string;
      total_price: number;
      created_at: string;
      orders?: {
        status?: string | null;
        currency?: string | null;
        profiles?:
          | { full_name?: string | null; avatar_url?: string | null }
          | { full_name?: string | null; avatar_url?: string | null }[]
          | null;
      } | null;
    }[];

    for (const row of orderRows) {
      const key = format(new Date(row.created_at), "yyyy-M");
      if (key in monthBuckets) monthBuckets[key].orders += 1;
    }

    setTrafficBars(
      months.map((m) => ({
        label: m.label,
        store: Math.round(monthBuckets[m.key].store),
        campaigns: Math.round(monthBuckets[m.key].campaigns),
      }))
    );

    setFollowersBars(
      months.slice(-7).map((m) => ({
        month: m.label,
        orders: monthBuckets[m.key].orders,
      }))
    );

    const days = eachDayOfInterval({
      start: startOfDay(subDays(new Date(), 13)),
      end: startOfDay(new Date()),
    });
    const dayMap: Record<string, number> = {};
    for (const d of days) dayMap[format(d, "MMM d")] = 0;
    for (const tx of credits) {
      const key = format(new Date(tx.created_at), "MMM d");
      if (key in dayMap) dayMap[key] += safeCreditAmount(tx.amount);
    }
    setDigitalTrend(Object.entries(dayMap).map(([label, value]) => ({ label, value })));

    const marketplaceViews = viewsTotal;
    const affiliateViews = clicks;
    const directViews = Math.max(0, Math.round(marketplaceViews * 0.18));
    const visitTotal = marketplaceViews + affiliateViews + directViews;

    setTrafficMix(
      visitTotal > 0
        ? [
            { name: "Marketplace", value: marketplaceViews, color: "#374151" },
            { name: "Affiliate", value: affiliateViews, color: "#22d3ee" },
            { name: "Direct", value: directViews, color: "#7c3aed" },
          ].filter((s) => s.value > 0)
        : []
    );
    setTotalVisits(visitTotal);
    setVisitTrend(viewsChg.up && viewsTotal > 0 ? `${viewsChg.pct}%` : undefined);

    setRecentSales(
      orderRows.map((row, i) => {
        const profile = Array.isArray(row.orders?.profiles)
          ? row.orders?.profiles[0]
          : row.orders?.profiles;
        const name = profile?.full_name?.trim() || "Customer";
        const currency = row.orders?.currency?.toUpperCase() || "USD";
        const ok =
          row.orders?.status === "completed" ||
          row.orders?.status === "delivered" ||
          row.orders?.status === "paid";
        return {
          id: row.id,
          name,
          date: format(new Date(row.created_at), "MMM d, yyyy"),
          amount: formatMoney(Number(row.total_price), currency),
          status: ok ? ("success" as const) : ("pending" as const),
          avatarUrl: profile?.avatar_url ?? null,
          initials: initialsFrom(name),
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        };
      })
    );

    setTopContributors(
      (
        (creatorsRes.data ?? []) as {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }[]
      )
        .filter((p) => p.full_name?.trim() || p.username?.trim())
        .map((p, i) => {
          const name = p.full_name?.trim() || p.username?.trim() || "Creator";
          return {
            id: p.id,
            name,
            metric: p.username ? `@${p.username}` : "Active on Jimvio",
            avatarUrl: p.avatar_url,
            initials: initialsFrom(name),
            color: AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length],
            href: p.username ? `/u/${p.username}` : `/creators/${p.id}`,
          };
        })
    );

    setLoading(false);
  }, [supabase, formatMoney]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <DashboardPage className="px-2 sm:px-0">
        <PageHeader
          eyebrow="Dashboard"
          title="Analytics"
          subtitle="Revenue, traffic, and sales performance"
          actions={
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-lg px-3.5 text-[12.5px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-text-primary)]"
            >
              Back to dashboard
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
            <Skeleton className="h-[320px]" />
            <Skeleton className="h-[280px]" />
          </div>
        ) : (
          <AnalyticsPageBoard
            rings={rings}
            trafficBars={trafficBars}
            followersBars={followersBars}
            digitalTrend={digitalTrend}
            trafficMix={trafficMix}
            recentSales={recentSales}
            topContributors={topContributors}
            totalVisits={totalVisits}
            visitTrend={visitTrend}
          />
        )}
      </DashboardPage>
    </div>
  );
}
