"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart, Package, DollarSign, Globe, Plus, Video, ArrowRight,
  Truck, Wallet, Heart, Zap, CheckCircle, ArrowUpRight, Sparkles, Activity,
  History as HistoryIcon, Link2, Users, ChevronRight,
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
interface RecentOrder {
  id: string; order_number: string; status: string;
  total_amount: number; currency: string; created_at: string;
}

/* ─── Glass primitives ─── */

/** Frosted glass card with liquid-glass shimmer */
function GlassCard({
  children, className, dark = false, href,
}: {
  children: React.ReactNode; className?: string; dark?: boolean; href?: string;
}) {
  const base = cn(
    "relative overflow-hidden rounded-[28px] border transition-all duration-300",
    dark
      ? "bg-[#0a0806]/80 border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
      : "bg-white/55 border-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]",
    "backdrop-blur-2xl",
    className
  );
  // Specular shine overlay
  const shine = (
    <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden">
      <div className={cn(
        "absolute -top-1/2 -left-1/2 w-full h-3/4 rotate-[-25deg]",
        dark
          ? "bg-gradient-to-br from-white/[0.04] to-transparent"
          : "bg-gradient-to-br from-white/80 to-transparent"
      )} />
      <div className={cn(
        "absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-2xl",
        dark ? "bg-orange-500/5" : "bg-orange-100/40"
      )} />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn(base, "block group active:scale-[0.985]")}>
        {shine}{children}
      </Link>
    );
  }
  return <div className={base}>{shine}{children}</div>;
}

/** Pill / chip in liquid glass style */
function GlassPill({
  children, color = "neutral",
}: {
  children: React.ReactNode;
  color?: "neutral" | "orange" | "sky" | "emerald" | "indigo" | "amber" | "rose";
}) {
  const colors = {
    neutral: "bg-white/40 border-white/60 text-stone-600",
    orange: "bg-orange-50/60 border-orange-200/60 text-orange-700",
    sky: "bg-sky-50/60 border-sky-200/60 text-sky-700",
    emerald: "bg-emerald-50/60 border-emerald-200/60 text-emerald-700",
    indigo: "bg-indigo-50/60 border-indigo-200/60 text-indigo-700",
    amber: "bg-amber-50/60 border-amber-200/60 text-amber-700",
    rose: "bg-rose-50/60 border-rose-200/60 text-rose-700",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-xl text-[11px] font-semibold shadow-sm",
      colors[color]
    )}>
      {children}
    </span>
  );
}

/** Liquid stat bubble */
function LiquidStat({
  value, label, icon, gradient,
}: {
  value: string | number; label: string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] p-4 backdrop-blur-xl border border-white/30 shadow-[0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] bg-white/40">
      <div className="pointer-events-none absolute inset-0 rounded-[22px]">
        <div className="absolute -top-1/3 -right-1/4 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: gradient }} />
      </div>
      <div
        className="mb-2.5 h-8 w-8 rounded-[12px] flex items-center justify-center text-white shadow-md"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <p className="text-xl font-bold text-stone-900 tabular-nums leading-none tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">{label}</p>
    </div>
  );
}

/** Action button row — liquid glass */
function LiquidAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-3 px-4 py-3 rounded-[18px] bg-white/50 border border-white/70 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:bg-white/70 hover:shadow-md active:scale-[0.98]">
        <div className="h-7 w-7 rounded-[10px] bg-white/80 border border-white/60 flex items-center justify-center text-stone-500 group-hover:text-orange-600 shadow-sm transition-colors shrink-0">
          {icon}
        </div>
        <span className="text-[12px] font-semibold text-stone-700 group-hover:text-stone-900 flex-1 truncate transition-colors">{label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}

/* ─── Section wrapper ─── */
function LiquidSection({
  title, icon, pill, children, actionHref, pillColor,
}: {
  title: string; icon: React.ReactNode; pill?: string;
  children: React.ReactNode; actionHref?: string;
  pillColor?: "neutral" | "orange" | "sky" | "emerald" | "indigo" | "amber" | "rose";
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <GlassPill color={pillColor ?? "neutral"}>
            {icon}
            <span>{title}</span>
          </GlassPill>
        </div>
        {actionHref && (
          <Link
            href={actionHref}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-stone-400 hover:text-orange-500 transition-colors"
          >
            Manage <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <GlassCard className="p-4">
        <div className="relative z-10 space-y-3">
          {children}
        </div>
      </GlassCard>
    </section>
  );
}

/* ─── Main page ─── */
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
  const [greeting, setGreeting] = useState("Good day");

  const chartData = useMemo(() => {
    const total = stats.vendorRevenue + stats.affiliateEarnings;
    return [
      { name: "M", v: total * 0.10 },
      { name: "T", v: total * 0.15 },
      { name: "W", v: total * 0.08 },
      { name: "T", v: total * 0.25 },
      { name: "F", v: total * 0.20 },
      { name: "S", v: total * 0.35 },
      { name: "S", v: total * 0.40 },
    ];
  }, [stats.vendorRevenue, stats.affiliateEarnings]);

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

  const firstName = (profile?.full_name as string)?.split(" ")[0] ?? "there";

  return (
    /* Liquid glass page bg — soft warm white with subtle gradient atmosphere */
    <div
      className="min-h-screen pb-10"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 60% -10%, rgba(251,146,60,0.09) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 10% 80%, rgba(186,230,253,0.12) 0%, transparent 60%), #f5f4f1",
      }}
    >
      <div className="max-w-2xl mx-auto px-3 pt-5 pb-8 sm:px-5 sm:pt-7 space-y-4 sm:space-y-5">

        {/* ── Hero glass card ── */}
        <GlassCard dark className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="relative z-10 flex flex-col gap-4">
            {/* Greeting badge */}
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/[0.12]">
              <Sparkles className="h-3 w-3 text-orange-400" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200/50">{greeting}</span>
            </div>

            {/* Name + roles */}
            <div>
              <h1 className="text-[32px] sm:text-[38px] font-bold text-white leading-none tracking-[-0.02em]">
                {firstName}
                <span className="text-orange-400/40 ml-1">·</span>
              </h1>
              <p className="text-[12px] text-white/30 font-medium mt-1.5">
                {activeRoles.length} {activeRoles.length === 1 ? "role" : "roles"} active
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {activeRoles.map(r => (
                  <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.10] text-[9px] font-semibold uppercase tracking-widest text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Wallet strip */}
            <Link href="/dashboard/wallet" className="group block mt-1">
              <div className="flex items-center justify-between rounded-[20px] bg-white/[0.05] border border-white/[0.09] px-4 py-3.5 hover:bg-white/[0.09] transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-[12px] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-900/30 shrink-0">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25">Wallet</p>
                    <p className="text-[18px] font-bold text-white tabular-nums leading-tight">
                      {loading ? "—" : formatMoney(walletBalance.available, "USD")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/20">Escrow</p>
                    <p className="text-xs font-semibold text-white/40 tabular-nums">{formatMoney(walletBalance.pending, "USD")}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/20 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>
            </Link>

            {/* CTA */}
            <Link
              href="/dashboard/marketplace"
              className="inline-flex items-center justify-center gap-2 self-start px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-[12px] font-bold shadow-[0_4px_16px_rgba(249,115,22,0.35)] transition-all hover:scale-105 active:scale-95 border-t border-white/20"
            >
              Explore Marketplace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlassCard>

        {/* ── Horizontal scroll nav pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {[
            { href: "/dashboard/marketplace", icon: <Globe className="h-3 w-3" />, label: "Market" },
            { href: "/dashboard/orders", icon: <Truck className="h-3 w-3" />, label: "Orders" },
            { href: "/dashboard/withdrawals", icon: <DollarSign className="h-3 w-3" />, label: "Payout" },
            { href: "/dashboard/wallet", icon: <HistoryIcon className="h-3 w-3" />, label: "Ledger" },
          ].map(({ href, icon, label }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full bg-white/60 border border-white/70 backdrop-blur-xl text-[11px] font-semibold text-stone-600 shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/80 hover:text-orange-600 transition-all"
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        {/* ── Revenue chart glass card ── */}
        <GlassCard className="p-4 sm:p-5">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">This week</p>
                <p className="text-[15px] font-bold text-stone-900 mt-0.5 tracking-tight">Financial Pulse</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/50 text-emerald-700 text-[9px] font-semibold uppercase tracking-widest backdrop-blur-xl">
                Live
              </span>
            </div>
            <div className="h-[130px] sm:h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#c4bcb4", fontSize: 9, fontWeight: 600 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px", border: "1px solid rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
                      fontSize: "11px", fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    }}
                    cursor={{ stroke: "rgba(249,115,22,0.2)", strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="v" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#gIncome)" dot={false} activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* ── Buyer ── */}
        <LiquidSection title="Buyer" icon={<ShoppingCart className="h-3 w-3" />} pillColor="sky">
          <div className="grid grid-cols-2 gap-3">
            <LiquidStat value={loading ? "…" : stats.orders} label="Orders" icon={<ShoppingCart className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#3b82f6,#1d4ed8)" />
            <LiquidStat value={loading ? "…" : stats.wishlist} label="Saved" icon={<Heart className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#f43f5e,#e11d48)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LiquidAction href="/dashboard/marketplace" icon={<Globe className="h-3.5 w-3.5" />} label="Marketplace" />
            <LiquidAction href="/dashboard/orders" icon={<Truck className="h-3.5 w-3.5" />} label="Track Orders" />
          </div>
        </LiquidSection>

        {/* ── Vendor missions ── */}
        {activeRoles.includes("vendor") && (
          <LiquidSection title="Missions" icon={<Sparkles className="h-3 w-3" />} pillColor="orange" actionHref="/dashboard/vendor/campaigns">
            <div className="grid grid-cols-2 gap-3">
              <LiquidStat value={stats.activeMissions} label="Active" icon={<Activity className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#f97316,#c2410c)" />
              <LiquidStat value={stats.totalSubmissionsReceived} label="Received" icon={<Video className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LiquidAction href="/dashboard/vendor/campaigns/new" icon={<Plus className="h-3.5 w-3.5" />} label="New Mission" />
              <LiquidAction href="/dashboard/vendor/submissions" icon={<Video className="h-3.5 w-3.5" />} label="Review Queue" />
            </div>
          </LiquidSection>
        )}

        {/* ── Influencer / Creator ── */}
        {activeRoles.includes("influencer") && (
          <LiquidSection title="Creator" icon={<Zap className="h-3 w-3" />} pillColor="indigo" actionHref="/dashboard/influencer">
            <div className="grid grid-cols-2 gap-3">
              <LiquidStat value={stats.missionsJoined} label="Joined" icon={<Package className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#6366f1,#4338ca)" />
              <LiquidStat value={stats.mySubmissions} label="Clips" icon={<CheckCircle className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#14b8a6,#0f766e)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LiquidAction href="/ugc" icon={<Globe className="h-3.5 w-3.5" />} label="Explore Missions" />
              <LiquidAction href="/dashboard/influencer" icon={<Video className="h-3.5 w-3.5" />} label="Creator Studio" />
            </div>
          </LiquidSection>
        )}

        {/* ── Affiliate ── */}
        {activeRoles.includes("affiliate") && (
          <LiquidSection title="Affiliate" icon={<Link2 className="h-3 w-3" />} pillColor="amber" actionHref="/dashboard/links">
            <div className="grid grid-cols-2 gap-3">
              <LiquidStat value={loading ? "…" : formatMoney(stats.affiliateEarnings, "USD")} label="Earnings" icon={<DollarSign className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#f59e0b,#b45309)" />
              <LiquidStat value={loading ? "…" : stats.affiliateLinks} label="Links" icon={<Link2 className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#f97316,#c2410c)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LiquidAction href="/dashboard/links" icon={<Plus className="h-3.5 w-3.5" />} label="My Links" />
              <LiquidAction href="/dashboard/affiliate/analytics" icon={<Activity className="h-3.5 w-3.5" />} label="Performance" />
            </div>
          </LiquidSection>
        )}

        {/* ── Community ── */}
        {(stats.communitiesJoined > 0 || stats.communitiesCreated > 0) && (
          <LiquidSection title="Community" icon={<Users className="h-3 w-3" />} pillColor="emerald" actionHref="/dashboard/community/analytics">
            <div className="grid grid-cols-2 gap-3">
              <LiquidStat value={stats.communitiesJoined} label="Joined" icon={<Users className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#10b981,#059669)" />
              <LiquidStat value={stats.communitiesCreated} label="Owned" icon={<Plus className="h-3.5 w-3.5" />} gradient="linear-gradient(135deg,#14b8a6,#0d9488)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <LiquidAction href="/communities" icon={<Globe className="h-3.5 w-3.5" />} label="Browse Hub" />
              <LiquidAction href="/communities/create" icon={<Plus className="h-3.5 w-3.5" />} label="Create Space" />
            </div>
          </LiquidSection>
        )}

      </div>
    </div>
  );
}