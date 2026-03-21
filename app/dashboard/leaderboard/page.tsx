"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { Trophy, Medal, Star, TrendingUp, Users, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";

export default function AffiliateLeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // Fetch top 10 affiliates by total_earnings
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-outfit capitalize tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Affiliate Hall of Fame
          </h1>
          <p className="text-sm text-muted-c mt-0.5 font-bold capitalize tracking-wider text-[10px]">Compete with the top global trade referrers.</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border border-amber-200 shadow-sm animate-pulse">
          <Star className="h-3.5 w-3.5 fill-amber-500" /> Top Season Prize: $5,000
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Spotlight */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaders.slice(0,3).map((l, i) => (
             <Card key={l.id} className={cn(
               "relative overflow-hidden border-2",
               i === 0 ? "border-amber-400 scale-105 z-10 bg-amber-50/30" : 
               i === 1 ? "border-slate-300" : "border-orange-300"
             )}>
                <div className="absolute top-2 right-2 opacity-10">
                   {i === 0 ? <Trophy className="h-20 w-20" /> : <Medal className="h-20 w-20" />}
                </div>
                <CardContent className="p-6 text-center space-y-4">
                   <div className="relative inline-block mx-auto">
                      <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                        <AvatarFallback className={cn("text-2xl font-black text-white", i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-500")}>
                          {l.affiliate_code?.slice(0,2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-black text-white text-sm shadow-lg",
                        i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : "bg-orange-500"
                      )}>
                        {i + 1}
                      </div>
                   </div>
                   <div>
                     <p className="font-black text-lg text-[var(--color-text-primary)]">@{l.affiliate_code}</p>
                     <p className="text-[10px] font-black capitalize text-muted-c tracking-widest">{l.total_conversions || 0} Deals Closed</p>
                   </div>
                   <div className="pt-2">
                     <p className="text-2xl font-black text-accent">{formatCurrency(l.total_earnings)}</p>
                     <Badge variant="outline" className="mt-1 text-[9px] font-black">ACTIVE ELITE</Badge>
                   </div>
                </CardContent>
             </Card>
          ))}
        </div>

        {/* Global Stats card */}
        <Card className="bg-ink-dark text-white border-white/10 flex flex-col justify-center">
           <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                 <p className="text-[10px] font-black capitalize tracking-[0.2em] text-white/40">Network Performance</p>
                 <h3 className="text-2xl font-black font-outfit">PLATINUM TIER</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-bold text-white/70"><TrendingUp className="h-4 w-4 text-emerald-500" /> Conv. Rate</div>
                    <span className="font-black text-emerald-500">8.4%</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-bold text-white/70"><Users className="h-4 w-4 text-blue-500" /> Active Referrals</div>
                    <span className="font-black">1.2K+</span>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-bold text-white/70"><Target className="h-4 w-4 text-accent" /> Network Reach</div>
                    <span className="font-black text-accent">450K</span>
                 </div>
              </div>
              <Button className="w-full bg-white text-text-primary hover:bg-white/90 font-black h-12">Upgrade My Tier</Button>
           </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="pt-5 px-6 pb-2 border-b border-base"><CardTitle className="text-md">Global Rankings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="pl-6 w-16">Rank</th>
                  <th>Affiliate</th>
                  <th className="text-right">Earnings</th>
                  <th className="text-right">Clicks</th>
                  <th className="text-right">Conversions</th>
                  <th className="pr-6" />
                </tr>
              </thead>
              <tbody>
                {leaders.map((l, i) => (
                  <tr key={l.id} className="hover:bg-subtle/30 transition-colors group">
                    <td className="pl-6">
                       <span className={cn(
                         "flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black",
                         i < 3 ? "bg-accent/10 text-accent border border-accent/20" : "bg-subtle text-muted-c"
                       )}>{i+1}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-base shadow-sm">
                          <AvatarFallback className="text-xs font-black">@{l.affiliate_code?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-black text-[var(--color-text-primary)]">@{l.affiliate_code}</p>
                          <p className="text-[10px] text-muted-c font-bold capitalize tracking-widest">Master Partner</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-black text-[var(--color-text-primary)]">{formatCurrency(l.total_earnings)}</td>
                    <td className="text-right text-sm text-muted-c font-bold">{(l.total_clicks || 0).toLocaleString()}</td>
                    <td className="text-right text-sm font-black text-emerald-500">{(l.total_conversions || 0).toLocaleString()}</td>
                    <td className="pr-6 text-right">
                       <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 font-bold transition-opacity">Profile</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


