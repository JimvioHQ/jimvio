"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MousePointer, ShoppingCart, DollarSign, TrendingUp, BarChart3, Package, Zap, Target, ShieldCheck, Activity, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

export default function AffiliateAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);
      if (aff) {
        const { data } = await supabase
          .from("affiliate_links")
          .select("id, total_clicks, total_conversions, total_earnings, products(id, name, slug, images)")
          .eq("affiliate_id", aff.id)
          .order("total_clicks", { ascending: false });
        setLinks(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 capitalize pl-1">Loading Analytics...</p>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-md w-full p-6 sm:p-8 text-center rounded-2xl border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--color-surface-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-[var(--color-border)] shadow-sm">
             <ShieldCheck className="h-7 w-7 text-stone-300" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-3 tracking-tight">Access Denied</h2>
          <p className="text-stone-500 text-sm mb-8 leading-relaxed font-medium">Please activate your affiliate account to view detailed analytics.</p>
          <Button asChild className="w-full h-11 sm:h-12 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold hover:bg-black dark:hover:bg-stone-200 active:scale-95 transition-all text-sm shadow-sm border-none">
             <Link href="/dashboard/roles">Activate Now</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks ?? 0), 0);
  const totalConversions = links.reduce((s, l) => s + (l.total_conversions ?? 0), 0);
  const totalEarnings = links.reduce((s, l) => s + Number(l.total_earnings ?? 0), 0);

  const chartData = links.slice(0, 10).map((l, i) => {
    const name = (l.products as { name?: string })?.name ?? `Link ${i + 1}`;
    return {
      name: name.length > 12 ? name.slice(0, 10) + "…" : name,
      clicks: l.total_clicks ?? 0,
      conversions: l.total_conversions ?? 0,
    };
  });

  const topByEarnings = [...links].sort((a, b) => Number(b.total_earnings ?? 0) - Number(a.total_earnings ?? 0)).slice(0, 5);

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.04) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.04) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pt-6 sm:pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
           <div className="flex items-center gap-3 sm:gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-sm hover:bg-white dark:bg-surface active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard/links"><ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Link>
              </Button>
              <div className="space-y-0.5 sm:space-y-1">
                 <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Affiliate Analytics</h1>
                 <p className="text-[9px] sm:text-[11px] font-bold text-stone-400 capitalize pl-0.5">Performance Overview</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-surface p-2 sm:p-3 rounded-xl border border-stone-100 dark:border-border shadow-sm">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse ml-1.5 sm:ml-2" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-500 pr-3 sm:pr-4">Active Monitoring</span>
           </div>
        </div>

        {/* Stats Grid - Smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
           <GlassCard className="p-4 sm:p-5 flex flex-col justify-between rounded-2xl bg-white dark:bg-surface/60 border-white shadow-sm transition-all hover:bg-white dark:bg-surface/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-3 sm:mb-4">
                 <MousePointer className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{totalClicks.toLocaleString()}</p>
                 <p className="text-[8px] sm:text-[9px] font-bold capitalize text-stone-400 mt-1">Total Clicks</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-5 flex flex-col justify-between rounded-2xl bg-white dark:bg-surface/60 border-white shadow-sm transition-all hover:bg-white dark:bg-surface/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 sm:mb-4">
                 <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{totalConversions.toLocaleString()}</p>
                 <p className="text-[8px] sm:text-[9px] font-bold capitalize text-stone-400 mt-1">Sales Made</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-5 flex flex-col justify-between rounded-2xl bg-white dark:bg-surface/60 border-white shadow-sm transition-all hover:bg-white dark:bg-surface/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3 sm:mb-4">
                 <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight tabular-nums">{formatMoney(totalEarnings, "USD")}</p>
                 <p className="text-[8px] sm:text-[9px] font-bold capitalize text-stone-400 mt-1">Total Earnings</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-5 flex flex-col justify-between rounded-2xl bg-white dark:bg-surface/60 border-white shadow-sm transition-all hover:bg-white dark:bg-surface/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3 sm:mb-4">
                 <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{links.length}</p>
                 <p className="text-[8px] sm:text-[9px] font-bold capitalize text-stone-400 mt-1">Active Links</p>
              </div>
           </GlassCard>
        </div>

        {/* Charts - Soft size */}
        <GlassCard className="rounded-2xl border-white dark:border-border bg-white dark:bg-surface/60 shadow-sm overflow-hidden">
           <div className="p-5 sm:p-8 border-b border-stone-50 dark:border-border flex items-center justify-between">
              <div>
                 <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">Performance Summary</h3>
                 <p className="text-[9px] sm:text-[10px] font-bold capitalize text-stone-400 mt-1">Clicks vs Sales by product</p>
              </div>
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-stone-300" />
           </div>
           <div className="p-4 sm:p-8 h-[250px] sm:h-[300px]">
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <BarChart3 className="h-10 w-10 text-stone-100 mb-4" />
                  <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">No link activity detected yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -15, right: 0, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#a8a29e", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#a8a29e", fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,146,60,0.03)' }}
                      contentStyle={{ background: "#fff", border: "1px solid #f2f2f2", borderRadius: 16, fontSize: 10, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}
                    />
                    <Bar dataKey="clicks" stackId="a" fill="#38bdf8" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="conversions" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
           </div>
        </GlassCard>

        {/* Product Registry - Smaller padding */}
        <GlassCard className="rounded-2xl border-white dark:border-border bg-white dark:bg-surface/60 shadow-sm overflow-hidden mt-4">
           <div className="p-5 sm:p-8 border-b border-stone-50 dark:border-border flex items-center justify-between">
              <div>
                 <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">Top Products</h3>
                 <p className="text-[9px] sm:text-[10px] font-bold capitalize text-stone-400 mt-1">Sorted by revenue generated</p>
              </div>
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-stone-300" />
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-stone-50/40 dark:bg-surface/40">
                    <th className="py-4 sm:py-5 pl-4 sm:pl-8 pr-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-50 dark:border-border">Product</th>
                    <th className="py-4 sm:py-5 px-4 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-50 dark:border-border">Clicks</th>
                    <th className="py-4 sm:py-5 px-4 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 border-b border-stone-50 dark:border-border">Sales</th>
                    <th className="py-4 sm:py-5 pl-4 pr-4 sm:pr-8 text-right text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-stone-50 dark:border-border">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 dark:divide-border/60">
                  {topByEarnings.length === 0 ? (
                    <tr>
                       <td colSpan={4} className="py-16 sm:py-20 text-center">
                          <p className="text-[10px] sm:text-[11px] font-bold text-stone-300 uppercase tracking-widest">Awaiting First Sale...</p>
                       </td>
                    </tr>
                  ) : (
                    topByEarnings.map((l) => {
                      const product = l.products as { name?: string; slug?: string; images?: string[] } | null;
                      const imgSrc = product && Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
                      return (
                        <tr key={l.id} className="hover:bg-stone-50/50 dark:hover:bg-surface transition-all duration-300">
                           <td className="py-4 sm:py-6 pl-4 sm:pl-8 pr-4">
                             <div className="flex items-center gap-3 sm:gap-4">
                               <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-white dark:bg-surface-secondary border border-stone-50 dark:border-border shadow-sm overflow-hidden flex items-center justify-center p-0.5 sm:p-1">
                                 {imgSrc ? (
                                   <img src={imgSrc} alt="" className="w-full h-full object-cover rounded-md" />
                                 ) : (
                                   <Package className="h-4 w-4 sm:h-5 sm:w-5 text-stone-300" />
                                 )}
                               </div>
                               <div className="min-w-0">
                                  {product?.slug ? (
                                    <Link href={`/marketplace/${product.slug}`} className="font-bold text-[13px] sm:text-sm text-stone-900 dark:text-white hover:text-orange-600 transition-colors truncate block tracking-tight max-w-[150px] sm:max-w-xs">
                                      {product?.name ?? "Default Link"}
                                    </Link>
                                  ) : (
                                    <span className="font-bold text-[13px] sm:text-sm text-stone-900 dark:text-white tracking-tight max-w-[150px] sm:max-w-xs truncate block">Manual Link</span>
                                  )}
                               </div>
                             </div>
                           </td>
                           <td className="py-4 sm:py-6 px-4 text-right">
                             <p className="text-[14px] sm:text-base font-bold text-stone-900 dark:text-white tabular-nums">{l.total_clicks ?? 0}</p>
                           </td>
                           <td className="py-4 sm:py-6 px-4 text-right">
                             <p className="text-[14px] sm:text-base font-bold text-stone-900 dark:text-white tabular-nums">{l.total_conversions ?? 0}</p>
                           </td>
                           <td className="py-4 sm:py-6 pl-4 pr-4 sm:pr-8 text-right">
                             <p className="text-[14px] sm:text-base font-bold text-emerald-600 tabular-nums">{formatMoney(Number(l.total_earnings ?? 0), "USD")}</p>
                           </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
           </div>
         </GlassCard>
      </div>
    </div>
  );
}

// Helper icons
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

