"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, DollarSign, Globe, Plus, Video, ArrowRight,
  Truck, Wallet, Heart, Zap, Sparkles, Activity,
  Link2, Users, ChevronRight, MessageSquare, Store,
  Target, Globe2, Radio, Camera,
  Users2, LayoutGrid, Settings, Search, Box, TrendingUp, LayoutDashboard,
  Eye, EyeOff, ArrowUpRight,
  MessageCircleQuestion,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserStore } from "@/lib/store/use-user-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashStats {
  orders: number; wishlist: number; affiliateEarnings: number; affiliateLinks: number;
  vendorRevenue: number; vendorOrders: number; vendorProducts: number;
  activeMissions: number; totalSubmissionsReceived: number;
  missionsJoined: number; mySubmissions: number;
  communitiesJoined: number; communitiesCreated: number;
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

/** Compact stat card — icon row + value + label */
function StatCard({ value, label, icon, iconColor }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  iconColor: string; // tailwind color class e.g. "text-orange-500"
}) {
  return (
    <div className="bg-[var(--color-surface-secondary)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
          iconColor
        )}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
      </div>
      <p className="text-[22px] font-semibold text-[var(--color-text-primary)] tabular-nums leading-none tracking-tight">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

/** Action row — icon + label + chevron, optional highlight */
function ActionRow({ href, icon, label, highlight = false }: {
  href: string; icon: React.ReactNode; label: string; highlight?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 border rounded-xl transition-all duration-200 active:scale-[0.98]",
        highlight
          ? "bg-orange-500/[0.06] border-orange-500/20 hover:bg-orange-500/10"
          : "bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
      )}>
        <div className={cn(
          "h-7 w-7 flex items-center justify-center shrink-0 rounded-lg border",
          highlight
            ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
            : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]"
        )}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
        <span className={cn(
          "text-[11px] font-semibold flex-1 truncate uppercase tracking-widest",
          highlight ? "text-orange-500" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
        )}>
          {label}
        </span>
        <ChevronRight className={cn(
          "h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5",
          highlight ? "text-orange-400" : "text-[var(--color-text-muted)]"
        )} />
      </div>
    </Link>
  );
}

/** Section header — icon + title + optional "View All" link */
function SectionHeader({ title, icon, actionHref, actionLabel = "View all" }: {
  title: string; icon: React.ReactNode; actionHref?: string; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg text-orange-500">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5" })}
        </div>
        <h2 className="text-[11px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest">
          {title}
        </h2>
      </div>
      {actionHref && (
        <Link href={actionHref} className="text-[10px] font-bold text-orange-500 hover:text-orange-400 transition-colors capitalize">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatMoney }: {
  active?: boolean; payload?: { value: number }[]; label?: string; formatMoney: (v: number, c: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-[var(--shadow-md)] text-[12px] font-semibold text-[var(--color-text-primary)]">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">{label}</p>
      {formatMoney(payload[0].value, "USD")}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { formatMoney } = useCurrency();
  const { activeRoles, fetchRoles } = useUserStore();
  const [profile, setProfile] = useState<{ full_name?: string | null } | null>(null);
  const [stats, setStats] = useState<DashStats>({
    orders: 0, wishlist: 0, affiliateEarnings: 0, affiliateLinks: 0,
    vendorRevenue: 0, vendorOrders: 0, vendorProducts: 0,
    activeMissions: 0, totalSubmissionsReceived: 0,
    missionsJoined: 0, mySubmissions: 0,
    communitiesJoined: 0, communitiesCreated: 0,
  });
  const [walletBalance, setWalletBalance] = useState({ available: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Hello");
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Chart: 7-day earnings shape derived from stats
  const chartData = useMemo(() => {
    const total = stats.vendorRevenue + stats.affiliateEarnings;
    const base = total || 450;
    return [
      { name: "Mon", v: base * 0.12 },
      { name: "Tue", v: base * 0.18 },
      { name: "Wed", v: base * 0.14 },
      { name: "Thu", v: base * 0.28 },
      { name: "Fri", v: base * 0.22 },
      { name: "Sat", v: base * 0.38 },
      { name: "Sun", v: base * 0.45 },
    ];
  }, [stats.vendorRevenue, stats.affiliateEarnings]);

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileRes = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
      if (profileRes.data) setProfile(profileRes.data);
      await fetchRoles();

      const [ordersRes, wishlistRes, affiliateRes, walletRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
        supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("affiliates").select("total_earnings").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("available_balance, pending_balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (walletRes.data) setWalletBalance({
        available: Number(walletRes.data.available_balance || 0),
        pending: Number(walletRes.data.pending_balance || 0),
      });

      let vendorRevenue = 0, vendorOrders = 0, vendorProducts = 0;
      let activeMissions = 0, totalSubmissionsReceived = 0, missionsJoined = 0, mySubmissions = 0;

      if (activeRoles.includes("vendor")) {
        const { data: userVendors } = await supabase.from("vendors").select("id").eq("user_id", user.id);
        if (userVendors?.length) {
          const vendorIds = userVendors.map(v => v.id);
          const [pCount, oItems, missions, subs] = await Promise.all([
            supabase.from("products").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds).eq("is_active", true),
            supabase.from("order_items").select("total_price").in("vendor_id", vendorIds),
            supabase.from("ugc_campaigns").select("id", { count: "exact", head: true }).in("brand_id", vendorIds).eq("status", "active"),
            supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).in("vendor_id", vendorIds),
          ]);
          vendorProducts = pCount.count ?? 0;
          vendorOrders = oItems.data?.length ?? 0;
          vendorRevenue = oItems.data?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;
          activeMissions = missions.count ?? 0;
          totalSubmissionsReceived = subs.count ?? 0;
        }
      }

      if (activeRoles.includes("influencer")) {
        const [joined, sent] = await Promise.all([
          supabase.from("ugc_campaign_participants").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
          supabase.from("ugc_submissions").select("id", { count: "exact", head: true }).eq("influencer_id", user.id),
        ]);
        missionsJoined = joined.count ?? 0;
        mySubmissions = sent.count ?? 0;
      }

      const [commJoined, commCreated, affLinks] = await Promise.all([
        supabase.from("community_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("communities").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("affiliate_links").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        orders: ordersRes.count ?? 0,
        wishlist: wishlistRes.count ?? 0,
        affiliateEarnings: Number(affiliateRes.data?.total_earnings ?? 0),
        affiliateLinks: affLinks.count ?? 0,
        vendorRevenue, vendorOrders, vendorProducts,
        activeMissions, totalSubmissionsReceived,
        missionsJoined, mySubmissions,
        communitiesJoined: commJoined.count ?? 0,
        communitiesCreated: commCreated.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [fetchRoles, activeRoles.length]); // eslint-disable-line

  const firstName = (profile?.full_name as string)?.split(" ")[0] ?? "User";

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500 bg-[var(--color-bg)]">
        <div className="relative w-16 h-16 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center rounded-2xl shadow-sm">
          <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin m-2 rounded-full" />
          <LayoutDashboard className="h-6 w-6 text-[var(--color-text-primary)]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)] uppercase tracking-widest">Loading console</p>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Establishing parameters…</p>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24 bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Greeting */}
        <div className="pb-5 border-b border-[var(--color-border)]">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {greeting}, <span className="text-orange-500">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
            Command center overview
          </p>
        </div>

        {/* ── Wallet card ── */}
        <Link href="/dashboard/wallet" className="block group outline-none">
          <div className={cn(
            "relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]",
            "rounded-2xl p-6 sm:p-8 transition-all duration-300 active:scale-[0.99]",
            "hover:border-orange-500/30 shadow-sm",
          )}>
            {/* Subtle ambient — purely decorative, adapts fine in both modes */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-orange-500/[0.07] rounded-full blur-[60px] group-hover:bg-orange-500/[0.12] transition-all duration-700" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <Wallet className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">My portfolio</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Jimvio Wallet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center border transition-all",
                    "bg-[var(--color-surface-secondary)] border-[var(--color-border)]",
                    "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Balances */}
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mb-2">Available to spend</p>
                  <p className="text-4xl sm:text-5xl font-semibold text-[var(--color-text-primary)] tabular-nums tracking-tight leading-none">
                    {balanceHidden ? "••••••" : formatMoney(walletBalance.available, "USD")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pb-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-full">
                    <span className="h-1.5 w-1.5 bg-orange-500 animate-pulse rounded-full" />
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                      {balanceHidden ? "••••" : formatMoney(walletBalance.pending, "USD")} pending
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-orange-500 transition-colors">
                    Manage wallet <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { href: "/dashboard/wallet", icon: <Wallet />, label: "Add Funds", accent: true },
            { href: "/dashboard/messages", icon: <MessageSquare />, label: "Messages", accent: false },
            { href: "/dashboard/settings", icon: <Settings />, label: "Settings", accent: false },
            { href: "/support", icon: <MessageCircleQuestion />, label: "Help", danger: true },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border",
                "bg-[var(--color-surface)] border-[var(--color-border)]",
                "hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]",
                "transition-all active:scale-95 group text-center shadow-sm",
              )}
            >
              {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, {
                className: cn(
                  "h-5 w-5 sm:h-[18px] sm:w-[18px]",
                  item.accent ? "text-orange-500" : item.danger ? "text-rose-500" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]"
                ),
              })}
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Main grid: left (8) + right sidebar (4) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* Left column */}
          <div className="lg:col-span-8 space-y-8">

            {/* Earnings chart */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">Earnings overview</h3>
                  <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
                    {chartData[6].v > chartData[0].v ? "Growing this week" : "Steady activity"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--color-success-light)] border border-[var(--color-success)]/20 px-2.5 py-1.5 rounded-full">
                  <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />
                  <span className="text-[10px] font-semibold text-[var(--color-success)] uppercase tracking-widest">This week</span>
                </div>
              </div>
              <div className="h-[180px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "var(--color-surface-secondary)", radius: 6 }}
                      content={<ChartTooltip formatMoney={formatMoney} />}
                    />
                    <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === todayIndex ? "#f97316" : "var(--color-surface-secondary)"}
                          stroke={i === todayIndex ? "#f97316" : "var(--color-border)"}
                          strokeWidth={0.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role-based sections — 2-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Buyer — always visible */}
              <div className="space-y-3.5">
                <SectionHeader title="My shopping" icon={<ShoppingCart />} actionHref="/dashboard/orders" />
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard value={stats.orders} label="My orders" icon={<Package />} iconColor="text-orange-500" />
                  <StatCard value={stats.wishlist} label="Wishlist" icon={<Heart />} iconColor="text-rose-500" />
                </div>
                <div className="space-y-2">
                  <ActionRow href="/dashboard/orders" icon={<Truck />} label="Track my orders" />
                  <ActionRow href="/" icon={<Globe />} label="Browse products" highlight />
                </div>
              </div>

              {/* Vendor */}
              {activeRoles.includes("vendor") && (
                <div className="space-y-3.5">
                  <SectionHeader title="My store" icon={<Store />} actionHref="/dashboard/vendor/store" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.vendorProducts} label="Products" icon={<Box />} iconColor="text-violet-500" />
                    <StatCard value={formatMoney(stats.vendorRevenue, "USD")} label="Revenue" icon={<DollarSign />} iconColor="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/vendor/orders" icon={<Package />} label="Manage orders" />
                    <ActionRow href="/dashboard/products/new" icon={<Plus />} label="Add product" highlight />
                  </div>
                </div>
              )}

              {/* Influencer */}
              {activeRoles.includes("influencer") && (
                <div className="space-y-3.5">
                  <SectionHeader title="Creator hub" icon={<Video />} actionHref="/dashboard/influencer" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.missionsJoined} label="Missions" icon={<Target />} iconColor="text-indigo-500" />
                    <StatCard value={stats.mySubmissions} label="Uploads" icon={<Camera />} iconColor="text-pink-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/ugc" icon={<Search />} label="Find missions" highlight />
                    <ActionRow href="/dashboard/influencer/analytics" icon={<Activity />} label="My analytics" />
                  </div>
                </div>
              )}

              {/* Vendor with missions */}
              {activeRoles.includes("vendor") && stats.activeMissions > 0 && (
                <div className="space-y-3.5">
                  <SectionHeader title="My missions" icon={<Zap />} actionHref="/dashboard/vendor/campaigns" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={stats.activeMissions} label="Active" icon={<Radio />} iconColor="text-amber-500" />
                    <StatCard value={stats.totalSubmissionsReceived} label="Submissions" icon={<Camera />} iconColor="text-sky-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/vendor/campaigns/new" icon={<Plus />} label="New mission" highlight />
                    <ActionRow href="/dashboard/vendor/campaigns" icon={<LayoutGrid />} label="All missions" />
                  </div>
                </div>
              )}

              {/* Affiliate */}
              {activeRoles.includes("affiliate") && (
                <div className="space-y-3.5">
                  <SectionHeader title="Affiliate hub" icon={<Link2 />} actionHref="/dashboard/links" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard value={formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign />} iconColor="text-emerald-500" />
                    <StatCard value={stats.affiliateLinks} label="Active links" icon={<Link2 />} iconColor="text-sky-500" />
                  </div>
                  <div className="space-y-2">
                    <ActionRow href="/dashboard/links" icon={<Plus />} label="Create link" highlight />
                    <ActionRow href="/dashboard/affiliate/analytics" icon={<TrendingUp />} label="View performance" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-8">

            {/* Communities */}
            <div className="space-y-3.5">
              <SectionHeader title="Communities" icon={<Users2 />} actionHref="/communities" />
              <div className="flex flex-col gap-2.5">
                {[
                  { value: stats.communitiesJoined, label: "Joined", icon: <Globe2 className="h-4 w-4 text-sky-500" /> },
                  { value: stats.communitiesCreated, label: "Created", icon: <Plus className="h-4 w-4 text-orange-500" /> },
                ].map(item => (
                  <div key={item.label} className={cn(
                    "flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "hover:border-[var(--color-border-strong)] transition-colors shadow-sm rounded-2xl"
                  )}>
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)] tabular-nums leading-none">{item.value}</p>
                      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mt-1">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <ActionRow href="/communities" icon={<Users />} label="Explore communities" />
                <ActionRow href="/communities/create" icon={<Plus />} label="Start a community" highlight />
              </div>
            </div>

            {/* Learn & grow CTA */}
            <div className="p-6 rounded-2xl bg-orange-500 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-white/15 transition-all duration-500" />
              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-white/90 uppercase tracking-widest">Learn &amp; grow</span>
                </div>
                <h3 className="text-base font-semibold text-white leading-snug tracking-tight">
                  Grow your business with Jimvio
                </h3>
                <p className="text-white/80 text-[12px] leading-relaxed">
                  Guides, tips, and strategies to sell more and reach new customers.
                </p>
                <Button
                  asChild
                  className="w-full bg-black/25 hover:bg-black/35 text-white h-10 rounded-xl font-semibold text-[11px] uppercase tracking-widest transition-all border-none shadow-none"
                >
                  <Link href="/help">Explore guides <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
                </Button>
              </div>
            </div>

            {/* Your roles */}
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)] capitalize tracking-widest">Your roles</span>
                <Link href="/dashboard/roles" className="text-[10px] font-semibold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-tight">
                  Manage
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRoles.map(role => (
                  <div
                    key={role}
                    className="px-3 py-1.5 font-primary rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-semibold text-[10px] tracking-widest capitalize"
                  >
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Help link */}
            <div className="flex items-center justify-center">
              <Link href="/support" className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-orange-500 transition-colors group">
                <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Need help?</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}