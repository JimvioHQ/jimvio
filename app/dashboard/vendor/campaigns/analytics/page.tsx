"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { BarChart3, Megaphone, Flag, Wallet, CheckCircle, Loader2, Target, TrendingUp } from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";

export default function CampaignAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/campaigns/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
         <div className="relative">
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
             <BarChart3 className="h-10 w-10 text-stone-900 dark:text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Analytics</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Aggregating Mission Intelligence</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-6xl mx-auto space-y-12 px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-sm bg-white dark:bg-surface border border-white shadow-none shrink-0">
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                 </div>
                 Campaign Performance
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Detailed overview of your campaign efficiency and reach
              </p>
           </div>
           
           <div className="flex items-center gap-4 bg-white dark:bg-surface/40 p-1.5 rounded-sm border border-white shadow-none backdrop-blur-xl">
              <Loader2 className="h-3.5 w-3.5 text-stone-400 ml-4 animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white pr-6 pl-2">Live Sync</span>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-orange-50 border border-orange-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Target className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{data?.activeCount ?? 0}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Active Missions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Flag className="h-7 w-7 text-sky-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{data?.totalSubmissions ?? 0}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Submissions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{data?.qualityRate ?? 0}%</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Approval Rate</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-stone-900 text-white flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <TrendingUp className="h-7 w-7" />
              </div>
              <div>
                 <p className="text-3xl font-black text-emerald-600 tracking-tighter leading-none tabular-nums truncate max-w-full">
                   {formatMoney(data?.totalSpent ?? 0, "USD")}
                 </p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Spent</p>
              </div>
           </GlassCard>
        </div>

        {/* Main Chart */}
        <GlassCard className="rounded-sm border-white bg-white dark:bg-surface/60 shadow-none overflow-hidden">
           <div className="p-10 border-b border-stone-100 dark:border-border flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Budget Utilization</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Mission-critical expenditure metrics</p>
              </div>
              <BarChart3 className="h-8 w-8 text-stone-100" />
           </div>
           
           <div className="p-10 h-[500px]">
             {data?.chartData && data.chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                   <XAxis 
                     type="number" 
                     tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 700 }} 
                     axisLine={false} 
                     tickLine={false} 
                     tickFormatter={(v) => `${v > 1000 ? (v/1000).toFixed(1) + "k" : v}`} 
                   />
                   <YAxis 
                     dataKey="campaign" 
                     type="category" 
                     width={180} 
                     tick={{ fontSize: 12, fill: "#0f172a", fontWeight: 800 }} 
                     axisLine={false} 
                     tickLine={false} 
                   />
                   <Tooltip
                     cursor={{ fill: "rgba(251,146,60,0.04)" }}
                     contentStyle={{ background: "#fff", border: "1px solid #f2f2f2", borderRadius: 24, fontSize: 13, fontWeight: "bold", boxShadow: "0 20px 40px rgba(0,0,0,0.05)" }}
                     labelStyle={{ color: "#0f172a", marginBottom: 4 }}
                   />
                   <Bar dataKey="deployed" name="Budget Spent" fill="#f97316" radius={[0, 12, 12, 0]} barSize={32} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-white dark:bg-surface rounded-sm border border-white shadow-none flex items-center justify-center text-stone-100">
                     <BarChart3 className="h-10 w-10" />
                  </div>
                  <p className="text-[11px] font-black text-stone-300 uppercase tracking-widest">No historical data available yet</p>
               </div>
             )}
           </div>
        </GlassCard>

      </div>
    </div>
  );
}

