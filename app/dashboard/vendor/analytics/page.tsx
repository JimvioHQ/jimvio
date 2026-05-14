"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
   BarChart3,
   Eye,
   ShoppingCart,
   DollarSign,
   TrendingUp,
   Package,
   ArrowLeft,
   Activity,
   Zap,
   ShieldCheck,
   TrendingDown,
   ArrowRight,
   Target
} from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { groupOrderLineRowsToCartOrders } from "@/lib/currency/format";
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";

export default function VendorAnalyticsPage() {
   const { formatMoney, formatCartTotalsLabel } = useCurrency();
   const supabase = createClient();
   const [vendorId, setVendorId] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [revenueLineItems, setRevenueLineItems] = useState<
      { total_price: number | string; orders?: { currency?: string | null } | null }[]
   >([]);
   const [stats, setStats] = useState({
      totalViews: 0,
      totalOrders: 0,
      totalRevenue: 0,
      revenueDisplayCurrency: "USD",
      conversionRate: 0,
      viewsByMonth: [] as { month: string; views: number }[],
      ordersByMonth: [] as { month: string; orders: number }[],
      revenueByMonth: [] as { month: string; revenue: number }[],
   });

   useEffect(() => {
      async function load() {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;
         const { data: v } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
         if (!v) {
            setRevenueLineItems([]);
            setLoading(false);
            return;
         }
         setVendorId(v.id);

         const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear() };
         });

         const [productsRes, orderItemsRes] = await Promise.all([
            supabase.from("products").select("id, view_count").eq("vendor_id", v.id).eq("is_active", true),
            supabase
               .from("order_items")
               .select("total_price, created_at, orders(currency)")
               .eq("vendor_id", v.id)
               .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
         ]);

         const products = productsRes.data ?? [];
         const items = orderItemsRes.data ?? [];
         const totalViews = products.reduce((s: number, p: { id: string; view_count: number | null }) => s + (Number(p.view_count) ?? 0), 0);
         const totalOrders = items.length;
         const totalRevenue = items.reduce((s: number, i: { total_price: number | string }) => s + Number(i.total_price), 0);
         setRevenueLineItems(items as typeof revenueLineItems);
         const revenueDisplayCurrency = (items[0] as { orders?: { currency?: string } } | undefined)?.orders?.currency?.toUpperCase() || "USD";
         const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 10000) / 100 : 0;

         const viewsByMonth = months.map((m) => ({ month: m.label, views: 0 }));
         const ordersByMonth = months.map((m) => ({ month: m.label, orders: 0 }));
         const revenueByMonth = months.map((m) => ({ month: m.label, revenue: 0 }));

         items.forEach((item: any) => {
            const d = new Date(item.created_at);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            const mi = months.findIndex((x) => x.key === key);
            if (mi >= 0) {
               ordersByMonth[mi].orders += 1;
               revenueByMonth[mi].revenue += Number(item.total_price);
            }
         });

         setStats({
            totalViews,
            totalOrders,
            totalRevenue,
            revenueDisplayCurrency,
            conversionRate,
            viewsByMonth,
            ordersByMonth,
            revenueByMonth,
         });
         setLoading(false);
      }
      load();
   }, []);

   const totalRevenueLabel = useMemo(() => {
      if (!revenueLineItems.length) return "";
      return formatCartTotalsLabel(groupOrderLineRowsToCartOrders(revenueLineItems));
   }, [revenueLineItems, formatCartTotalsLabel]);

   if (loading) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
            <div className="relative">
               <div className="absolute inset-0 bg-violet-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
               <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 border-2 border-t-violet-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
                  <Activity className="h-10 w-10 text-stone-900 dark:text-white" />
               </div>
            </div>
            <div className="text-center space-y-3">
               <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Market Performance Matrix</h2>
               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Processing Commercial Intelligence Hub</p>
            </div>
         </div>
      );
   }

   if (!vendorId) {
      return (
         <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f0ede8" }}>
            <GlassCard className="max-w-md w-full p-12 text-center rounded-sm border-white shadow-none">
               <div className="w-24 h-24 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-10 border border-white shadow-none">
                  <ShieldCheck className="h-10 w-10 text-stone-100" />
               </div>
               <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-4 tracking-tighter">Proxy Activation Required</h2>
               <p className="text-stone-500 text-sm mb-12 leading-relaxed font-black uppercase tracking-widest">Identify required vendor credentials to access global commerce analytics.</p>
               <Button asChild className="w-full h-16 rounded-sm bg-stone-900 text-white hover:bg-black font-black active:scale-95 transition-all text-[11px] uppercase tracking-widest shadow-none">
                  <Link href="/dashboard/roles">Verify Protocol <ArrowRight className="h-4 w-4 ml-2" /></Link>
               </Button>
            </GlassCard>
         </div>
      );
   }

   return (
      <div
         className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
         style={{
            background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(99,102,241,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(251,146,60,0.05) 0%, transparent 55%), #f0ede8",
         }}
      >
         <GlassAmbientGlow color="indigo" position="top-right" />
         <GlassAmbientGlow color="orange" position="bottom-left" />

         <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">

            {/* Header Protocol */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
               <div className="flex items-center gap-6">
                  <Button asChild variant="ghost" size="icon" className="shrink-0 h-14 w-14 rounded-sm bg-white dark:bg-surface border border-white shadow-none hover:bg-stone-50 dark:bg-surface/50 active:scale-95 transition-all text-stone-600">
                     <Link href="/dashboard"><ArrowLeft className="h-6 w-6" /></Link>
                  </Button>
                  <div className="space-y-2">
                     <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter">Commerce Signals</h1>
                     <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em]">Market Intelligence Hub & Yield Attribution</p>
                  </div>
               </div>

               <div className="flex items-center gap-4 bg-white dark:bg-surface/40 p-1.5 rounded-sm border border-white shadow-none backdrop-blur-xl">
                  <div className="w-3 h-3 rounded-sm bg-indigo-500 ml-4 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white pr-6 pl-2">Signal Tracking Optimized</span>
               </div>
            </div>

            {/* Intelligence Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
                  <div className="w-14 h-14 rounded-sm bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                     <Eye className="h-7 w-7 text-sky-500" />
                  </div>
                  <div>
                     <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.totalViews.toLocaleString()}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Node Impressions</p>
                  </div>
               </GlassCard>
               <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
                  <div className="w-14 h-14 rounded-sm bg-amber-50 border border-amber-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                     <ShoppingCart className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                     <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.totalOrders}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Success Acquisitions</p>
                  </div>
               </GlassCard>
               <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
                  <div className="w-14 h-14 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                     <DollarSign className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                     <p className="text-3xl font-black text-emerald-600 tracking-tighter leading-none tabular-nums truncate max-w-full">{totalRevenueLabel === "" ? "$0" : totalRevenueLabel}</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Gross Liquidity Yield</p>
                  </div>
               </GlassCard>
               <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
                  <div className="w-14 h-14 rounded-sm bg-violet-50 border border-violet-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                     <TrendingUp className="h-7 w-7 text-violet-500" />
                  </div>
                  <div>
                     <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.conversionRate}%</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Attribution Velocity</p>
                  </div>
               </GlassCard>
            </div>

            {/* Visualization Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
               <GlassCard className="rounded-sm border-white bg-white dark:bg-surface/60 shadow-none overflow-hidden group">
                  <div className="p-10 border-b border-stone-100 dark:border-border flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Acquisition Trajectory</h3>
                        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Order accumulation cycles (6M)</p>
                     </div>
                     <Target className="h-8 w-8 text-stone-100" />
                  </div>
                  <div className="p-10 h-[360px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.ordersByMonth} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                           <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} />
                           <YAxis tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} />
                           <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.4)' }}
                              contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,1)", borderRadius: 24, fontSize: 10, fontWeight: 900, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                           />
                           <Bar dataKey="orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </GlassCard>

               <GlassCard className="rounded-sm border-white bg-white dark:bg-surface/60 shadow-none overflow-hidden group">
                  <div className="p-10 border-b border-stone-100 dark:border-border flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Settlement Flux</h3>
                        <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Liquidity volume flow (6M)</p>
                     </div>
                     <Zap className="h-8 w-8 text-stone-100" />
                  </div>
                  <div className="p-10 h-[360px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.revenueByMonth} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                           <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} />
                           <YAxis tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val > 1000 ? (val / 1000).toFixed(1) + 'k' : val}`} />
                           <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.4)' }}
                              formatter={(val: number) => formatMoney(val, stats.revenueDisplayCurrency)}
                              contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,1)", borderRadius: 24, fontSize: 10, fontWeight: 900, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                           />
                           <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </GlassCard>
            </div>

            {/* Operational Excellence Hub */}
            <GlassCard className="p-12 rounded-sm border-white bg-stone-900 text-white relative overflow-hidden shadow-none mt-12">
               <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 blur-[120px] rounded-sm translate-x-1/2 -translate-y-1/2" />
               <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                  <div className="space-y-6 text-center md:text-left">
                     <div className="flex items-center justify-center md:justify-start gap-4">
                        <TrendingUp className="h-6 w-6 text-indigo-400" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">Optimization Matrix</h3>
                     </div>
                     <h2 className="text-4xl font-black tracking-tighter leading-none">Scale Yield Velocity</h2>
                     <p className="text-stone-400 text-base font-bold leading-relaxed max-w-xl">
                        Deploy targeted marketing campaigns and optimize inventory hubs to maximize global acquisition throughput and commercial attribution.
                     </p>
                  </div>
                  <Button asChild className="h-20 px-12 rounded-sm bg-white dark:bg-surface text-stone-900 dark:text-white font-black text-[12px] uppercase tracking-[0.3em] shadow-none active:scale-95 transition-all hover:bg-stone-50 dark:bg-surface/50 border-none">
                     <Link href="/dashboard/products">Manage Inventory Hub <ArrowRight className="h-5 w-5 ml-4" /></Link>
                  </Button>
               </div>
            </GlassCard>
         </div>
      </div>
   );
}

