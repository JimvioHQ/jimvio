"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Star, TrendingUp, Users, Target, User, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

export default function AffiliateLeaderboardPage() {
  const { formatMoney } = useCurrency();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("affiliates")
        .select("id, affiliate_code, total_earnings, total_conversions, total_clicks")
        .order("total_earnings", { ascending: false })
        .limit(10);
      
      setLeaders(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-none bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-none animate-spin m-2" />
            <Trophy className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Propagator Census</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Ranking Global Trade Intelligence Nodes</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,191,36,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(20,184,166,0.05) 0%, transparent 55%), #f0ede8",
      }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-none bg-white dark:bg-surface border border-white shadow-none shrink-0">
                    <Trophy className="h-8 w-8 text-amber-500" />
                 </div>
                 The Hall of Fame
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Global Trade Propagation Leaderboard & High-Density Hubs
              </p>
           </div>
           <div className="bg-amber-100/40 backdrop-blur-xl text-amber-700 px-8 py-3.5 rounded-none text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-amber-200/50 shadow-none animate-pulse">
              <Star className="h-4 w-4 fill-amber-500" /> Cycle Prize Pool: $5,000 USD
           </div>
        </div>

        {/* Top 3 Spotlight Node */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
             {leaders.slice(0,3).map((l, i) => (
                <GlassCard key={l.id} className={cn(
                  "relative overflow-hidden group transition-all duration-700 hover:-translate-y-4 rounded-none",
                  i === 0 ? "h-[500px] border-amber-400/50 bg-amber-50/20 shadow-[0_20px_60px_rgba(251,191,36,0.15)] order-1 md:order-2" : 
                  i === 1 ? "h-[440px] border-stone-200 dark:border-border bg-white dark:bg-surface/60 order-2 md:order-1" : 
                  "h-[400px] border-orange-200 bg-white dark:bg-surface/60 order-3 md:order-3"
                )}>
                   <div className="absolute top-10 right-10 opacity-5 transition-transform group-hover:scale-125 duration-[2000ms]">
                      {i === 0 ? <Trophy className="h-40 w-40" /> : <Medal className="h-40 w-40" />}
                   </div>
                   <div className="p-10 text-center h-full flex flex-col justify-between relative z-10">
                      <div className="space-y-6">
                         <div className="relative inline-block mx-auto mt-4">
                            <Avatar className="h-32 w-32 border-8 border-white shadow-none rounded-none">
                              <AvatarFallback className={cn("text-4xl font-black text-white rounded-none", i === 0 ? "bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]" : i === 1 ? "bg-stone-400" : "bg-orange-500")}>
                                {l.affiliate_code?.slice(0,2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-4 -right-4 w-12 h-12 rounded-none border-4 border-white flex items-center justify-center font-black text-white text-[16px] shadow-none",
                              i === 0 ? "bg-amber-500 animate-bounce" : i === 1 ? "bg-stone-400" : "bg-orange-500"
                            )}>
                              {i + 1}
                            </div>
                         </div>
                         <div>
                           <p className="font-black text-2xl text-stone-900 dark:text-white tracking-tighter">@{l.affiliate_code}</p>
                           <p className="text-[10px] font-black uppercase text-stone-400 tracking-[0.3em] mt-2">{l.total_conversions || 0} Acquisitions</p>
                         </div>
                      </div>
                      <div className="pt-8">
                        <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter drop-shadow-none">{formatMoney(Number(l.total_earnings), "USD")}</p>
                        <GlassPill color={i === 0 ? "amber" : "default"} className="mt-6 text-[10px] font-black py-2 shadow-none border-white">
                           {i === 0 ? "ELITE TITAN" : "MASTER PARTNER"}
                        </GlassPill>
                      </div>
                   </div>
                </GlassCard>
             ))}
           </div>

           {/* Network Tier Hub */}
           <GlassCard className="lg:col-span-4 rounded-none bg-stone-900 text-white flex flex-col justify-between relative overflow-hidden shadow-none border-none">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 blur-[120px] rounded-none translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/20 blur-[120px] rounded-none -translate-x-1/2 translate-y-1/2 pointer-events-none" />
              <div className="p-12 space-y-10 relative z-10">
                 <div className="space-y-4">
                    <ShieldCheck className="h-10 w-10 text-emerald-400 mb-6" />
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/50">Current Identity Stat</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter leading-none">PLATINUM NODE</h3>
                 </div>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-4 text-[11px] font-black text-white/60 uppercase tracking-widest"><TrendingUp className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" /> Conv. Velocity</div>
                       <span className="font-black text-xl text-emerald-400 tabular-nums tracking-tighter">8.4%</span>
                    </div>
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-4 text-[11px] font-black text-white/60 uppercase tracking-widest"><Users className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" /> Propagations</div>
                       <span className="font-black text-xl text-white tabular-nums tracking-tighter">1.2K+</span>
                    </div>
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-4 text-[11px] font-black text-white/60 uppercase tracking-widest"><Target className="h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform" /> Global Reach</div>
                       <span className="font-black text-xl text-orange-400 tabular-nums tracking-tighter">450K</span>
                    </div>
                 </div>
                 <Button className="w-full bg-white dark:bg-surface text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50 font-black text-[11px] uppercase tracking-widest h-16 rounded-none shadow-none active:scale-95 transition-all mt-4 border-none">
                    Recalibrate Tier <Zap className="h-4 w-4 ml-3" />
                 </Button>
              </div>
           </GlassCard>
        </div>

        {/* Global Registry Log */}
        <GlassCard className="rounded-none border-white bg-white dark:bg-surface/60 shadow-none overflow-hidden">
           <div className="p-10 border-b border-stone-100 dark:border-border flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Global Rankings</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Total trade flow & node performance registry</p>
              </div>
              <div className="bg-white dark:bg-surface/60 p-2 rounded-none border border-white shadow-none flex items-center gap-2">
                 <div className="px-6 py-2 rounded-none bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest shadow-none">Volume Flow</div>
                 <div className="px-6 py-2 rounded-none text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-900 dark:text-white transition-colors cursor-pointer">Acquisition Yield</div>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/40">
                    <th className="py-8 pl-10 w-24 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Pos</th>
                    <th className="py-8 px-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Trade Proxy</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Settled Volume</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Pulse Count</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b border-stone-100 dark:border-border">Yield Flux</th>
                    <th className="py-8 pr-10 border-b border-stone-100 dark:border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {leaders.map((l, i) => (
                    <tr key={l.id} className="hover:bg-white dark:bg-surface/80 transition-all duration-500 group">
                      <td className="py-10 pl-10">
                         <div className={cn(
                           "flex items-center justify-center w-12 h-12 rounded-none text-[14px] font-black border shadow-none transition-transform group-hover:scale-110",
                           i < 3 ? "bg-amber-100 text-amber-600 border-amber-200/50" : "bg-white dark:bg-surface text-stone-300 border-white shadow-none"
                         )}>{i+1}</div>
                      </td>
                      <td className="py-10 px-6">
                        <div className="flex items-center gap-6">
                          <Avatar className="h-14 w-14 border border-white shadow-none rounded-none group-hover:scale-105 transition-transform duration-500">
                            <AvatarFallback className="text-[14px] font-black bg-stone-50 dark:bg-surface/50 text-stone-900 dark:text-white rounded-none">@{l.affiliate_code?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">@{l.affiliate_code}</p>
                            <p className="text-[10px] text-stone-300 font-black uppercase tracking-widest mt-1">Intelligence Proxy</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-10 px-6 text-right font-black text-2xl text-stone-900 dark:text-white tabular-nums tracking-tighter">{formatMoney(Number(l.total_earnings), "USD")}</td>
                      <td className="py-10 px-6 text-right text-lg font-black text-stone-400 tabular-nums tracking-tighter">{(l.total_clicks || 0).toLocaleString()}</td>
                      <td className="py-10 px-6 text-right text-2xl font-black text-emerald-500 tabular-nums tracking-tighter">{(l.total_conversions || 0).toLocaleString()}</td>
                      <td className="py-10 pr-10 text-right">
                         <Button variant="ghost" size="icon" className="h-12 w-12 rounded-none bg-white dark:bg-surface border border-transparent shadow-none text-stone-300 group-hover:bg-stone-900 group-hover:text-white transition-all active:scale-90">
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

