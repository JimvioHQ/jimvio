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
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { useUserStore } from "@/lib/store/use-user-store";

/* ─── Types ─── */
interface DashStats {
  orders: number; wishlist: number; affiliateEarnings: number; affiliateLinks: number;
  vendorRevenue: number; vendorOrders: number; vendorProducts: number;
  activeMissions: number; totalSubmissionsReceived: number;
  missionsJoined: number; mySubmissions: number;
  communitiesJoined: number; communitiesCreated: number;
}

/* ═════════════════════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Command Center Stat Card */
function StatCard({ value, label, icon, colorClass, borderClass }: {
  value: string | number; label: string; icon: React.ReactNode; colorClass: string; borderClass: string;
}) {
  return (
    <div className="relative group p-5 flex flex-col justify-between min-h-[140px] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-none transition-all duration-300">
      <div className={cn("w-11 h-11 flex items-center justify-center shrink-0 border bg-[var(--color-surface-secondary)] transition-colors duration-300", borderClass, colorClass, "group-hover:bg-[var(--color-surface-secondary)]/80")}>
        {icon as React.ReactNode}
      </div>
      <div className="mt-4">
        <p className="text-[26px] font-black text-[var(--color-text-primary)] tabular-nums tracking-tighter leading-none">{value}</p>
        <p className="mt-2 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest break-words truncate">{label}</p>
      </div>
    </div>
  );
}

/** Action Row Button */
function ActionRow({ href, icon, label, highlight = false }: {
  href: string; icon: React.ReactNode; label: string; highlight?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        "flex items-center gap-4 px-5 py-3.5 border transition-all duration-300 active:scale-[0.98]",
        highlight
          ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20"
          : "bg-[#0A0A0A] border-[#222] hover:bg-[#111] hover:border-[#333]"
      )}>
        <div className={cn(
          "h-9 w-9 flex items-center justify-center shrink-0 border",
          highlight ? "bg-[var(--color-surface-secondary)] border-orange-500/20 text-orange-500" : "bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] group-hover:border-[var(--color-border-strong)]"
        )}>
          {icon as React.ReactNode}
        </div>
        <span className={cn(
          "text-[11px] font-bold flex-1 truncate uppercase tracking-widest",
          highlight ? "text-orange-500" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"
        )}>{label}</span>
        <ChevronRight className={cn(
          "h-4 w-4 transition-transform group-hover:translate-x-1",
          highlight ? "text-orange-400" : "text-[var(--color-text-muted)]"
        )} />
      </div>
    </Link>
  );
}

/** Section Header */
function SectionHeader({ title, icon, actionHref, actionLabel = "View All" }: {
  title: string; icon: React.ReactNode; actionHref?: string; actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-4">
      <div className="flex items-center gap-3">
        <div className="text-orange-500 bg-[var(--color-surface-secondary)] p-1.5 border border-[var(--color-border)] shadow-none">
          {icon as React.ReactNode}
        </div>
        <h2 className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-widest font-mono">{title}</h2>
      </div>
      {actionHref && (
        <Link href={actionHref} className="text-[10px] font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-widest font-mono">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═════════════════════════════════════════════════════════════════════════════ */

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
  const [balanceHidden, setBalanceHidden] = useState(true);

  const chartData = useMemo(() => {
    const total = stats.vendorRevenue + stats.affiliateEarnings;
    const base = total || 450;
    return [
      { name: "Mon", v: base * 0.12 }, { name: "Tue", v: base * 0.18 },
      { name: "Wed", v: base * 0.14 }, { name: "Thu", v: base * 0.28 },
      { name: "Fri", v: base * 0.22 }, { name: "Sat", v: base * 0.38 },
      { name: "Sun", v: base * 0.45 },
    ];
  }, [stats.vendorRevenue, stats.affiliateEarnings]);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good Morning");
    else if (h < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
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
      if (walletRes.data) setWalletBalance({ available: Number(walletRes.data.available_balance || 0), pending: Number(walletRes.data.pending_balance || 0) });

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
        orders: ordersRes.count ?? 0, wishlist: wishlistRes.count ?? 0,
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

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700 bg-[var(--color-bg)]">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl scale-150 animate-pulse" />
          <div className="relative w-20 h-20 bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden shadow-none">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin m-2" />
            <LayoutDashboard className="h-8 w-8 text-[var(--color-text-primary)]" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-[13px] font-black text-[var(--color-text-primary)] uppercase tracking-[0.3em]">Loading Console</h2>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Establishing parameters...</p>
        </div>
      </div>
    );
  }

  /* ─── Main Render ─── */
  return (
    <div className="min-h-screen pb-24 relative bg-[var(--color-bg)] text-[var(--color-text-primary)]">

      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 pt-5 relative animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* ═════════════════════════════════════════════════════════════════════
            GREETING
        ═════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5 py-4 border-b border-[var(--color-border)]">
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter">
            {greeting}, <span className="text-orange-500">{firstName}</span>
          </h1>
          <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.25em] font-mono">
            Command Center Overview
          </p>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            MY WALLET — Large Featured Card
        ═════════════════════════════════════════════════════════════════════ */}
        <Link href="/dashboard/wallet" className="block outline-none group">
          <div className="relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] p-8 sm:p-10 transition-all duration-300 active:scale-[0.98] hover:border-[var(--color-border-strong)] shadow-none">
            {/* Ambient Accent Glows */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-600/5 blur-[100px] group-hover:bg-orange-600/10 transition-all duration-700" />
            
            <div className="relative z-10">
              {/* Header row */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-orange-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                    <Wallet className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] block">My Portfolio</span>
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">Jimvio Wallet</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
                  className="h-10 w-10 bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all border border-[var(--color-border)]"
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                >
                  {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Balance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 font-mono">Available to spend</p>
                  <p className="text-5xl sm:text-6xl font-bold text-[var(--color-text-primary)] tabular-nums tracking-tighter leading-none font-mono">
                    {balanceHidden ? "••••••" : formatMoney(walletBalance.available, "USD")}
                  </p>
                </div>
                <div className="sm:text-right space-y-3">
                   <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                      <div className="h-1.5 w-1.5 bg-orange-500 animate-pulse" />
                      <span className="text-xs font-bold text-[var(--color-text-muted)] font-mono">
                        {balanceHidden ? "••••" : formatMoney(walletBalance.pending, "USD")} pending
                      </span>
                   </div>
                   <div className="flex items-center sm:justify-end gap-2 text-[var(--color-text-muted)] hover:text-orange-500 transition-colors text-[10px] uppercase font-bold tracking-widest">
                     Manage Wallet <ArrowUpRight className="h-3 w-3" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { href: "/dashboard/wallet", icon: <Wallet />, label: "Add Funds", color: "text-orange-500" },
            { href: "/dashboard/messages", icon: <MessageSquare />, label: "Messages", color: "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" },
            { href: "/dashboard/settings", icon: <Settings />, label: "Settings", color: "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]" },
            { href: "/support", icon: <Heart />, label: "Help", color: "text-rose-500" },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-2.5 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] transition-all active:scale-95 group shadow-none">
              {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: cn("h-5 w-5 sm:h-6 sm:w-6 transition-transform", item.color) })}
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Earnings Chart */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-7 overflow-hidden shadow-none transition-all">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Earnings Overview</h3>
                  <p className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                    {chartData[6].v > chartData[0].v ? "Growing this week" : "Steady activity"}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono">This Week</span>
                </div>
              </div>
              <div className="h-[200px] -ml-5 -mr-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 10, fontWeight: 800, fontFamily: "monospace" }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--color-surface)", borderRadius: "0", border: "1px solid var(--color-border)", fontSize: "12px", fontWeight: 700, padding: "10px 16px", color: "var(--color-text-primary)" }} />
                    <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)"
                      dot={{ r: 3, fill: "#111", stroke: "#f97316", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "#f97316", stroke: "#111", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── ROLE-BASED SECTIONS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

              {/* 1. BUYER — Always visible */}
              <div className="space-y-4">
                <SectionHeader title="My Shopping" icon={<ShoppingCart className="h-4 w-4" />} actionHref="/dashboard/orders" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard value={stats.orders} label="My Orders" icon={<Package className="text-orange-500" />} colorClass="text-orange-500" borderClass="border-orange-500/20" />
                  <StatCard value={stats.wishlist} label="Wishlist" icon={<Heart className="text-rose-500" />} colorClass="text-rose-500" borderClass="border-rose-500/20" />
                </div>
                <div className="space-y-2.5">
                  <ActionRow href="/dashboard/orders" icon={<Truck />} label="Track My Orders" />
                  <ActionRow href="/" icon={<Globe />} label="Browse Products" highlight />
                </div>
              </div>

              {/* 2. VENDOR — Conditional */}
              {activeRoles.includes("vendor") && (
                <div className="space-y-4">
                  <SectionHeader title="My Store" icon={<Store className="h-4 w-4" />} actionHref="/dashboard/vendor/store" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.vendorProducts} label="Products" icon={<Box className="text-violet-500" />} colorClass="text-violet-500" borderClass="border-violet-500/20" />
                    <StatCard value={formatMoney(stats.vendorRevenue, "USD")} label="Revenue" icon={<DollarSign className="text-emerald-500" />} colorClass="text-emerald-500" borderClass="border-emerald-500/20" />
                  </div>
                  <div className="space-y-2.5">
                    <ActionRow href="/dashboard/vendor/orders" icon={<Package />} label="Manage Orders" />
                    <ActionRow href="/dashboard/products/new" icon={<Plus />} label="Add New Product" highlight />
                  </div>
                </div>
              )}

              {/* 3. INFLUENCER / CREATOR — Conditional */}
              {activeRoles.includes("influencer") && (
                <div className="space-y-4">
                  <SectionHeader title="Creator Hub" icon={<Video className="h-4 w-4" />} actionHref="/dashboard/influencer" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.missionsJoined} label="Missions Joined" icon={<Target className="text-indigo-500" />} colorClass="text-indigo-500" borderClass="border-indigo-500/20" />
                    <StatCard value={stats.mySubmissions} label="My Uploads" icon={<Camera className="text-pink-500" />} colorClass="text-pink-500" borderClass="border-pink-500/20" />
                  </div>
                  <div className="space-y-2.5">
                    <ActionRow href="/ugc" icon={<Search />} label="Find Missions" highlight />
                    <ActionRow href="/dashboard/influencer/analytics" icon={<Activity />} label="My Analytics" />
                  </div>
                </div>
              )}

              {/* 4. MISSION OWNER — Conditional (vendor with campaigns) */}
              {activeRoles.includes("vendor") && stats.activeMissions > 0 && (
                <div className="space-y-4">
                  <SectionHeader title="My Missions" icon={<Zap className="h-4 w-4" />} actionHref="/dashboard/vendor/campaigns" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.activeMissions} label="Active Missions" icon={<Radio className="text-amber-500" />} colorClass="text-amber-500" borderClass="border-amber-500/20" />
                    <StatCard value={stats.totalSubmissionsReceived} label="Submissions" icon={<Camera className="text-sky-500" />} colorClass="text-sky-500" borderClass="border-sky-500/20" />
                  </div>
                  <div className="space-y-2.5">
                    <ActionRow href="/dashboard/vendor/campaigns/new" icon={<Plus />} label="Create Mission" highlight />
                    <ActionRow href="/dashboard/vendor/campaigns" icon={<LayoutGrid />} label="View All Missions" />
                  </div>
                </div>
              )}

              {/* 5. AFFILIATE — Conditional */}
              {activeRoles.includes("affiliate") && (
                <div className="space-y-4">
                  <SectionHeader title="Affiliate Hub" icon={<Link2 className="h-4 w-4" />} actionHref="/dashboard/links" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign className="text-emerald-500" />} colorClass="text-emerald-500" borderClass="border-emerald-500/20" />
                    <StatCard value={stats.affiliateLinks} label="Active Links" icon={<Link2 className="text-sky-500" />} colorClass="text-sky-500" borderClass="border-sky-500/20" />
                  </div>
                  <div className="space-y-2.5">
                    <ActionRow href="/dashboard/links" icon={<Plus />} label="Create Link" highlight />
                    <ActionRow href="/dashboard/affiliate/analytics" icon={<TrendingUp />} label="View Performance" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="lg:col-span-4 space-y-8">

            {/* 6. COMMUNITIES — Always visible */}
            <div className="space-y-4">
              <SectionHeader title="Communities" icon={<Users2 className="h-4 w-4" />} actionHref="/communities" />
              <div className="space-y-3">
                <div className="flex items-center gap-5 p-5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors group shadow-none">
                  <div className="w-12 h-12 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sky-500 flex items-center justify-center shrink-0">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--color-text-primary)] tracking-tighter leading-none tabular-nums">{stats.communitiesJoined}</p>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1.5 font-mono">Joined</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors group shadow-none">
                  <div className="w-12 h-12 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-orange-500 flex items-center justify-center shrink-0">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-[var(--color-text-primary)] tracking-tighter leading-none tabular-nums">{stats.communitiesCreated}</p>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1.5 font-mono">Created</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <ActionRow href="/communities" icon={<Users />} label="Explore Communities" />
                <ActionRow href="/communities/create" icon={<Plus />} label="Start a Community" highlight />
              </div>
            </div>

            {/* Learn & Grow */}
            <div className="p-7 bg-orange-600 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[50px] translate-x-1/3 -translate-y-1/3 group-hover:bg-white/20 transition-all duration-700" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-black/20 p-1.5 text-white shadow-inner">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Learn &amp; Grow</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight tracking-tighter">Grow your business with Jimvio</h3>
                <p className="text-white/80 text-[12px] leading-relaxed font-semibold">
                  Guides, tips, and strategies to sell more and reach new customers.
                </p>
                <Button asChild className="w-full bg-black text-white hover:bg-zinc-900 active:scale-95 h-11 rounded-none font-black text-[11px] uppercase tracking-widest transition-all border-none shadow-none mt-2">
                  <Link href="/help">Explore Guides <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
              </div>
            </div>

            {/* Your Roles */}
            <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] space-y-5 shadow-none transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest font-mono">Your Roles</span>
                <Link href="/dashboard/roles" className="text-[10px] font-bold text-orange-500 uppercase tracking-widest font-mono hover:text-orange-400 transition-colors">
                  Manage
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRoles.map(role => (
                  <div key={role} className="px-4 py-2 rounded-none bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-black text-[10px] uppercase tracking-widest shadow-none capitalize">
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Help Link */}
            <div className="flex items-center justify-center pt-1">
              <Link href="/support" className="flex items-center gap-2.5 text-[var(--color-text-muted)] hover:text-orange-600 transition-colors group">
                <MessageSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest">Need Help?</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
