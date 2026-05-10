
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
    TrendingUp, Link2, Megaphone, Users, DollarSign,
    ShoppingBag, Plus, ChevronDown, Zap, BarChart3,
    Wallet, Package, Target, ArrowRight, Radio, Circle,
    Camera, FileText, ShoppingCart, Bell, Check,
    AlertCircle, Clock, Star, Flame,
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletRow {
    available_balance: number;
    pending_balance: number;
    total_earned: number;
}

interface TransactionRow {
    amount: number;
    type: string;
    direction: string;
    created_at: string;
}

interface CampaignRow {
    id: string;
    title: string;
    campaign_type: string;
    rate_per_1k_views: number;
    fixed_rate: number;
    payment_model: string;
    submission_count: number;
    total_budget: number;
    ends_at: string | null;
    ugc_campaign_media: { url: string; type: string; usage: string }[];
}

interface ProductRow {
    id: string;
    name: string;
    price: number;
    currency: string;
    affiliate_commission_rate: number | null;
    sale_count: number;
    images: { url: string }[] | string;
    product_categories: { name: string } | null;
    price_usd: number;
}

interface CommunityRow {
    community_id: string;
    communities: {
        id: string;
        name: string;
        avatar_url: string | null;
        member_count: number;
        slug: string;
    };
}

interface NotificationRow {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    action_url: string | null;
}

interface ChartPoint {
    date: string;
    affiliate: number;
    ugc: number;
    marketplace: number;
    communities: number;
}

interface DashData {
    profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
    wallet: WalletRow | null;
    activeLinksCount: number;
    campaignsCount: number;
    communitiesCount: number;
    unreadNotifications: number;
    chart: ChartPoint[];
    featuredCampaign: CampaignRow | null;
    campaigns: CampaignRow[];
    products: ProductRow[];
    communities: CommunityRow[];
    activity: NotificationRow[];
    streakDays: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyTransaction(type: string): keyof Omit<ChartPoint, "date"> {
    const t = type.toLowerCase();
    if (t.includes("affiliate") || t.includes("link")) return "affiliate";
    if (t.includes("ugc") || t.includes("influencer") || t.includes("creator")) return "ugc";
    if (t.includes("community")) return "communities";
    return "marketplace";
}

function buildChartData(transactions: TransactionRow[], days = 14): ChartPoint[] {
    const end = new Date();
    const start = subDays(end, days - 1);
    const range = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });

    const map: Record<string, ChartPoint> = {};
    for (const d of range) {
        const key = format(d, "MMM d");
        map[key] = { date: key, affiliate: 0, ugc: 0, marketplace: 0, communities: 0 };
    }

    for (const tx of transactions) {
        if (tx.direction !== "credit") continue;
        const key = format(new Date(tx.created_at), "MMM d");
        if (!map[key]) continue;
        const bucket = classifyTransaction(tx.type);
        map[key][bucket] += Number(tx.amount);
    }

    return Object.values(map);
}

function getProductImage(images: ProductRow["images"]): string | null {
    if (!images) return null;
    if (typeof images === "string") {
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) ? parsed[0]?.url ?? null : null;
        } catch {
            return null;
        }
    }
    if (Array.isArray(images)) return images[0]?.url ?? null;
    return null;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function notifIcon(type: string) {
    const map: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
        payment: { Icon: DollarSign, bg: "var(--color-success-light)", color: "var(--color-success)" },
        affiliate: { Icon: Link2, bg: "var(--color-accent-light)", color: "var(--color-accent)" },
        order: { Icon: ShoppingCart, bg: "var(--color-accent-light)", color: "var(--color-accent)" },
        influencer: { Icon: Camera, bg: "var(--color-warning-light)", color: "var(--color-warning)" },
        community: { Icon: Users, bg: "#ede9fe", color: "#7c3aed" },
        message: { Icon: Megaphone, bg: "#e0f2fe", color: "#0284c7" },
        system: { Icon: Bell, bg: "var(--color-surface-secondary)", color: "var(--color-text-muted)" },
        review: { Icon: Star, bg: "var(--color-warning-light)", color: "var(--color-warning)" },
    };
    return map[type] ?? map.system;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-lg ${className}`}
            style={{ backgroundColor: "var(--color-surface-secondary)" }}
        />
    );
}

// ─── MiniChart ────────────────────────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const pts = data.map((v, i) => ({ v, i }));
    return (
        <ResponsiveContainer width={72} height={32}>
            <AreaChart data={pts} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#spark-${color.replace("#", "")})`}
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JimvioDashboard() {
    const supabase = createClient();
    const { formatMoney } = useCurrency();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashData>({
        profile: null, wallet: null,
        activeLinksCount: 0, campaignsCount: 0, communitiesCount: 0,
        unreadNotifications: 0,
        chart: [], featuredCampaign: null,
        campaigns: [], products: [], communities: [],
        activity: [], streakDays: 0,
    });
    const [chartFilter, setChartFilter] = useState<"all" | "affiliate" | "ugc" | "marketplace" | "communities">("all");
    const [chartPeriod, setChartPeriod] = useState<14 | 30>(14);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const userId = user.id;
        const since = subDays(new Date(), chartPeriod).toISOString();

        const [
            profileRes, walletRes, txRes,
            linksRes, campaignPartsRes, membershipsCountRes,
            notifsUnreadRes, activeCampaignsRes, productsRes,
            membershipsRes, activityRes, affiliateRes, influencerRes,
        ] = await Promise.all([
            supabase.from("profiles").select("full_name, email, avatar_url").eq("id", userId).single(),
            supabase.from("wallets").select("available_balance, pending_balance, total_earned").eq("user_id", userId).single(),
            supabase.from("transactions").select("amount, type, direction, created_at").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: true }),
            supabase.from("affiliate_links").select("id", { count: "exact", head: true }).eq("is_active", true),
            supabase.from("ugc_campaign_participants").select("id", { count: "exact", head: true }).eq("status", "accepted"),
            supabase.from("community_memberships").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
            supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
            supabase.from("ugc_campaigns").select("id, title, campaign_type, rate_per_1k_views, fixed_rate, payment_model, submission_count, total_budget, ends_at, ugc_campaign_media(url, type, usage)").eq("status", "active").order("submission_count", { ascending: false }).limit(3),
            supabase.from("products").select("id, name, price, currency, affiliate_commission_rate, sale_count, images, product_categories(name), price_usd").eq("status", "active").eq("is_active", true).order("sale_count", { ascending: false }).limit(3),
            supabase.from("community_memberships").select("community_id, communities(id, name, avatar_url, member_count, slug)").eq("user_id", userId).eq("status", "active").limit(3),
            supabase.from("notifications").select("id, type, title, message, is_read, created_at, action_url").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
            supabase.from("affiliates").select("id").eq("user_id", userId).single(),
            supabase.from("influencers").select("id").eq("user_id", userId).single(),
        ]);

        // Filter affiliate links by affiliate id if possible
        let linksCount = 0;
        if (!affiliateRes.error && affiliateRes.data) {
            const { count } = await supabase.from("affiliate_links").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliateRes.data.id).eq("is_active", true);
            linksCount = count ?? 0;
        }

        let campaignsCount = 0;
        if (!influencerRes.error && influencerRes.data) {
            const { count } = await supabase.from("ugc_campaign_participants").select("id", { count: "exact", head: true }).eq("influencer_id", influencerRes.data.id).eq("status", "accepted");
            campaignsCount = count ?? 0;
        }

        const chart = buildChartData(txRes.data ?? [], chartPeriod);
        const campaigns = (activeCampaignsRes.data ?? []) as unknown as CampaignRow[];
        const products = (productsRes.data ?? []) as unknown as ProductRow[];
        const communities = (membershipsRes.data ?? []) as unknown as CommunityRow[];

        setData({
            profile: profileRes.data ?? null,
            wallet: walletRes.data ?? null,
            activeLinksCount: linksCount,
            campaignsCount,
            communitiesCount: membershipsCountRes.count ?? 0,
            unreadNotifications: notifsUnreadRes.count ?? 0,
            chart,
            featuredCampaign: campaigns[0] ?? null,
            campaigns,
            products,
            communities,
            activity: (activityRes.data ?? []) as NotificationRow[],
            streakDays: 4, // could be computed from daily activity
        });

        setLoading(false);
    }, [chartPeriod, supabase]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const { profile, wallet, activeLinksCount, campaignsCount, communitiesCount,
        unreadNotifications, chart, featuredCampaign, campaigns, products,
        communities, activity, streakDays } = data;

    const totalEarnings = chart.reduce((s, d) => s + d.affiliate + d.ugc + d.marketplace + d.communities, 0);
    const chartColors = { affiliate: "var(--color-accent)", ugc: "#818cf8", marketplace: "#38bdf8", communities: "#34d399" };

    const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "there";
    const initials = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase();

    // KPI spark data (last 7 points from chart)
    const sparkAffiliate = chart.slice(-7).map(d => d.affiliate);
    const sparkMarket = chart.slice(-7).map(d => d.marketplace);
    const sparkUgc = chart.slice(-7).map(d => d.ugc);
    const sparkComm = chart.slice(-7).map(d => d.communities);

    const kpis = [
        { label: "Available Balance", value: formatMoney(wallet?.available_balance ?? 0, "USD"), sub: `${formatMoney(wallet?.pending_balance ?? 0, "USD")} pending`, spark: sparkAffiliate, color: "var(--color-accent)", href: "/dashboard/wallet" },
        { label: "Active Links", value: activeLinksCount.toString(), sub: "generating clicks", spark: sparkMarket, color: "#818cf8", href: "/dashboard/links" },
        { label: "Campaigns Joined", value: campaignsCount.toString(), sub: "UGC campaigns", spark: sparkUgc, color: "#38bdf8", href: "/ugc" },
        { label: "Communities", value: communitiesCount.toString(), sub: "active memberships", spark: sparkComm, color: "#34d399", href: "/dashboard/communities" },
    ];

    const quickActions = [
        { label: "Create Affiliate Link", sub: "Promote any product", icon: Link2, href: "/dashboard/links/new", accent: false },
        { label: "Join Campaign", sub: "Earn with UGC content", icon: Megaphone, href: "/ugc", accent: false },
        { label: "Browse Products", sub: "Find items to promote", icon: ShoppingBag, href: "/marketplace", accent: false },
        { label: "Create Post", sub: "Share with your audience", icon: FileText, href: "/dashboard/create", accent: false },
        { label: "Withdraw Earnings", sub: "Move funds to your account", icon: Wallet, href: "/dashboard/withdrawals", accent: true },
    ];

    return (
        <div
            className="flex flex-1 min-h-0 overflow-hidden"
            style={{ backgroundColor: "var(--color-bg)" }}
        >
            {/* ── Main scrollable content ─────────────────────────────────────── */}
            <main
                id="main-content"
                className="flex-1 min-w-0 overflow-y-auto"
                style={{ scrollbarWidth: "thin" }}
            >
                <div className="p-5 space-y-5 max-w-[960px] mx-auto pb-10">

                    {/* Welcome row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1
                                className="text-2xl font-black"
                                style={{ color: "var(--color-text-primary)" }}
                            >
                                {loading ? "Welcome back!" : `Welcome back, ${displayName}! 👋`}
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                            </p>
                        </div>
                        {/* Streak pill */}
                        <div
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                            style={{
                                borderRadius: "var(--radius-full)",
                                backgroundColor: "var(--color-accent-light)",
                                border: "1px solid var(--color-accent-subtle)",
                                color: "var(--color-accent)",
                            }}
                        >
                            <Flame className="h-4 w-4" />
                            {streakDays} day streak
                        </div>
                    </div>

                    {/* ── KPI Cards ─────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {loading
                            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                            : kpis.map((kpi) => (
                                <Link
                                    key={kpi.label}
                                    href={kpi.href}
                                    className="block p-4"
                                    style={{
                                        borderRadius: "var(--radius-lg)",
                                        backgroundColor: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        boxShadow: "var(--shadow-sm)",
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                                                {kpi.label}
                                            </p>
                                            <p className="text-2xl font-black tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                                                {kpi.value}
                                            </p>
                                            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
                                                {kpi.sub}
                                            </p>
                                        </div>
                                        <MiniSparkline data={kpi.spark.length ? kpi.spark : [0, 0, 0, 0, 0, 0, 0]} color={kpi.color} />
                                    </div>
                                </Link>
                            ))}
                    </div>

                    {/* ── Featured Campaign Banner ──────────────────────────────────── */}
                    {!loading && featuredCampaign && (
                        <div
                            className="relative overflow-hidden"
                            style={{
                                borderRadius: "var(--radius-xl)",
                                minHeight: 200,
                                backgroundColor: "#0a0a0a",
                            }}
                        >
                            {/* Background image from campaign media */}
                            {(() => {
                                const banner = featuredCampaign.ugc_campaign_media?.find(m => m.usage === "banner" && m.type === "image");
                                const example = featuredCampaign.ugc_campaign_media?.find(m => m.type === "image");
                                const src = banner?.url ?? example?.url;
                                return src ? (
                                    <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
                                ) : null;
                            })()}
                            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.3))" }} />

                            <div className="relative z-10 p-5 flex items-end justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
                                            style={{ borderRadius: "var(--radius-full)", backgroundColor: "rgba(253,80,0,0.2)", color: "var(--color-accent)" }}
                                        >
                                            <Radio className="h-2.5 w-2.5" />
                                            TRENDING
                                        </span>
                                        <span
                                            className="text-[10px] font-semibold px-2 py-0.5"
                                            style={{ borderRadius: "var(--radius-full)", backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                                        >
                                            {featuredCampaign.campaign_type.replace("_", " ").toUpperCase()}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-black text-white mb-1">{featuredCampaign.title}</h2>
                                    <div className="flex items-center gap-6 mt-3">
                                        <div>
                                            <p className="text-lg font-black text-white">{featuredCampaign.submission_count}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>Submissions</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-white">
                                                {featuredCampaign.payment_model === "per_views"
                                                    ? `$${featuredCampaign.rate_per_1k_views}/1k views`
                                                    : `$${featuredCampaign.fixed_rate} flat`}
                                            </p>
                                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>Earn rate</p>
                                        </div>
                                        {featuredCampaign.ends_at && (
                                            <div>
                                                <p className="text-lg font-black text-white">
                                                    {Math.max(0, Math.ceil((new Date(featuredCampaign.ends_at).getTime() - Date.now()) / 86_400_000))}d
                                                </p>
                                                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>Days left</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    href={`/ugc/campaigns/${featuredCampaign.id}`}
                                    className="flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 flex-shrink-0"
                                    style={{
                                        borderRadius: "var(--radius-md)",
                                        backgroundColor: "var(--color-accent)",
                                    }}
                                >
                                    View Campaign <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* ── Earnings Chart ────────────────────────────────────────────── */}
                    <div
                        className="p-5"
                        style={{
                            borderRadius: "var(--radius-xl)",
                            backgroundColor: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-sm)",
                        }}
                    >
                        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>
                                    Total Earnings
                                </p>
                                {loading
                                    ? <Skeleton className="h-8 w-32" />
                                    : (
                                        <p className="text-2xl font-black" style={{ color: "var(--color-text-primary)" }}>
                                            {formatMoney(totalEarnings, "USD")}
                                            <span className="text-sm font-semibold ml-2" style={{ color: "var(--color-success)" }}>
                                                ↑ last {chartPeriod}d
                                            </span>
                                        </p>
                                    )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Filter pills */}
                                <div
                                    className="flex p-0.5"
                                    style={{ borderRadius: "var(--radius-md)", backgroundColor: "var(--color-surface-secondary)" }}
                                >
                                    {(["all", "affiliate", "ugc", "marketplace", "communities"] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setChartFilter(f)}
                                            className="px-2.5 py-1 text-[11px] font-bold capitalize"
                                            style={{
                                                borderRadius: "var(--radius-sm)",
                                                backgroundColor: chartFilter === f ? "var(--color-bg)" : "transparent",
                                                color: chartFilter === f ? "var(--color-text-primary)" : "var(--color-text-muted)",
                                                boxShadow: chartFilter === f ? "var(--shadow-sm)" : "none",
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>

                                {/* Period toggle */}
                                <button
                                    onClick={() => setChartPeriod(p => p === 14 ? 30 : 14)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold"
                                    style={{
                                        borderRadius: "var(--radius-md)",
                                        backgroundColor: "var(--color-surface-secondary)",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {chartPeriod}d <ChevronDown className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                            {Object.entries(chartColors).map(([key, color]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[11px] capitalize" style={{ color: "var(--color-text-muted)" }}>{key}</span>
                                </div>
                            ))}
                        </div>

                        {loading
                            ? <Skeleton className="h-48 w-full" />
                            : (
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                                            <defs>
                                                {Object.entries(chartColors).map(([key, color]) => (
                                                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    background: "var(--color-surface)",
                                                    border: "1px solid var(--color-border)",
                                                    borderRadius: "var(--radius-md)",
                                                    fontSize: 12,
                                                    color: "var(--color-text-primary)",
                                                    boxShadow: "var(--shadow-md)",
                                                }}
                                                formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                                            />
                                            {(chartFilter === "all" ? ["affiliate", "ugc", "marketplace", "communities"] : [chartFilter]).map(key => (
                                                <Area
                                                    key={key}
                                                    type="monotone"
                                                    dataKey={key}
                                                    stroke={chartColors[key as keyof typeof chartColors]}
                                                    strokeWidth={2}
                                                    fill={`url(#grad-${key})`}
                                                    dot={false}
                                                />
                                            ))}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                    </div>

                    {/* ── Quick Actions ─────────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {quickActions.map((a) => (
                            <Link
                                key={a.label}
                                href={a.href}
                                className="flex items-center gap-2.5 p-3 text-left"
                                style={{
                                    borderRadius: "var(--radius-lg)",
                                    backgroundColor: a.accent ? "var(--color-accent)" : "var(--color-surface)",
                                    border: a.accent ? "none" : "1px solid var(--color-border)",
                                    color: a.accent ? "white" : "var(--color-text-secondary)",
                                    boxShadow: "var(--shadow-sm)",
                                }}
                            >
                                <div
                                    className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                                    style={{
                                        borderRadius: "var(--radius-sm)",
                                        backgroundColor: a.accent ? "rgba(255,255,255,0.15)" : "var(--color-surface-secondary)",
                                        color: a.accent ? "white" : "var(--color-accent)",
                                    }}
                                >
                                    <a.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold leading-tight truncate">
                                        {a.label}
                                    </p>
                                    <p className="text-[10px] leading-tight mt-0.5 truncate opacity-60">
                                        {a.sub}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* ── Bottom grid ───────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Active Campaigns */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-black" style={{ color: "var(--color-text-primary)" }}>Active Campaigns</h3>
                                <Link href="/ugc" className="text-[11px] font-bold" style={{ color: "var(--color-accent)" }}>View all</Link>
                            </div>
                            <div className="space-y-3">
                                {loading
                                    ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                                    : campaigns.length === 0
                                        ? (
                                            <div
                                                className="flex flex-col items-center py-8 text-center"
                                                style={{
                                                    borderRadius: "var(--radius-lg)",
                                                    border: "1px dashed var(--color-border)",
                                                    color: "var(--color-text-muted)",
                                                }}
                                            >
                                                <Megaphone className="h-8 w-8 mb-2 opacity-40" />
                                                <p className="text-sm font-medium">No active campaigns</p>
                                                <Link href="/ugc" className="text-xs mt-1 font-semibold" style={{ color: "var(--color-accent)" }}>Browse campaigns →</Link>
                                            </div>
                                        )
                                        : campaigns.map((c) => {
                                            const img = c.ugc_campaign_media?.find(m => m.type === "image");
                                            const budgetPct = c.total_budget > 0 ? Math.min(100, Math.round((c.submission_count / (c.total_budget / 50)) * 100)) : 0;
                                            return (
                                                <Link
                                                    key={c.id}
                                                    href={`/ugc/campaigns/${c.id}`}
                                                    className="block p-3"
                                                    style={{
                                                        borderRadius: "var(--radius-lg)",
                                                        backgroundColor: "var(--color-surface)",
                                                        border: "1px solid var(--color-border)",
                                                        boxShadow: "var(--shadow-sm)",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {img
                                                            ? <img src={img.url} className="w-12 h-12 object-cover flex-shrink-0" style={{ borderRadius: "var(--radius-md)" }} />
                                                            : (
                                                                <div
                                                                    className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                                                                    style={{ borderRadius: "var(--radius-md)", backgroundColor: "var(--color-accent-light)", color: "var(--color-accent)" }}
                                                                >
                                                                    <Megaphone className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{c.title}</p>
                                                            <span
                                                                className="text-[10px] font-bold px-1.5 py-0.5"
                                                                style={{ borderRadius: "var(--radius-full)", backgroundColor: "var(--color-accent-light)", color: "var(--color-accent)" }}
                                                            >
                                                                {c.campaign_type.replace("_", " ")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                                            {c.submission_count} submissions
                                                        </span>
                                                        <span className="text-[12px] font-black" style={{ color: "var(--color-success)" }}>
                                                            {c.payment_model === "per_views"
                                                                ? `$${c.rate_per_1k_views}/1k views`
                                                                : `$${c.fixed_rate} flat`}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-secondary)" }}>
                                                        <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, backgroundColor: "var(--color-accent)" }} />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                            </div>
                        </div>

                        {/* Trending Products */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-black" style={{ color: "var(--color-text-primary)" }}>Trending Products</h3>
                                <Link href="/marketplace" className="text-[11px] font-bold" style={{ color: "var(--color-accent)" }}>View all</Link>
                            </div>
                            <div className="space-y-3">
                                {loading
                                    ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                                    : products.length === 0
                                        ? (
                                            <div
                                                className="flex flex-col items-center py-8 text-center"
                                                style={{
                                                    borderRadius: "var(--radius-lg)",
                                                    border: "1px dashed var(--color-border)",
                                                    color: "var(--color-text-muted)",
                                                }}
                                            >
                                                <Package className="h-8 w-8 mb-2 opacity-40" />
                                                <p className="text-sm font-medium">No products yet</p>
                                                <Link href="/marketplace" className="text-xs mt-1 font-semibold" style={{ color: "var(--color-accent)" }}>Explore marketplace →</Link>
                                            </div>
                                        )
                                        : products.map((p) => {
                                            const img = getProductImage(p.images);
                                            const commission = p.affiliate_commission_rate ?? 0;
                                            const displayPrice = p.price_usd > 0 ? p.price_usd : p.price;
                                            return (
                                                <Link
                                                    key={p.id}
                                                    href={`/marketplace/products/${p.id}`}
                                                    className="flex items-center gap-3 p-3"
                                                    style={{
                                                        borderRadius: "var(--radius-lg)",
                                                        backgroundColor: "var(--color-surface)",
                                                        border: "1px solid var(--color-border)",
                                                        boxShadow: "var(--shadow-sm)",
                                                    }}
                                                >
                                                    {img
                                                        ? <img src={img} className="w-14 h-14 object-cover flex-shrink-0" style={{ borderRadius: "var(--radius-md)" }} />
                                                        : (
                                                            <div
                                                                className="w-14 h-14 flex items-center justify-center flex-shrink-0"
                                                                style={{ borderRadius: "var(--radius-md)", backgroundColor: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
                                                            >
                                                                <Package className="h-5 w-5" />
                                                            </div>
                                                        )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{p.name}</p>
                                                        <p className="text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
                                                            {p.product_categories?.name ?? "General"} · {p.sale_count} sold
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-base font-black" style={{ color: "var(--color-text-primary)" }}>
                                                                ${displayPrice.toFixed(2)}
                                                            </span>
                                                            {commission > 0 && (
                                                                <span
                                                                    className="text-[10px] font-bold px-1.5 py-0.5"
                                                                    style={{ borderRadius: "var(--radius-full)", backgroundColor: "var(--color-accent-light)", color: "var(--color-accent)" }}
                                                                >
                                                                    🔥 {commission}% comm.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                            </div>
                        </div>

                        {/* My Communities */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-black" style={{ color: "var(--color-text-primary)" }}>My Communities</h3>
                                <Link href="/dashboard/communities" className="text-[11px] font-bold" style={{ color: "var(--color-accent)" }}>View all</Link>
                            </div>
                            <div className="space-y-2.5">
                                {loading
                                    ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                                    : communities.length === 0
                                        ? (
                                            <div
                                                className="flex flex-col items-center py-8 text-center"
                                                style={{
                                                    borderRadius: "var(--radius-lg)",
                                                    border: "1px dashed var(--color-border)",
                                                    color: "var(--color-text-muted)",
                                                }}
                                            >
                                                <Users className="h-8 w-8 mb-2 opacity-40" />
                                                <p className="text-sm font-medium">No communities yet</p>
                                                <Link href="/communities" className="text-xs mt-1 font-semibold" style={{ color: "var(--color-accent)" }}>Explore communities →</Link>
                                            </div>
                                        )
                                        : communities.map((cm) => {
                                            const c = cm.communities;
                                            if (!c) return null;
                                            const hue = c.name.charCodeAt(0) % 360;
                                            return (
                                                <Link
                                                    key={cm.community_id}
                                                    href={`/communities/${c.slug}`}
                                                    className="flex items-center gap-3 p-3"
                                                    style={{
                                                        borderRadius: "var(--radius-lg)",
                                                        backgroundColor: "var(--color-surface)",
                                                        border: "1px solid var(--color-border)",
                                                        boxShadow: "var(--shadow-sm)",
                                                    }}
                                                >
                                                    {c.avatar_url
                                                        ? <img src={c.avatar_url} className="w-10 h-10 object-cover flex-shrink-0" style={{ borderRadius: "var(--radius-md)" }} />
                                                        : (
                                                            <div
                                                                className="w-10 h-10 flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                                                                style={{ borderRadius: "var(--radius-md)", backgroundColor: `hsl(${hue},65%,50%)` }}
                                                            >
                                                                {c.name.slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{c.name}</p>
                                                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                                            {c.member_count?.toLocaleString() ?? 0} members
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                                                </Link>
                                            );
                                        })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Right Activity Panel ──────────────────────────────────────────── */}
            <aside
                className="hidden xl:flex flex-col w-[220px] flex-shrink-0 overflow-y-auto no-scrollbar"
                style={{
                    borderLeft: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg)",
                }}
            >
                <div className="p-4 sticky top-0 z-10" style={{ backgroundColor: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                            Activity
                        </h3>
                        {unreadNotifications > 0 && (
                            <span
                                className="text-[9px] font-black px-1.5 py-0.5"
                                style={{
                                    borderRadius: "var(--radius-full)",
                                    backgroundColor: "var(--color-accent)",
                                    color: "white",
                                }}
                            >
                                {unreadNotifications}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-3 space-y-2.5 flex-1">
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-2.5">
                                <Skeleton className="w-9 h-9 flex-shrink-0 rounded-xl" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-2.5 w-3/4" />
                                </div>
                            </div>
                        ))
                        : activity.length === 0
                            ? (
                                <div
                                    className="flex flex-col items-center py-8 text-center"
                                    style={{ color: "var(--color-text-muted)" }}
                                >
                                    <Bell className="h-8 w-8 mb-2 opacity-30" />
                                    <p className="text-xs font-medium">No recent activity</p>
                                </div>
                            )
                            : activity.map((n) => {
                                const { Icon, bg, color } = notifIcon(n.type);
                                const content = (
                                    <div key={n.id} className={`flex items-start gap-2.5 ${!n.is_read ? "opacity-100" : "opacity-70"}`}>
                                        <div
                                            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                                            style={{ borderRadius: "var(--radius-md)", backgroundColor: bg }}
                                        >
                                            <Icon className="h-4 w-4" style={{ color }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                                                {n.title}
                                            </p>
                                            <p className="text-[10px] mt-0.5 leading-tight truncate" style={{ color: "var(--color-text-muted)" }}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                                                {timeAgo(n.created_at)}
                                            </p>
                                        </div>
                                        {!n.is_read && (
                                            <div
                                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                                                style={{ backgroundColor: "var(--color-accent)" }}
                                            />
                                        )}
                                    </div>
                                );
                                return n.action_url
                                    ? <Link key={n.id} href={n.action_url}>{content}</Link>
                                    : <div key={n.id}>{content}</div>;
                            })}
                </div>

                {/* All notifications link */}
                <div
                    className="p-3 flex-shrink-0"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                >
                    <Link
                        href="/dashboard/notifications"
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-[12px] font-semibold"
                        style={{
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--color-surface-secondary)",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        All notifications
                    </Link>
                </div>
            </aside>
        </div>
    );
}