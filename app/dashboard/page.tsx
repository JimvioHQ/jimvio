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
import { GlassAmbientGlow } from "@/components/ui/glass";

/* ─── Types ─── */
interface DashStats {
  orders: number; wishlist: number; affiliateEarnings: number; affiliateLinks: number;
  vendorRevenue: number; vendorOrders: number; vendorProducts: number;
  activeMissions: number; totalSubmissionsReceived: number;
  missionsJoined: number; mySubmissions: number;
  communitiesJoined: number; communitiesCreated: number;
}

/* ═══════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════ */

/** iOS 17 Stat Card */
function StatCard({ value, label, icon, color }: {
  value: string | number; label: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="relative group overflow-hidden rounded-[28px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_4px_24px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.08)] transition-all duration-500 p-5 flex flex-col justify-between min-h-[140px]">
      <div className={cn("w-11 h-11 rounded-[16px] flex items-center justify-center shrink-0 border border-white shadow-sm group-hover:scale-110 transition-transform duration-500", color)}>
        {icon as React.ReactNode}
      </div>
      <div className="mt-3">
        <p className="text-[26px] font-black text-stone-900 tabular-nums tracking-tighter leading-none">{value}</p>
        <p className="mt-2 text-[9px] font-black text-stone-400 uppercase tracking-widest truncate">{label}</p>
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
        "flex items-center gap-4 px-5 py-3.5 rounded-[20px] border transition-all duration-300 active:scale-[0.97]",
        highlight
          ? "bg-orange-500/12 border-orange-500/25 hover:bg-orange-500/20 shadow-sm"
          : "bg-white/75 border-white/50 hover:bg-white hover:shadow-md shadow-sm"
      )}>
        <div className={cn(
          "h-9 w-9 rounded-[14px] flex items-center justify-center shrink-0 border border-white shadow-sm",
          highlight ? "bg-white/80 text-orange-600" : "bg-stone-50/80 text-stone-400 group-hover:text-stone-800"
        )}>
          {icon as React.ReactNode}
        </div>
        <span className={cn(
          "text-[11px] font-black flex-1 truncate uppercase tracking-widest",
          highlight ? "text-orange-700" : "text-stone-600 group-hover:text-stone-900"
        )}>{label}</span>
        <ChevronRight className={cn(
          "h-4 w-4 transition-transform group-hover:translate-x-1",
          highlight ? "text-orange-400" : "text-stone-300"
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
      <div className="flex items-center gap-2.5">
        <div className="text-orange-500 bg-orange-50 p-1.5 rounded-[12px] border border-orange-100">
          {icon as React.ReactNode}
        </div>
        <h2 className="text-[12px] font-black text-stone-900 uppercase tracking-widest">{title}</h2>
      </div>
      {actionHref && (
        <Link href={actionHref} className="text-[10px] font-black text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════ */

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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700" style={{ background: "#f8f7f5" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-[28px] bg-white border border-white shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <LayoutDashboard className="h-8 w-8 text-stone-800" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-[13px] font-black text-stone-900 uppercase tracking-[0.3em]">Loading Dashboard</h2>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Setting things up...</p>
        </div>
      </div>
    );
  }

  /* ─── Main Render ─── */
  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "#f8f7f5" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-7xl mx-auto space-y-8 px-5 sm:px-6 pt-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ════════════════════════════════════
            GREETING
        ════════════════════════════════════ */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tighter">
            {greeting}, <span className="text-orange-600">{firstName}</span>
          </h1>
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.25em]">
            Your dashboard overview
          </p>
        </div>

        {/* ════════════════════════════════════
            MY WALLET — Large Featured Card
        ════════════════════════════════════ */}
        <Link href="/dashboard/wallet" className="block outline-none group">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 p-7 sm:p-9 shadow-[0_16px_50px_rgba(249,115,22,0.3)] hover:shadow-[0_24px_60px_rgba(249,115,22,0.4)] transition-all duration-500 active:scale-[0.98]">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/15 blur-[90px] rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-300/20 blur-[50px] rounded-full -translate-x-1/4 translate-y-1/4" />

            <div className="relative z-10">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[16px] bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/15">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-black text-white/90 uppercase tracking-widest">My Wallet</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBalanceHidden(v => !v); }}
                  className="h-9 w-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/25 transition-all active:scale-90 border border-white/10"
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                >
                  {balanceHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Balance */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-white/65 uppercase tracking-widest mb-1.5">Available Balance</p>
                <p className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tighter leading-none">
                  {balanceHidden ? "• • • • • •" : formatMoney(walletBalance.available, "USD")}
                </p>
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/50 animate-pulse" />
                  <span className="text-[11px] font-semibold text-white/65">
                    {balanceHidden ? "•••" : formatMoney(walletBalance.pending, "USD")} pending
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowUpRight className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* ════════════════════════════════════
            QUICK ACTIONS
        ════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { href: "/dashboard/wallet", icon: <Wallet />, label: "Add Funds", color: "text-orange-500" },
            { href: "/dashboard/messages", icon: <MessageSquare />, label: "Messages", color: "text-stone-500" },
            { href: "/dashboard/settings", icon: <Settings />, label: "Settings", color: "text-stone-500" },
            { href: "/support", icon: <Heart />, label: "Help", color: "text-rose-400" },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-2 p-3.5 sm:p-5 rounded-[24px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-sm hover:shadow-md transition-all active:scale-95 group">
              {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: cn("h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform", item.color) })}
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-stone-500">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* ════════════════════════════════════
            MAIN GRID
        ════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Earnings Chart */}
            <div className="rounded-[36px] bg-white/60 backdrop-blur-[60px] saturate-[180%] border border-white/60 shadow-[0_6px_30px_rgb(0,0,0,0.04)] p-7 sm:p-9 overflow-hidden">
              <div className="flex items-center justify-between mb-7">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">Earnings Overview</h3>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    {chartData[6].v > chartData[0].v ? "Growing this week" : "Steady activity"}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-100">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">This Week</span>
                </div>
              </div>
              <div className="h-[170px] -ml-5 -mr-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#d1d5db", fontSize: 10, fontWeight: 800 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 16px 40px rgba(0,0,0,0.1)", fontSize: "11px", fontWeight: 800, padding: "10px 16px" }} />
                    <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)"
                      dot={{ r: 3.5, fill: "#fff", stroke: "#f97316", strokeWidth: 2.5 }}
                      activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ─── ROLE-BASED SECTIONS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* 1. BUYER — Always visible */}
              <div className="space-y-4">
                <SectionHeader title="My Shopping" icon={<ShoppingCart />} actionHref="/dashboard/orders" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard value={stats.orders} label="My Orders" icon={<Package />} color="bg-orange-50 text-orange-600" />
                  <StatCard value={stats.wishlist} label="Wishlist" icon={<Heart />} color="bg-rose-50 text-rose-500" />
                </div>
                <div className="space-y-2.5">
                  <ActionRow href="/dashboard/orders" icon={<Truck />} label="Track My Orders" />
                  <ActionRow href="/" icon={<Globe />} label="Browse Products" highlight />
                </div>
              </div>

              {/* 2. VENDOR — Conditional */}
              {activeRoles.includes("vendor") && (
                <div className="space-y-4">
                  <SectionHeader title="My Store" icon={<Store />} actionHref="/dashboard/vendor/store" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.vendorProducts} label="Products" icon={<Box />} color="bg-violet-50 text-violet-600" />
                    <StatCard value={formatMoney(stats.vendorRevenue, "USD")} label="Revenue" icon={<DollarSign />} color="bg-emerald-50 text-emerald-600" />
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
                  <SectionHeader title="Creator Hub" icon={<Video />} actionHref="/dashboard/influencer" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.missionsJoined} label="Missions Joined" icon={<Target />} color="bg-indigo-50 text-indigo-600" />
                    <StatCard value={stats.mySubmissions} label="My Uploads" icon={<Camera />} color="bg-pink-50 text-pink-500" />
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
                  <SectionHeader title="My Missions" icon={<Zap />} actionHref="/dashboard/vendor/campaigns" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={stats.activeMissions} label="Active Missions" icon={<Radio />} color="bg-amber-50 text-amber-600" />
                    <StatCard value={stats.totalSubmissionsReceived} label="Submissions" icon={<Camera />} color="bg-sky-50 text-sky-600" />
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
                  <SectionHeader title="Affiliate Hub" icon={<Link2 />} actionHref="/dashboard/links" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard value={formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign />} color="bg-emerald-50 text-emerald-600" />
                    <StatCard value={stats.affiliateLinks} label="Active Links" icon={<Link2 />} color="bg-sky-50 text-sky-600" />
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
              <SectionHeader title="Communities" icon={<Users2 />} actionHref="/communities" />
              <div className="space-y-3">
                <div className="flex items-center gap-5 p-5 rounded-[28px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-sm hover:shadow-md transition-all duration-500 group">
                  <div className="w-12 h-12 rounded-[18px] bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-stone-900 tracking-tighter leading-none">{stats.communitiesJoined}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1.5">Joined</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-5 rounded-[28px] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-sm hover:shadow-md transition-all duration-500 group">
                  <div className="w-12 h-12 rounded-[18px] bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-stone-900 tracking-tighter leading-none">{stats.communitiesCreated}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1.5">Created</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <ActionRow href="/communities" icon={<Users />} label="Explore Communities" />
                <ActionRow href="/communities/create" icon={<Plus />} label="Start a Community" highlight />
              </div>
            </div>

            {/* Learn & Grow */}
            <div className="p-7 rounded-[36px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 overflow-hidden relative group border border-white/15 shadow-[0_12px_36px_rgba(249,115,22,0.2)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/15 blur-[70px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-white/25 transition-all duration-1000" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/20 p-1.5 rounded-[10px] backdrop-blur-md border border-white/15 text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">Learn &amp; Grow</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight tracking-tighter">Grow your business with Jimvio</h3>
                <p className="text-white/80 text-[12px] leading-relaxed font-semibold">
                  Guides, tips, and strategies to sell more and reach new customers.
                </p>
                <Button asChild className="w-full bg-white/95 text-orange-600 hover:bg-white hover:scale-[1.01] active:scale-95 h-11 rounded-[16px] font-black text-[11px] uppercase tracking-widest transition-all border-none shadow-md">
                  <Link href="/help">Explore Guides <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
              </div>
            </div>

            {/* Your Roles */}
            <div className="p-6 rounded-[32px] bg-white/50 backdrop-blur-[40px] saturate-200 border border-white/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">Your Roles</span>
                <Link href="/dashboard/roles" className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors">
                  Manage
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRoles.map(role => (
                  <div key={role} className="px-4 py-2 rounded-[14px] bg-white/80 backdrop-blur-md border border-white/70 text-stone-800 font-black text-[10px] uppercase tracking-widest shadow-sm capitalize">
                    {role}
                  </div>
                ))}
              </div>
            </div>

            {/* Help Link */}
            <div className="flex items-center justify-center pt-1">
              <Link href="/support" className="flex items-center gap-2.5 text-stone-400 hover:text-orange-600 transition-colors group">
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