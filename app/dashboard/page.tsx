"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";
import { PageHeader } from "@/components/ui/admin";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { Settings, BarChart3 } from "lucide-react";
import type { EarningsDataset } from "@/types/dashboard";
import { QuickActionsStrip } from "@/components/dashboard/QuickActionsStrip";
import { WorkspaceHeroCards, type WorkspaceCardStats } from "@/components/workspace/WorkspaceHeroCards";
import { MissionControlSummaries } from "@/components/dashboard/MissionControlSummaries";
import {
  DashboardMessagesPanel,
  type DashboardMessagePreview,
} from "@/components/dashboard/DashboardMessagesPanel";
import { mapProductToStockRow, type StockQuantityRow } from "@/components/dashboard/StockQuantityTable";
import {
  DashboardEmptyState,
  DashboardPanel,
  DashboardSectionHeader,
  SECTION_LINKS,
} from "@/components/dashboard/dashboard-sections";
import {
  DashboardStatSkeleton,
  DashboardGridSkeleton,
} from "@/components/dashboard/dashboard-skeleton";

import type { StatCard, ActivityItem, Product, Community } from "@/types/dashboard";
import { QUICK_ACTIONS } from "@/data/dashboard";

const JimvioAIPanel = dynamic(
  () =>
    import("@/components/ui/jimvio-ai-panel").then((m) => ({
      default: m.JimvioAIPanel,
    })),
  {
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]" />
    ),
    ssr: false,
  }
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const supabase = createClient();
  const { formatMoney } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotifRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [earningsLabels, setEarningsLabels] = useState<string[]>([]);
  const [earningsDatasets, setEarningsDatasets] = useState<EarningsDataset[]>([]);
  const [dashboardMessages, setDashboardMessages] = useState<DashboardMessagePreview[]>([]);
  const [stockRows, setStockRows] = useState<StockQuantityRow[]>([]);
  const [isVendor, setIsVendor] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const userId = user.id;
    const since14 = subDays(new Date(), 14).toISOString();

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
        .gte("created_at", since14)
        .order("created_at", { ascending: true }),
      supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at, action_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
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
    const days = 14;
    const chartEnd = new Date();
    const chartStart = subDays(chartEnd, days - 1);
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
          : "All time",
        up: true,
        chartColor: "#3b82f6",
        data: spark("marketplace"),
      },
      {
        label: "Orders",
        value: String(displayOrdersCount),
        change: vendorId ? "Store orders" : "Your purchases",
        up: true,
        chartColor: "#fd5000",
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
    const activity = allNotifs.filter((n) => !n.is_read).map((n) => notifToActivity(n));
    const recentNotifications = allNotifs.slice(0, 5);

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
    setRecentNotifications(recentNotifications);
    setProducts(mappedProducts);
    setCommunities(mappedCommunities);
    setRecentOrders(displayOrders);
    setEarningsLabels(labels);
    setEarningsDatasets(realDatasets);
    setDashboardMessages(mappedMessages);
    setLoading(false);
  }, [supabase, formatMoney]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-bg font-[family-name:var(--font-dm-sans)]">
      <DashboardPage className="px-2 sm:px-0">
        <PageHeader
          eyebrow="Mission Control"
          title={loading ? "Loading…" : `Welcome back, ${displayName}`}
          subtitle="Your unified command center across all Jimvio workspaces."
          actions={
            <>
              <Link
                href="/dashboard/analytics"
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
            </>
          }
        />

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]"
              />
            ))}
          </div>
        ) : (
          <WorkspaceHeroCards
            className="mt-6"
            stats={{
              marketplace: {
                status: "Active",
                stat: String(recentOrders.length),
                statLabel: "Recent orders",
                recentActivity:
                  recentOrders[0]?.order_number
                    ? `Latest order #${recentOrders[0].order_number}`
                    : "Browse the marketplace",
              },
              communities: {
                status: "Connected",
                stat: String(communities.length),
                statLabel: "Communities",
                recentActivity:
                  communities[0]?.name
                    ? `Active in ${communities[0].name}`
                    : "Explore communities",
              },
              affiliates: {
                status: "Ready",
                stat: wallet
                  ? formatMoney(Number(wallet.available_balance ?? 0), "USD")
                  : "—",
                statLabel: "Available balance",
                recentActivity: "Promote products and earn",
              },
              ugc: {
                status: "Open",
                stat:
                  activityItems.filter((a) => a.title.toLowerCase().includes("campaign")).length > 0
                    ? String(
                        activityItems.filter((a) => a.title.toLowerCase().includes("campaign")).length
                      )
                    : "—",
                statLabel: "Campaign activity",
                recentActivity: "Discover creator campaigns",
              },
            } satisfies WorkspaceCardStats}
          />
        )}

        {loading ? (
          <DashboardStatSkeleton />
        ) : (
          <div className="mt-6">
            <MissionControlSummaries
              summaries={[
                {
                  id: "marketplace",
                  title: "Marketplace",
                  value: String(recentOrders.length),
                  sub: "Recent orders across your account",
                  href: "/marketplace",
                  accent: "#fd5000",
                },
                {
                  id: "community",
                  title: "Community",
                  value: String(communities.length),
                  sub: "Active memberships",
                  href: "/communities",
                  accent: "#7c3aed",
                },
                {
                  id: "revenue",
                  title: "Revenue",
                  value: wallet
                    ? formatMoney(Number(wallet.available_balance ?? 0), "USD")
                    : "—",
                  sub: "Available wallet balance",
                  href: "/dashboard/payments",
                  accent: "#0d9488",
                },
                {
                  id: "store",
                  title: "Store Health",
                  value: isVendor ? String(stockRows.length) : "—",
                  sub: isVendor ? "SKUs tracked in inventory" : "Activate seller account",
                  href: isVendor ? "/dashboard/vendor/store" : "/dashboard/activate/vendor",
                  accent: "#2563eb",
                },
              ]}
            />
          </div>
        )}

        {loading ? (
          <DashboardGridSkeleton />
        ) : (
        <>
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 flex flex-col gap-5">
            <section aria-label="Recent activity">
              <DashboardSectionHeader
                title="Recent Activity"
                href={SECTION_LINKS.notifications}
                linkLabel="All notifications"
              />
              <DashboardPanel>
                {activityItems.length === 0 ? (
                  <DashboardEmptyState
                    title="No recent activity"
                    description="Orders, messages, and updates will appear here."
                    href={SECTION_LINKS.marketplace}
                    linkLabel="Browse marketplace"
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {activityItems.map((item, i) => (
                      <li
                        key={`${item.title}-${i}`}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                            {item.sub}
                          </p>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                          {item.time}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>
            </section>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-5">
            <section aria-label="Messages">
              <DashboardMessagesPanel messages={dashboardMessages} />
            </section>

            <section aria-label="Notifications">
              <DashboardSectionHeader
                title="Notifications"
                href={SECTION_LINKS.notifications}
              />
              <DashboardPanel>
                {recentNotifications.length === 0 ? (
                  <DashboardEmptyState
                    title="You're all caught up"
                    description="New alerts will show up here."
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {recentNotifications.map((n) => (
                      <li key={n.id} className="px-4 py-3">
                        <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                          {timeAgo(n.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>
            </section>

            <section aria-label="Community overview">
              <DashboardSectionHeader
                title="Community Overview"
                href={SECTION_LINKS.communities}
              />
              <DashboardPanel>
                {communities.length === 0 ? (
                  <DashboardEmptyState
                    title="No communities yet"
                    description="Join or create a community to connect with your audience."
                    href="/communities"
                    linkLabel="Explore communities"
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {communities.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={c.slug ? `/communities/${c.slug}` : SECTION_LINKS.communities}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-secondary)] transition-colors"
                        >
                          <span
                            className="grid size-9 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: c.color }}
                          >
                            {c.initial}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {c.members} members
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>
            </section>
          </div>
        </div>
        </>
        )}

        <div className="mt-8 space-y-8 border-t border-[var(--color-border)] pt-8">
          <QuickActionsStrip actions={QUICK_ACTIONS} />

          <section aria-label="AI insights">
            <DashboardSectionHeader title="AI Insights" />
            <JimvioAIPanel />
          </section>
        </div>
      </DashboardPage>
    </div>
  );
}
