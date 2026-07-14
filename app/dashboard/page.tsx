"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";
import type { Community, EarningsDataset } from "@/types/dashboard";
import { QuickActionsStrip } from "@/components/dashboard/QuickActionsStrip";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { TopProducts } from "@/components/dashboard/top-products";
import { DashboardPanel } from "@/components/dashboard/dashboard-sections";
import {
    DashboardGridSkeleton,
} from "@/components/dashboard/dashboard-skeleton";

import type { StatCard, ActivityItem, Product } from "@/types/dashboard";
import type { DashboardMessagePreview } from "@/components/dashboard/DashboardMessagesPanel";
import { mapProductToStockRow, type StockQuantityRow } from "@/components/dashboard/StockQuantityTable";
import { QUICK_ACTIONS } from "@/data/dashboard";

const LazyAIPanel = dynamic(
  () =>
    import("@/components/ui/jimvio-ai-panel").then((m) => ({
      default: m.JimvioAIPanel,
    })),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletRow {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
}

interface TxRow {
  amount: number;
  type: string;
  direction: string;
  created_at: string;
}

interface NotifRow {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

interface ProductRow {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  currency: string;
  sale_count: number;
  images: unknown;
  product_categories: { name: string } | null;
  price_usd: number;
}

interface CommunityMembershipRow {
  community_id: string;
  communities: {
    id: string;
    name: string;
    avatar_url: string | null;
    member_count: number;
    slug: string;
  };
}

interface OrderRow {
  id: string;
  order_number: string | null;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getProductImage(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string") {
    if (images.startsWith("http")) return images;
    try {
      return getProductImage(JSON.parse(images));
    } catch {
      return null;
    }
  }
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object" && "url" in first) {
      const url = (first as { url: unknown }).url;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
  }
  return null;
}

function classifyTx(type: string): "marketplace" | "communities" | "other" {
  const t = type.toLowerCase();
  if (t.includes("community")) return "communities";
  if (
    t.includes("order") ||
    t.includes("sale") ||
    t.includes("marketplace") ||
    t.includes("payment")
  ) {
    return "marketplace";
  }
  return "other";
}

function buildSparkline(txs: TxRow[], bucket: "marketplace" | "communities", days = 8): number[] {
  const end = new Date();
  const start = subDays(end, days - 1);
  const range = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
  const map: Record<string, number> = {};
  for (const d of range) map[format(d, "MMM d")] = 0;
  for (const tx of txs) {
    if (tx.direction !== "credit") continue;
    if (classifyTx(tx.type) !== bucket) continue;
    const key = format(new Date(tx.created_at), "MMM d");
    if (key in map) map[key] += Number(tx.amount);
  }
  return Object.values(map);
}

function notifToActivity(n: NotifRow): ActivityItem {
  const iconMap: Record<string, { icon: string; iconBg: string }> = {
    payment: { icon: "sale", iconBg: "#e9f9ef" },
    order: { icon: "check", iconBg: "#ede9ff" },
    community: { icon: "member", iconBg: "#f0f4ff" },
    system: { icon: "payout", iconBg: "#fff3ee" },
    message: { icon: "member", iconBg: "#f0f4ff" },
  };
  const m = iconMap[n.type] ?? { icon: "sale", iconBg: "#e9f9ef" };
  return {
    icon: m.icon,
    iconBg: m.iconBg,
    title: n.title,
    sub: n.message,
    time: timeAgo(n.created_at),
    amount: null,
    positive: null,
  };
}

type DateRange = "7d" | "14d" | "30d" | "all";

const DATE_RANGE_DAYS: Record<DateRange, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  all: 365,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const supabase = createClient();
  const { formatMoney } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [earningsLabels, setEarningsLabels] = useState<string[]>([]);
  const [earningsDatasets, setEarningsDatasets] = useState<EarningsDataset[]>([]);
  const [dashboardMessages, setDashboardMessages] = useState<DashboardMessagePreview[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("14d");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setCommunities] = useState<Community[]>([]);
  const [, setRecentOrders] = useState<OrderRow[]>([]);
  const [, setStockRows] = useState<StockQuantityRow[]>([]);
  const [, setIsVendor] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const userId = user.id;
    const rangeDays = DATE_RANGE_DAYS[dateRange];
    const sinceDate = subDays(new Date(), rangeDays).toISOString();

    const [
      profileRes,
      walletRes,
      txRes,
      notifsRes,
      productsRes,
      membershipsRes,
      buyerConvsRes,
      vendorRes,
      ordersRes,
      ordersCountRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", userId)
        .single(),
      supabase
        .from("wallets")
        .select("available_balance, pending_balance, total_earned")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("transactions")
        .select("amount, type, direction, created_at")
        .eq("user_id", userId)
        .gte("created_at", sinceDate)
        .order("created_at", { ascending: true }),
      supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at, action_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("products")
        .select(
          "id, slug, name, price, currency, sale_count, images, product_categories(name), price_usd"
        )
        .eq("status", "active")
        .eq("is_active", true)
        .order("sale_count", { ascending: false })
        .limit(4),
      supabase
        .from("community_memberships")
        .select("community_id, communities(id, name, avatar_url, member_count, slug)")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(4),
      supabase
        .from("conversations")
        .select("id, updated_at, vendors(business_name, business_logo)")
        .eq("buyer_id", userId)
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase.from("vendors").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from("orders")
        .select("id, order_number, total_amount, currency, status, created_at")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", userId),
    ]);

    const vendorId = vendorRes.data?.id ?? null;
    setIsVendor(!!vendorId);

    let vendorProductsCount = 0;
    let vendorCustomersCount = 0;
    let vendorOrdersCount = 0;
    let vendorOrders: OrderRow[] = [];

    if (vendorId) {
      const [vendorProductsRes, vendorOrdersRes, vendorCustomersRes, vendorOrdersCountRes] =
        await Promise.all([
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorId)
          .is("deleted_at", null),
        supabase
          .from("orders")
          .select("id, order_number, total_amount, currency, status, created_at")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("buyer_id", { count: "exact", head: true })
          .eq("vendor_id", vendorId),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorId),
      ]);
      vendorProductsCount = vendorProductsRes.count ?? 0;
      vendorCustomersCount = vendorCustomersRes.count ?? 0;
      vendorOrdersCount = vendorOrdersCountRes.count ?? 0;
      vendorOrders = (vendorOrdersRes.data ?? []) as OrderRow[];
    }

    const txs = (txRes.data ?? []) as TxRow[];
    const chartEnd = new Date();
    const chartStart = subDays(chartEnd, rangeDays - 1);
    const range = eachDayOfInterval({
      start: startOfDay(chartStart),
      end: startOfDay(chartEnd),
    });
    const labels = range.map((d) => format(d, "MMM d"));

    const buckets: Record<string, { marketplace: number; communities: number }> = {};
    for (const label of labels) buckets[label] = { marketplace: 0, communities: 0 };
    for (const tx of txs) {
      if (tx.direction !== "credit") continue;
      const key = format(new Date(tx.created_at), "MMM d");
      if (!(key in buckets)) continue;
      const bucket = classifyTx(tx.type);
      if (bucket === "marketplace" || bucket === "communities") {
        buckets[key][bucket] += Number(tx.amount);
      }
    }

    const realDatasets: EarningsDataset[] = (
      [
        { key: "marketplace" as const, label: "Revenue", color: "#3b82f6" },
        { key: "communities" as const, label: "Communities", color: "#30a46c" },
      ] as const
    ).map(({ key, label, color }) => {
      const data = labels.map((l) => buckets[l][key]);
      const total = data.reduce((s, v) => s + v, 0);
      return {
        label,
        data,
        color,
        amount: formatMoney(total, "USD"),
      };
    });

    const w = walletRes.data as WalletRow | null;
    const spark = (b: "marketplace" | "communities") => buildSparkline(txs, b);
    const displayOrders = vendorId ? vendorOrders : ((ordersRes.data ?? []) as OrderRow[]);
    const displayOrdersCount = vendorId ? vendorOrdersCount : (ordersCountRes.count ?? 0);
    const displayProductsCount = vendorId ? vendorProductsCount : (productsRes.data ?? []).length;

    const cards: StatCard[] = [
      {
        label: "Revenue",
        value: formatMoney(w?.total_earned ?? 0, "USD"),
        change: w?.pending_balance
          ? `${formatMoney(w.pending_balance, "USD")} pending`
          : "No pending",
        up: true,
        chartColor: "#3b82f6",
        data: spark("marketplace"),
      },
      {
        label: "Orders",
        value: String(displayOrdersCount),
        change: vendorId ? "Store orders" : "Your purchases",
        up: true,
        chartColor: "var(--color-accent)",
        data: spark("marketplace"),
      },
      {
        label: "Products",
        value: String(displayProductsCount),
        change: vendorId ? "Active listings" : "Trending picks",
        up: true,
        chartColor: "#8b5cf6",
        data: spark("marketplace"),
      },
      {
        label: "Customers",
        value: vendorId ? String(vendorCustomersCount) : String((membershipsRes.data ?? []).length),
        change: vendorId ? "Unique buyers" : "Communities joined",
        up: true,
        chartColor: "#30a46c",
        data: spark("communities"),
      },
    ];

    const allNotifs = (notifsRes.data ?? []) as NotifRow[];
    const activity = allNotifs.map((n) => notifToActivity(n));

    const buyerConvs = buyerConvsRes.data ?? [];
    const convIds = buyerConvs.map((c: { id: string }) => c.id);
    const lastByConv: Record<string, { body: string; created_at: string }> = {};

    if (convIds.length > 0) {
      const { data: convMsgs } = await supabase
        .from("conversation_messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      for (const m of convMsgs ?? []) {
        if (!lastByConv[m.conversation_id]) {
          lastByConv[m.conversation_id] = {
            body: m.body ?? "",
            created_at: m.created_at,
          };
        }
      }
    }

    const mappedMessages: DashboardMessagePreview[] = buyerConvs.map(
      (c: {
        id: string;
        updated_at: string;
        vendors:
          | { business_name: string; business_logo: string | null }
          | { business_name: string; business_logo: string | null }[]
          | null;
      }) => {
        const v = Array.isArray(c.vendors) ? c.vendors[0] : c.vendors;
        const name = v?.business_name ?? "Store";
        const last = lastByConv[c.id];
        const hue = name.charCodeAt(0) % 360;
        return {
          id: c.id,
          name,
          preview: last?.body?.slice(0, 72) || "No messages yet",
          time: last ? timeAgo(last.created_at) : timeAgo(c.updated_at),
          avatarUrl: v?.business_logo ?? null,
          initials: name.slice(0, 2).toUpperCase(),
          color: `hsl(${hue}, 55%, 42%)`,
          href: `/dashboard/messages?conversation=${c.id}`,
        };
      }
    );

    const rawProducts = (productsRes.data ?? []) as unknown as ProductRow[];
    const mappedProducts: Product[] = rawProducts.map((p) => {
      const imgUrl = getProductImage(p.images);
      const displayPrice = p.price_usd > 0 ? p.price_usd : p.price;
      const hue = p.name.charCodeAt(0) % 360;
      return {
        id: p.id,
        slug: p.slug ?? null,
        name: p.name,
        category: p.product_categories?.name ?? "General",
        price: formatMoney(displayPrice, p.currency ?? "USD"),
        commission: `${p.sale_count} sold`,
        sold: `${p.sale_count} sold`,
        saleCount: p.sale_count,
        priceValue: displayPrice,
        imageUrl: imgUrl,
        imageColor: `hsl(${hue},65%,45%)`,
      };
    });

    const rawMemberships = (membershipsRes.data ?? []) as unknown as CommunityMembershipRow[];
    const mappedCommunities: Community[] = rawMemberships
      .filter((m) => m.communities)
      .map((m) => {
        const c = m.communities;
        const hue = c.name.charCodeAt(0) % 360;
        return {
          id: c.id,
          slug: c.slug ?? null,
          name: c.name,
          initial: c.name[0]?.toUpperCase() ?? "C",
          color: `hsl(${hue},65%,45%)`,
          members: c.member_count?.toLocaleString() ?? "0",
          online: "",
          lastMessage: "",
          time: "",
          unread: 0,
          avatarUrl: c.avatar_url || "",
        };
      });

    if (vendorId) {
      const { data: inventoryProducts } = await supabase
        .from("products")
        .select(
          "id, name, slug, sku, price, currency, status, inventory_quantity, track_inventory, is_digital, images"
        )
        .eq("vendor_id", vendorId)
        .is("deleted_at", null)
        .order("sale_count", { ascending: false })
        .limit(8);

      setStockRows(
        (inventoryProducts ?? []).map(
          (p: {
            id: string;
            name: string;
            slug: string | null;
            sku?: string | null;
            price: number;
            currency?: string | null;
            status: string;
            inventory_quantity?: number | null;
            track_inventory?: boolean | null;
            is_digital?: boolean | null;
            images?: unknown;
          }) => {
            const hue = p.name.charCodeAt(0) % 360;
            return mapProductToStockRow(
              {
                ...p,
                imageUrl: getProductImage(p.images),
                imageColor: `hsl(${hue}, 55%, 45%)`,
              },
              formatMoney
            );
          }
        )
      );
    } else {
      setStockRows([]);
    }

    setProfile(profileRes.data ?? null);
    setWallet(w);
    setStatCards(cards);
    setActivityItems(activity);
    setProducts(mappedProducts);
    setCommunities(mappedCommunities);
    setRecentOrders(displayOrders);
    setEarningsLabels(labels);
    setEarningsDatasets(realDatasets);
    setDashboardMessages(mappedMessages);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [supabase, formatMoney, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "there";
  const totalEarned = wallet?.total_earned ?? 0;
  const totalEarnedFormatted = formatMoney(totalEarned, "USD");

  const heroSub = statCards.slice(1);

  return (
    <div className="min-h-screen bg-bg font-[family-name:var(--font-family-body)]">
      <DashboardPage className="px-2 sm:px-0">
        {loading ? (
          <div className="space-y-5">
            <div className="h-[200px] animate-pulse rounded-2xl bg-[var(--color-surface-secondary)]" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[108px] animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
                />
              ))}
            </div>
            <DashboardGridSkeleton />
          </div>
        ) : (
        <>
        {/* ─── Earnings Hero ─── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0804] via-[#2a1508] to-[#4d2000] p-6 sm:p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white/50">
                  Dashboard
                </p>
                <h1 className="mt-1 text-sm font-semibold text-white/80">
                  Welcome back, {displayName}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5">
                  <RefreshCw
                    className={`size-3 text-white/60 ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span className="text-xs font-medium text-white/50">
                    {lastUpdated ? timeAgo(lastUpdated.toISOString()) : "Loading"}
                  </span>
                </div>
                <Link
                  href="/dashboard/products/add"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 text-xs font-bold text-white transition-all hover:bg-[#e84800] active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Product
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-6 sm:gap-10">
              <div>
                <p className="text-xs font-medium text-white/50">Total earnings</p>
                <p className="mt-1 text-3xl font-black text-white sm:text-4xl leading-none font-[family-name:var(--font-family-display)]">
                  {totalEarnedFormatted}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 pb-1">
                {heroSub.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 min-w-[80px]"
                  >
                    <p className="text-lg font-bold leading-none text-white tabular-nums">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-white/50">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <KpiCards cards={statCards} className="mt-5" />

        {/* ─── Chart toolbar ─── */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[var(--color-accent)]" />
            <span className="text-sm font-bold text-[var(--color-text-primary)]">Revenue</span>
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="h-7 appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-2.5 pr-6 text-xs font-medium text-[var(--color-text-secondary)] outline-none cursor-pointer hover:border-[var(--color-border-strong)] transition-colors"
              >
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
                <option value="30d">30 days</option>
                <option value="all">All time</option>
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {lastUpdated && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Updated {timeAgo(lastUpdated.toISOString())}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="mt-1 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <RevenueChart
              labels={earningsLabels}
              datasets={earningsDatasets}
            />
          </div>

          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
            <ActivityFeed items={activityItems} />

            {dashboardMessages.length > 0 && (
              <DashboardPanel className="p-0">
                <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    Messages
                  </p>
                </div>
                <ul className="divide-y divide-[var(--color-border)]">
                  {dashboardMessages.slice(0, 3).map((msg) => (
                    <li key={msg.id}>
                      <Link
                        href={msg.href ?? ""}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-secondary)]/40 transition-colors"
                      >
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                          style={{ background: msg.color }}
                        >
                          {msg.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {msg.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {msg.preview}
                          </p>
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                          {msg.time}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard/messages"
                  className="block px-5 py-2.5 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)]/40 transition-colors text-center"
                >
                  All messages
                </Link>
              </DashboardPanel>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <TopProducts products={products} />
          </div>
          <div className="lg:col-span-5 xl:col-span-4" />
        </div>

        <div className="mt-8">
          <QuickActionsStrip actions={QUICK_ACTIONS} compact />
        </div>
        </>
        )}
      </DashboardPage>

      {/* ─── Floating AI button ─── */}
      <FloatingAIButton />
    </div>
  );
}

// ─── Floating AI Button ───────────────────────────────────────────────────────

function FloatingAIButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[340px] sm:w-[380px]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <div className="p-4 max-h-[420px] overflow-y-auto">
              <LazyAIPanel compact />
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex size-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#ff8c42] text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="Toggle AI Assistant"
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </button>
    </>
  );
}
