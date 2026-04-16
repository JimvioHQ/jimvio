"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { MousePointer, Globe, TrendingUp, ArrowRight, BarChart3, Filter, Zap, Activity, Smartphone, Target } from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { createClient } from "@/lib/supabase/client";

export default function AffiliateClicksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const affRes = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      if (affRes.data) {
        const { data: lnks } = await supabase
          .from("affiliate_links")
          .select("*, products(name, images)")
          .eq("affiliate_id", affRes.data.id)
          .order("total_clicks", { ascending: false });
        
        setLinks(lnks || []);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setChartData(months.map(m => ({
          month: m,
          revenue: Math.floor(Math.random() * 5000), 
          orders: Math.floor(Math.random() * 200),
          affiliate: 0
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks || 0), 0);
  const totalUnique = links.reduce((s, l) => s + (l.unique_clicks || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-[32px] bg-white dark:bg-zinc-900 border border-white shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <MousePointer className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Signal Acquisition</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Processing Real-time Traffic Matrix</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.05) 0%, transparent 55%), #f0ede8",
      }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-white dark:bg-zinc-900 border border-white shadow-2xl shrink-0">
                    <Activity className="h-8 w-8 text-orange-500" />
                 </div>
                 Traffic Intelligence
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Real-time Propagation Analytics & Acquisition Mapping
              </p>
           </div>
           <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/40 p-1.5 rounded-full border border-white shadow-xl backdrop-blur-xl">
              <div className="w-3 h-3 rounded-full bg-emerald-500 ml-4 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white pr-6 pl-2">Live Node Tracking</span>
           </div>
        </div>

        {/* Breakdown Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white dark:bg-zinc-900/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-orange-50 border border-orange-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <MousePointer className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{totalClicks.toLocaleString()}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Pulse Acquisitions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white dark:bg-zinc-900/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Globe className="h-7 w-7 text-sky-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{totalUnique.toLocaleString()}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Unique Identity Markers</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white dark:bg-zinc-900/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <TrendingUp className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">4.5%</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Propagation Yield</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white dark:bg-zinc-900/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Smartphone className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">72% Mobile</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Hardware Distribution</p>
              </div>
           </GlassCard>
        </div>

        {/* Intelligence Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <GlassCard className="lg:col-span-8 rounded-[48px] border-white bg-white dark:bg-zinc-900/60 shadow-xl overflow-hidden group">
              <div className="p-10 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                 <div>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Signal Propagation Matrix</h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Acquisition Log (12-Cycle Window)</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500">
                       <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> Signal Flow
                    </div>
                 </div>
              </div>
              <div className="p-10 pt-16">
                 <RevenueChart data={chartData} />
              </div>
           </GlassCard>

           <GlassCard className="lg:col-span-4 rounded-[48px] border-white bg-white dark:bg-zinc-900/60 shadow-xl overflow-hidden flex flex-col">
              <div className="p-10 border-b border-stone-100 dark:border-zinc-800">
                 <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">Target Referrals</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">High-Density Acquisition Nodes</p>
              </div>
              <div className="p-10 space-y-8 flex-1">
                 {links.slice(0, 6).map((l, i) => (
                    <div key={l.id} className="space-y-3 group/item">
                       <div className="flex items-center justify-between">
                          <span className="font-black text-stone-900 dark:text-white tracking-tight truncate max-w-[180px]">{l.products?.name || l.link_code}</span>
                          <span className="font-black text-stone-400 text-[11px] uppercase tracking-widest">{(l.total_clicks || 0).toLocaleString()} Pulse</span>
                       </div>
                       <div className="h-3 bg-white dark:bg-zinc-900 border border-stone-50 rounded-full overflow-hidden shadow-sm">
                          <div 
                             className="h-full bg-stone-900 rounded-full transition-all duration-[2000ms] ease-out group-hover/item:bg-orange-500" 
                             style={{ width: `${Math.min(100, ((l.total_clicks || 0) / (links[0]?.total_clicks || 1)) * 100)}%` }} 
                          />
                       </div>
                    </div>
                 ))}
                 {links.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                       <Target className="h-10 w-10 text-stone-100" />
                       <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest">No target data acquired</p>
                    </div>
                 )}
              </div>
           </GlassCard>
        </div>

        {/* Global Registry Log */}
        <GlassCard className="rounded-[48px] border-white bg-white dark:bg-zinc-900/60 shadow-xl overflow-hidden">
           <div className="p-10 border-b border-stone-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Detailed Node Registry</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Granular Link Performance Matrix</p>
              </div>
              <Button className="h-14 px-8 rounded-full bg-white dark:bg-zinc-900 text-stone-900 dark:text-white border-white shadow-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-stone-50 dark:bg-zinc-900/50">
                 <Filter className="h-4 w-4 mr-3" /> Calibrate View
              </Button>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/40">
                    <th className="py-8 pl-10 pr-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-zinc-800">Target Node / Link</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-zinc-800">Frequency</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-zinc-800">Unique Identity</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-zinc-800">Yield %</th>
                    <th className="py-8 px-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-zinc-800">Status</th>
                    <th className="py-8 pr-10 border-b border-stone-100 dark:border-zinc-800" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {links.map(l => (
                    <tr key={l.id} className="hover:bg-white dark:bg-zinc-900/80 transition-all duration-500 group">
                      <td className="pl-10 pr-6 py-10">
                        <div className="space-y-1.5">
                           <p className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">{l.products?.name || "Global Deployment"}</p>
                           <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5" /> MD5_{l.link_code}
                           </p>
                        </div>
                      </td>
                      <td className="px-6 py-10 text-right">
                         <p className="text-2xl font-black text-stone-900 dark:text-white tabular-nums tracking-tighter">{(l.total_clicks || 0).toLocaleString()}</p>
                         <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Gross Pulse</p>
                      </td>
                      <td className="px-6 py-10 text-right">
                         <p className="text-xl font-black text-stone-400 tabular-nums tracking-tighter">{(l.unique_clicks || 0).toLocaleString()}</p>
                         <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Unique Node</p>
                      </td>
                      <td className="px-6 py-10 text-right">
                         <p className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">24%</p>
                         <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">High Intensity</p>
                      </td>
                      <td className="px-6 py-10 text-center">
                         <GlassPill color="emerald" className="mx-auto px-4 py-2 font-black border-white shadow-sm">ACTIVE</GlassPill>
                      </td>
                      <td className="pr-10 py-10 text-right">
                         <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 border border-transparent group-hover:bg-stone-900 group-hover:text-white transition-all shadow-lg active:scale-90">
                            <ArrowRight className="h-5 w-5" />
                         </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
