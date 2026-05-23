"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useCurrency } from "@/context/CurrencyContext";

import { LiveTicker } from "@/components/dashboard/LiveTicker";
import { HeroStatsRow } from "@/components/dashboard/HeroStatsRow";
import { FeaturedCampaignBanner } from "@/components/dashboard/FeaturedCampaignBanner";
import { StatCardsRow } from "@/components/dashboard/StatCardsRow";
import { EarningsOverview } from "@/components/dashboard/EarningsOverview";
import type { EarningsDataset } from "@/components/dashboard/EarningsOverview";
import { QuickActionsStrip } from "@/components/dashboard/QuickActionsStrip";
import { TopCampaigns } from "@/components/dashboard/TopCampaigns";
import { TrendingProducts } from "@/components/dashboard/TrendingProducts";
import { YourCommunities } from "@/components/dashboard/YourCommunities";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import type {
  TrendingCampaignItem,
  RecommendedCreator,
  RecentSearchItem,
} from "@/components/dashboard/DashboardSidebar";

import type {
  StatCard,
  ActivityItem,
  Campaign,
  Product,
  Community,
} from "@/types/dashboard";
import { TICKER_ITEMS, QUICK_ACTIONS } from "@/data/dashboard";

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

interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  campaign_type: string;
  rate_per_1k_views: number;
  fixed_rate: number;
  payment_model: string;
  submission_count: number;
  total_budget: number;
  ends_at: string | null;
  ugc_campaign_media: { url: string; type: string; usage: string }[];
  vendors: { business_name: string; business_logo: string | null } | null;
  ugc_campaign_participants: {
    influencers: {
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    } | null;
  }[];
}

interface ProductRow {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  currency: string;
  affiliate_commission_rate: number | null;
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

type SidebarCampaignRow = {
  id: string;
  title: string;
  fixed_rate: number;
  rate_per_1k_views: number;
  payment_model: string;
  submission_count: number;
  ugc_campaign_media: { url: string; type: string; usage: string }[] | null;
};

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

// Robust extraction for products.images (Json? — could be string[], object[], or stringified)
function getProductImage(images: unknown): string | null {
  if (!images) return null;

  if (typeof images === "string") {
    if (images.startsWith("http")) return images;
    try {
      const parsed = JSON.parse(images);
      return getProductImage(parsed);
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

function classifyTx(
  type: string
): "affiliate" | "ugc" | "marketplace" | "communities" {
  const t = type.toLowerCase();
  if (t.includes("affiliate") || t.includes("link")) return "affiliate";
  if (t.includes("ugc") || t.includes("influencer") || t.includes("creator")) return "ugc";
  if (t.includes("community")) return "communities";
  return "marketplace";
}

function buildSparkline(
  txs: TxRow[],
  bucket: "affiliate" | "ugc" | "marketplace" | "communities",
  days = 8
): number[] {
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
    affiliate: { icon: "sale", iconBg: "#e9f9ef" },
    order: { icon: "check", iconBg: "#ede9ff" },
    influencer: { icon: "check", iconBg: "#ede9ff" },
    community: { icon: "member", iconBg: "#f0f4ff" },
    system: { icon: "payout", iconBg: "#fff3ee" },
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-secondary ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient();
  const { formatMoney } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null>(null);
  const [, setWallet] = useState<WalletRow | null>(null);
  const [statCards, setStatCards] = useState<StatCard[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [featuredCampaign, setFeaturedCampaign] = useState<CampaignRow | null>(null);
  const [earnedToday, setEarnedToday] = useState(0);
  const [activeLinks, setActiveLinks] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [earningsTotal, setEarningsTotal] = useState<number | undefined>(undefined);
  const [earningsLabels, setEarningsLabels] = useState<string[] | undefined>(undefined);
  const [earningsDatasets, setEarningsDatasets] = useState<EarningsDataset[] | undefined>(undefined);
  const [earnedTrend, setEarnedTrend] = useState<string>("vs yesterday");
  const [campaignsTrend, setCampaignsTrend] = useState<string>("UGC campaigns");
  const [linksTrend, setLinksTrend] = useState<string>("active links");
  const [sidebarCampaigns, setSidebarCampaigns] = useState<TrendingCampaignItem[]>([]);
  const [sidebarCreators, setSidebarCreators] = useState<RecommendedCreator[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

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
    const todayStart = startOfDay(new Date()).toISOString();
    const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();

    const [
      profileRes,
      walletRes,
      txRes,
      txTodayRes,
      txYesterdayRes,
      notifsRes,
      campaignsRes,
      productsRes,
      membershipsRes,
      affiliateRes,
      influencerRes,
      trendingCampsRes,
      creatorsRes,
      searchesRes,
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
        .from("transactions")
        .select("amount, direction")
        .eq("user_id", userId)
        .gte("created_at", todayStart)
        .eq("direction", "credit"),
      supabase
        .from("transactions")
        .select("amount, direction")
        .eq("user_id", userId)
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart)
        .eq("direction", "credit"),
      supabase
        .from("notifications")
        .select("id, type, title, message, is_read, created_at, action_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("ugc_campaigns")
        .select(
          `
          id,
          title,
          description,
          campaign_type,
          rate_per_1k_views,
          fixed_rate,
          payment_model,
          submission_count,
          total_budget,
          ends_at,
          ugc_campaign_media(url, type, usage),
          vendors(business_name, business_logo),
          ugc_campaign_participants(
            influencers(
              profiles(full_name, avatar_url)
            )
          )
        `
        )
        .eq("status", "active")
        .order("submission_count", { ascending: false })
        .limit(3),
      supabase
        .from("products")
        .select(
          "id, slug, name, price, currency, affiliate_commission_rate, sale_count, images, product_categories(name), price_usd"
        )
        .eq("status", "active")
        .eq("is_active", true)
        .order("sale_count", { ascending: false })
        .limit(3),
      supabase
        .from("community_memberships")
        .select(
          "community_id, communities(id, name, avatar_url, member_count, slug)"
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(3),
      supabase.from("affiliates").select("id").eq("user_id", userId).single(),
      supabase.from("influencers").select("id").eq("user_id", userId).single(),
      supabase
        .from("ugc_campaigns")
        .select(`
          id,
          title,
          fixed_rate,
          rate_per_1k_views,
          payment_model,
          submission_count,
          ugc_campaign_media(url, type, usage)
        `)
        .eq("status", "active")
        .order("submission_count", { ascending: false })
        .limit(3),
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .neq("id", userId)
        .limit(3),
      supabase
        .from("search_history")
        .select("query, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Active links count
    let linksCount = 0;
    if (!affiliateRes.error && affiliateRes.data) {
      const { count } = await supabase
        .from("affiliate_links")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateRes.data.id)
        .eq("is_active", true);
      linksCount = count ?? 0;
    }

    // Campaigns joined count
    let campCount = 0;
    if (!influencerRes.error && influencerRes.data) {
      const { count } = await supabase
        .from("ugc_campaign_participants")
        .select("id", { count: "exact", head: true })
        .eq("influencer_id", influencerRes.data.id)
        .eq("status", "accepted");
      campCount = count ?? 0;
    }

    const txs = (txRes.data ?? []) as TxRow[];

    // ─ Build earnings chart data ─
    const days = 14;
    const chartEnd = new Date();
    const chartStart = subDays(chartEnd, days - 1);
    const range = eachDayOfInterval({
      start: startOfDay(chartStart),
      end: startOfDay(chartEnd),
    });
    const labels = range.map((d) => format(d, "MMM d"));

    const buckets: Record<string, { affiliate: number; ugc: number; marketplace: number; communities: number }> = {};
    for (const label of labels)
      buckets[label] = { affiliate: 0, ugc: 0, marketplace: 0, communities: 0 };
    for (const tx of txs) {
      if (tx.direction !== "credit") continue;
      const key = format(new Date(tx.created_at), "MMM d");
      if (!(key in buckets)) continue;
      buckets[key][classifyTx(tx.type)] += Number(tx.amount);
    }

    const CHART_COLORS = {
      affiliate: "#fd5000",
      ugc: "#8b5cf6",
      marketplace: "#3b82f6",
      communities: "#30a46c",
    };
    const CHART_LABELS_MAP: Record<string, string> = {
      affiliate: "Affiliate",
      ugc: "UGC",
      marketplace: "Marketplace",
      communities: "Communities",
    };
    const realDatasets: EarningsDataset[] = (
      ["affiliate", "ugc", "marketplace", "communities"] as const
    ).map((bucket) => {
      const data = labels.map((l) => buckets[l][bucket]);
      const total = data.reduce((s, v) => s + v, 0);
      return {
        label: CHART_LABELS_MAP[bucket],
        data,
        color: CHART_COLORS[bucket],
        amount: formatMoney(total, "USD"),
      };
    });
    const realTotal = realDatasets.reduce(
      (s, d) => s + d.data.reduce((a, b) => a + b, 0),
      0
    );

    // Earned today
    const todayEarned = (txTodayRes.data ?? []).reduce(
      (s: number, r: { amount: number; direction: string }) =>
        s + Number(r.amount),
      0
    );

    // Real trend calculations
    const yesterdayEarned = (txYesterdayRes.data ?? []).reduce(
      (s: number, r: { amount: number; direction: string }) =>
        s + Number(r.amount),
      0
    );
    const earnPctRaw =
      yesterdayEarned > 0
        ? ((todayEarned - yesterdayEarned) / yesterdayEarned) * 100
        : todayEarned > 0
          ? 100
          : 0;
    const earnPct = Math.abs(Math.round(earnPctRaw));
    const earnUp = earnPctRaw >= 0;
    const realEarnedTrend = `${earnPct}% vs yesterday`;

    const realCampaignsTrend =
      campCount > 0 ? `${campCount} campaigns joined` : "No campaigns yet";
    const realLinksTrend =
      linksCount > 0 ? `${linksCount} active links` : "No active links";

    // Stat cards with real sparklines
    const spark = (b: "affiliate" | "ugc" | "marketplace" | "communities") =>
      buildSparkline(txs, b);
    const w = walletRes.data as WalletRow | null;

    const cards: StatCard[] = [
      {
        label: "Available Balance",
        value: formatMoney(w?.available_balance ?? 0, "USD"),
        change: w?.pending_balance
          ? `${formatMoney(w.pending_balance, "USD")} pending`
          : "No pending",
        up: true,
        chartColor: "#fd5000",
        data: spark("affiliate"),
      },
      {
        label: "Active Links",
        value: linksCount.toString(),
        change: "generating clicks",
        up: true,
        chartColor: "#8b5cf6",
        data: spark("affiliate"),
      },
      {
        label: "Campaigns Joined",
        value: campCount.toString(),
        change: "UGC campaigns",
        up: true,
        chartColor: "#3b82f6",
        data: spark("ugc"),
      },
      {
        label: "Total Earned",
        value: formatMoney(w?.total_earned ?? 0, "USD"),
        change: "all time",
        up: true,
        chartColor: "#30a46c",
        data: spark("marketplace"),
      },
    ];

    // Activity items
    const activity = (notifsRes.data ?? []).map((n: any) =>
      notifToActivity(n as NotifRow)
    );

    // ─ Campaigns mapping (for the bottom TopCampaigns card) ─
    console.log(campaignsRes);

    const rawCampaigns = (campaignsRes.data ?? []) as unknown as CampaignRow[];
    const mappedCampaigns: Campaign[] = rawCampaigns.map((c) => {
      const img = c.ugc_campaign_media?.find((m) => m.type === "image");
      const earnStr =
        c.payment_model === "per_views"
          ? `${formatMoney(c.rate_per_1k_views, "USD")}/1k`
          : formatMoney(c.fixed_rate, "USD");
      const ratePerSubmission =
        c.payment_model === "per_views" ? null : c.fixed_rate || null;
      const totalSpots =
        ratePerSubmission && ratePerSubmission > 0
          ? Math.floor(c.total_budget / ratePerSubmission)
          : null;
      const budgetPct =
        totalSpots && totalSpots > 0
          ? Math.min(100, Math.round((c.submission_count / totalSpots) * 100))
          : 0;
      const hue = c.title.charCodeAt(0) % 360;
      return {
        id: c.id,
        name: c.title,
        badges: [c.campaign_type.replace(/_/g, " ")],
        earn: earnStr,
        joined: c.submission_count,
        progress: budgetPct,
        imageUrl: img?.url ?? null,
        imageColor: `hsl(${hue},65%,35%)`,
        imageInitial: c.title[0]?.toUpperCase() ?? "C",
        endsAt: c.ends_at,
      };
    });

    // ─ Products mapping ─
    const rawProducts = (productsRes.data ?? []) as unknown as ProductRow[];
    const mappedProducts: Product[] = rawProducts.map((p) => {
      const imgUrl = getProductImage(p.images);
      const displayPrice = p.price_usd > 0 ? p.price_usd : p.price;
      const commission = p.affiliate_commission_rate ?? 0;
      const hue = p.name.charCodeAt(0) % 360;
      return {
        id: p.id,
        slug: p.slug ?? null,
        name: p.name,
        category: p.product_categories?.name ?? "General",
        price: formatMoney(displayPrice, p.currency ?? "USD"),
        commission:
          commission > 0 ? `${commission}% Commission` : "No commission",
        sold: `${p.sale_count} sold`,
        imageUrl: imgUrl,
        imageColor: `hsl(${hue},65%,45%)`,
      };
    });

    // ─ Communities mapping ─
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

    // ─ Sidebar: Trending Campaigns ─
    const BADGE_LABELS = ["Trending", "Hot", "New"];
    const BADGE_STYLES = [
      "bg-[#fff3ee] text-[#fd5000] dark:bg-[#200d00]",
      "bg-[#fff0f0] text-[#e5484d] dark:bg-[#2a1010] dark:text-[#f87171]",
      "bg-[#e9f9ef] text-[#1a7d4a] dark:bg-[#0d2e1c] dark:text-[#6ee7a0]",
    ];
    const mappedSidebarCampaigns: TrendingCampaignItem[] = (
      (trendingCampsRes.data ?? []) as SidebarCampaignRow[]
    ).map((c, i) => {
      const cover = c.ugc_campaign_media?.find((m) => m.type === "image")?.url ?? null;
      return {
        name: c.title,
        earn: c.payment_model === "per_views"
          ? `Earn ${formatMoney(c.rate_per_1k_views, "USD")}/1k views`
          : `Earn up to ${formatMoney(c.fixed_rate, "USD")}`,
        badge: BADGE_LABELS[i % 3],
        badgeCls: BADGE_STYLES[i % 3],
        href: `/ugc/${c.id}`,
        imageUrl: cover,
      };
    });

    // ─ Sidebar: Recommended Creators ─
    const CREATOR_COLORS = ["#fd5000", "#3b82f6", "#8b5cf6"];
    const CREATOR_BADGES = ["Top Creator", "Rising Star", "UGC Expert"];
    const mappedCreators: RecommendedCreator[] = (
      (creatorsRes.data ?? []) as {
        id: string;
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }[]
    ).map((p, i) => {
      const name = p.full_name ?? p.username ?? "Creator";
      return {
        initials: name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        name,
        badge: CREATOR_BADGES[i % 3],
        color: CREATOR_COLORS[i % 3],
        avatarUrl: p.avatar_url ?? null,
        username: p.username ?? null,
        href: p.username ? `/u/${p.username}` : `/creators/${p.id}`,
      };
    });

    // ─ Sidebar: Recent Searches ─
    const mappedSearches: RecentSearchItem[] = (
      (searchesRes.data ?? []) as { query: string }[]
    ).map((s) => ({ text: s.query }));

    setSidebarCampaigns(mappedSidebarCampaigns);
    setSidebarCreators(mappedCreators);
    setRecentSearches(mappedSearches);

    setProfile(profileRes.data ?? null);
    setWallet(w);
    setStatCards(cards);
    setActivityItems(activity);
    setCampaigns(mappedCampaigns);
    setProducts(mappedProducts);
    setCommunities(mappedCommunities);
    setFeaturedCampaign(rawCampaigns[0] ?? null);
    setEarnedToday(todayEarned);
    setActiveLinks(linksCount);
    setCampaignsCount(campCount);
    setEarningsTotal(realTotal);
    setEarningsLabels(labels);
    setEarningsDatasets(realDatasets);
    setEarnedTrend(`${earnUp ? "↑" : "↓"} ${realEarnedTrend}`);
    setCampaignsTrend(realCampaignsTrend);
    setLinksTrend(realLinksTrend);
    setLoading(false);
  }, [supabase, formatMoney]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName =
    profile?.full_name ?? profile?.email?.split("@")[0] ?? "there";

  // ─ Derive featured campaign props from the real row ─
  const featuredProps = featuredCampaign
    ? (() => {
      const realParticipants = (
        featuredCampaign.ugc_campaign_participants ?? []
      )
        .map((p) => p.influencers?.profiles)
        .filter(
          (p): p is { full_name: string | null; avatar_url: string | null } => !!p
        )
        .slice(0, 4)
        .map((p, i) => {
          const name = p.full_name ?? "Creator";
          const initials =
            name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "C";
          const palette = ["#fd5000", "#8b5cf6", "#3b82f6", "#30a46c"];
          return {
            initials,
            color: palette[i % palette.length],
            avatarUrl: p.avatar_url,
          };
        });

      const ratePerSubmission =
        featuredCampaign.payment_model === "per_views"
          ? null
          : featuredCampaign.fixed_rate || null;
      const totalSpots =
        ratePerSubmission && ratePerSubmission > 0
          ? Math.floor(featuredCampaign.total_budget / ratePerSubmission)
          : null;
      const spotsLeft =
        totalSpots !== null
          ? Math.max(0, totalSpots - featuredCampaign.submission_count)
          : null;

      const alreadyPaidNumber =
        featuredCampaign.payment_model === "per_views"
          ? null
          : featuredCampaign.submission_count * featuredCampaign.fixed_rate;

      return {
        title: featuredCampaign.title,
        description: featuredCampaign.description,
        campaignType: featuredCampaign.campaign_type,
        paymentModel: featuredCampaign.payment_model as
          | "per_views"
          | "fixed_rate",
        brandName: featuredCampaign.vendors?.business_name ?? null,
        brandLogo: featuredCampaign.vendors?.business_logo ?? null,
        creatorsJoined: featuredCampaign.submission_count,
        spotsLeft,
        alreadyPaid:
          alreadyPaidNumber !== null
            ? formatMoney(alreadyPaidNumber, "USD")
            : null,
        earnUpTo:
          featuredCampaign.payment_model === "per_views"
            ? `${formatMoney(featuredCampaign.rate_per_1k_views, "USD")}/1k`
            : formatMoney(featuredCampaign.fixed_rate, "USD"),
        participants: realParticipants,
        extraCount: Math.max(
          0,
          featuredCampaign.submission_count - realParticipants.length
        ),
        coverImage:
          featuredCampaign.ugc_campaign_media?.find((m) => m.type === "image")
            ?.url ?? null,
        endsAt: featuredCampaign.ends_at,
        href: `/ugc/${featuredCampaign.id}`,
      };
    })()
    : null;

  return (
    <div className="min-h-screen bg-bg font-[family-name:var(--font-dm-sans)]">
      {/* ── Live ticker ── */}
      <LiveTicker items={TICKER_ITEMS} onlineCount={8447} />

      {/* ── Main scroll area ── */}
      <div className=" px-2 sm:px-6 py-6 max-w-[1400px] mx-auto">
        {/* Welcome header */}
        <div className="mb-5 flex items-center gap-4">
          {loading ? (
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          ) : profile?.avatar_url && profile.avatar_url.trim() ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-border"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg border-2 border-border"
              style={{ background: "#fd5000" }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            {loading ? (
              <Skeleton className="h-8 w-64 mb-2" />
            ) : (
              <h1 className="text-[26px] font-extrabold tracking-tight text-text-primary">
                Welcome back, {displayName}! 👋
              </h1>
            )}
            <p className="text-[14px] text-text-muted mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Hero quick-stats */}
        <HeroStatsRow
          earnedToday={loading ? "..." : `${formatMoney(earnedToday, "USD")} today`}
          newCampaigns={campaignsCount}
          affiliateClicks={activeLinks}
          xpCurrent={320}
          xpMax={500}
          level={4}
          earnedTrend={earnedTrend}
          campaignsTrend={campaignsTrend}
          linksTrend={linksTrend}
          sparkEarned={earningsDatasets?.[0]?.data}
          sparkCampaigns={earningsDatasets?.[1]?.data}
          sparkLinks={earningsDatasets?.[0]?.data}
        />

        {/* Two-column layout */}
        <div className="flex flex-col xl:grid xl:grid-cols-[1fr_320px] gap-5">
          {/* ── Left / main column ── */}
          <div className="flex flex-col gap-5">
            {/* Featured campaign hero */}
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : featuredProps ? (
              <FeaturedCampaignBanner {...featuredProps} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-text-muted text-sm">
                No active campaigns right now.{" "}
                <Link href="/ugc" className="text-[#fd5000] font-semibold">
                  Browse campaigns →
                </Link>
              </div>
            )}

            {/* Stat cards */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <StatCardsRow cards={statCards} />
            )}

            {/* Earnings chart */}
            <EarningsOverview
              labels={earningsLabels}
              datasets={earningsDatasets}
              totalEarnings={earningsTotal}
            />
          </div>

          <DashboardSidebar
            activityItems={activityItems}
            trendingCampaigns={sidebarCampaigns}
            recommendedCreators={sidebarCreators}
            recentSearches={recentSearches}
          />
        </div>

        <div className="mt-10 space-y-5">
          <QuickActionsStrip actions={QUICK_ACTIONS} />

          {/* Bottom 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <>
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </>
            ) : (
              <>
                <TopCampaigns campaigns={campaigns} />
                <TrendingProducts products={products} />
                <YourCommunities communities={communities} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}