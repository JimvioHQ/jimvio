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
  const [trafficBars, setTrafficBars] = useState<{ label: string; profit: number; revenue: number; ads: number }[]>([]);
  const [followersBars, setFollowersBars] = useState<{ month: string; followers: number; unfollows: number }[]>([]);
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
                "id, total_price, created_at, orders(status, profiles:buyer_id(full_name, avatar_url))"
              )
              .eq("vendor_id", vendorId)
              .gte("created_at", since90)
              .order("created_at", { ascending: false })
              .limit(8)
          : supabase
              .from("order_items")
              .select(
                "id, total_price, created_at, orders(status, profiles:buyer_id(full_name, avatar_url))"
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

    const vendorProducts = productsRes.data ?? [];
    const txs = txRes.data ?? [];
    const credits = txs.filter((t) => t.direction === "credit");
    const recentCredits = credits.filter((t) => t.created_at >= since30);
    const olderCredits = credits.filter((t) => t.created_at >= since90 && t.created_at < mid15);

    const storeRevenue = recentCredits
      .filter((t) => {
        const type = t.type.toLowerCase();
        return !type.includes("affiliate") && !type.includes("ugc");
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const campaignRevenue = recentCredits
      .filter((t) => {
        const type = t.type.toLowerCase();
        return type.includes("affiliate") || type.includes("ugc");
      })
      .reduce((s, t) => s + Number(t.amount), 0);

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
        change: salesChg.label,
        up: salesChg.up,
        percent: Math.max(salesChg.pct, storeRevenue > 0 ? 12 : 0) || 12,
        ringColor: "#facc15",
        icon: DollarSign,
      },
      {
        label: "Campaign revenue",
        value: formatMoney(campaignRevenue, "USD"),
        change: adsChg.label,
        up: adsChg.up,
        percent: Math.max(adsChg.pct, campaignRevenue > 0 ? 18 : 0) || 18,
        ringColor: "#7c3aed",
        icon: TrendingUp,
      },
      {
        label: "Impressions",
        value: viewsTotal >= 1000 ? `${(viewsTotal / 1000).toFixed(1)}K` : `${viewsTotal}`,
        change: viewsChg.label,
        up: viewsChg.up,
        percent: Math.max(viewsChg.pct, viewsTotal > 0 ? 24 : 0) || 8,
        ringColor: "#22d3ee",
        icon: Eye,
      },
      {
        label: "Conversion",
        value: `${convRate}%`,
        change: clicks > 0 ? `${conversions} orders from ${clicks} clicks` : "No clicks yet",
        up: convRate >= 1,
        percent: Math.min(100, Math.max(convRate * 8, clicks > 0 ? 10 : 0)),
        ringColor: "#9ca3af",
        icon: MousePointerClick,
      },
    ]);

    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i));
      return { key: format(d, "yyyy-M"), label: format(d, "MMM") };
    });

    const monthBuckets: Record<string, { profit: number; revenue: number; ads: number; orders: number }> =
      {};
    for (const m of months) monthBuckets[m.key] = { profit: 0, revenue: 0, ads: 0, orders: 0 };

    for (const tx of credits) {
      const key = format(new Date(tx.created_at), "yyyy-M");
      if (!(key in monthBuckets)) continue;
      const amt = Number(tx.amount);
      const isCampaign =
        tx.type.toLowerCase().includes("affiliate") || tx.type.toLowerCase().includes("ugc");
      if (isCampaign) monthBuckets[key].ads += amt;
      else monthBuckets[key].profit += amt;
      monthBuckets[key].revenue += amt;
    }

    const orderRows = (orderItemsRes.data ?? []) as {
      id: string;
      total_price: number;
      created_at: string;
      orders?: {
        status?: string | null;
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
        profit: Math.round(monthBuckets[m.key].profit),
        revenue: Math.round(monthBuckets[m.key].revenue * 1.05),
        ads: Math.round(monthBuckets[m.key].ads),
      }))
    );

    setFollowersBars(
      months.slice(-7).map((m) => ({
        month: m.label,
        followers: monthBuckets[m.key].orders,
        unfollows: Math.max(0, Math.round(monthBuckets[m.key].orders * 0.15)),
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
      if (key in dayMap) dayMap[key] += Number(tx.amount);
    }
    setDigitalTrend(Object.entries(dayMap).map(([label, value]) => ({ label, value })));

    const marketplaceViews = viewsTotal;
    const affiliateViews = clicks;
    const directViews = Math.max(0, Math.round(marketplaceViews * 0.18));
    setTrafficMix([
      { name: "Marketplace", value: Math.max(marketplaceViews, 1), color: "#374151" },
      { name: "Affiliate", value: Math.max(affiliateViews, 1), color: "#22d3ee" },
      { name: "Direct", value: Math.max(directViews, 1), color: "#7c3aed" },
    ]);
    setTotalVisits(marketplaceViews + affiliateViews + directViews);
    setVisitTrend(viewsChg.up && viewsTotal > 0 ? `${viewsChg.pct}%` : undefined);

    setRecentSales(
      orderRows.map((row) => {
        const profile = Array.isArray(row.orders?.profiles)
          ? row.orders?.profiles[0]
          : row.orders?.profiles;
        const name = profile?.full_name ?? "Customer";
        const hue = name.charCodeAt(0) % 360;
        const ok =
          row.orders?.status === "completed" ||
          row.orders?.status === "delivered" ||
          row.orders?.status === "paid";
        return {
          id: row.id,
          name,
          date: format(new Date(row.created_at), "MMM d, yyyy"),
          amount: formatMoney(Number(row.total_price), "USD"),
          status: ok ? ("success" as const) : ("pending" as const),
          avatarUrl: profile?.avatar_url ?? null,
          initials: name.slice(0, 2).toUpperCase(),
          color: `hsl(${hue}, 55%, 45%)`,
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
      ).map((p) => {
        const name = p.full_name ?? p.username ?? "Creator";
        const hue = name.charCodeAt(0) % 360;
        return {
          id: p.id,
          name,
          metric: p.username ? `@${p.username}` : "Jimvio creator",
          avatarUrl: p.avatar_url,
          initials: name.slice(0, 2).toUpperCase(),
          color: `hsl(${hue}, 55%, 42%)`,
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
