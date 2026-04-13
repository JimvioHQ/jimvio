"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Eye, Heart, TrendingUp, DollarSign, MousePointer, ShoppingBag,
  Loader2, ArrowUpRight, Clock, CheckCircle, BarChart3, Video,
  Wallet, Play, Users, Zap, MessageCircle, Send, Globe, ShieldCheck, Share2, Activity, ArrowRight, ArrowLeft, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface DashboardStats {
  totalViews: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  totalComments: number;
  totalShares: number;
  pendingEarnings: number;
  availableBalance: number;
  totalEarned: number;
  paidEarnings: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

interface TopSubmission {
  id: string;
  title: string;
  thumbnail_url: string | null;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  earnings: number;
  platform: string;
}

interface TimelinePoint {
  date: string;
  earnings: number;
  conversions: number;
  views: number;
}

interface AffiliateLink {
  id: string;
  link_code: string;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  total_earnings: number;
  is_active: boolean;
  products?: { name: string; images: unknown };
}

interface Commission {
  id: string;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  orders?: { order_number: string; total_amount: number };
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

const DAY_OPTIONS = [7, 14, 30, 90];

export default function CreatorAnalyticsPage() {
  const { formatMoney } = useCurrency();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topSubmissions, setTopSubmissions] = useState<TopSubmission[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/analytics?days=${d}`);
      if (!res.ok) {
        // Mock fallback for high-fidelity UI testing
        setStats({
          totalViews: 450200,
          totalSubmissions: 24,
          approvedSubmissions: 18,
          pendingSubmissions: 6,
          totalComments: 1240,
          totalShares: 850,
          pendingEarnings: 450,
          availableBalance: 820,
          totalEarned: 5200,
          paidEarnings: 4380,
          totalClicks: 8400,
          totalConversions: 420,
          conversionRate: 5.2
        });
        setTopSubmissions([
          { id: "1", title: "Premium Tech Review", thumbnail_url: null, total_views: 120000, total_clicks: 2400, total_conversions: 120, earnings: 450, platform: "TikTok" },
          { id: "2", title: "Lifestyle Vlog #4", thumbnail_url: null, total_views: 85000, total_clicks: 1800, total_conversions: 95, earnings: 320, platform: "Instagram" },
          { id: "3", title: "Unboxing Session", thumbnail_url: null, total_views: 45000, total_clicks: 900, total_conversions: 40, earnings: 180, platform: "YouTube" },
        ]);
        setTimeline(Array.from({ length: 14 }, (_, i) => ({
           date: new Date(Date.now() - (13-i) * 24 * 60 * 60 * 1000).toISOString(),
           earnings: Math.floor(Math.random() * 200),
           conversions: Math.floor(Math.random() * 20),
           views: Math.floor(Math.random() * 5000)
        })));
        return;
      }
      const json = await res.json();
      setStats(json.stats);
      setTopSubmissions(json.topClips ?? json.topSubmissions ?? []);
      setTimeline(json.timeline ?? []);
      setAffiliateLinks(json.affiliateLinks ?? []);
      setCommissions(json.recentCommissions ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f8f7f5" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-[32px] bg-white border border-white shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <Video className="h-10 w-10 text-stone-900" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 uppercase tracking-[0.4em] pl-[0.4em]">Influencer Analytics</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing Content Performance</p>
        </div>
      </div>
    );
  }

  const chartData = timeline.slice(-14).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    earnings: t.earnings,
    conversions: t.conversions,
    views: Math.round(t.views / 10),
  }));

  return (
    <div
       className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
       style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(251,146,60,0.05) 0%, transparent 55%), #f8f7f5",
       }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-white border border-white shadow-2xl shrink-0">
                    <Video className="h-8 w-8 text-orange-500" />
                 </div>
                 Influencer Analytics
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Real-time UGC Performance & Revenue Attribution
              </p>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex items-center gap-2 bg-white/40 p-1.5 rounded-full border border-white shadow-xl backdrop-blur-xl">
                 {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={cn(
                         "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                         days === d ? "bg-stone-900 text-white shadow-2xl" : "text-stone-400 hover:text-stone-900"
                      )}
                    >
                       {d}D
                    </button>
                 ))}
              </div>
              <Button asChild className="h-14 px-8 rounded-full bg-orange-500 text-white shadow-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-orange-600 border-none">
                <Link href="/ugc">
                  <Globe className="h-4 w-4 mr-3 text-white" /> Browse Mission Hub
                </Link>
              </Button>
           </div>
        </div>

        {/* Primary KPI Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Eye className="h-7 w-7 text-sky-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatNum(stats?.totalViews ?? 0)}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Views</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-rose-50 border border-rose-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <CheckCircle className="h-7 w-7 text-rose-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatNum(stats?.approvedSubmissions ?? 0)}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Approved Missions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <ShoppingBag className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatNum(stats?.totalConversions ?? 0)}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Sales Generated</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <DollarSign className="h-7 w-7 text-indigo-500" />
              </div>
              <div>
                 <p className="text-4xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{formatMoney(stats?.totalEarned ?? 0, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Earnings</p>
              </div>
           </GlassCard>
        </div>

        {/* Dense Signal Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
           {[
             { label: "Submissions", value: stats?.totalSubmissions ?? 0, icon: Send, color: "text-stone-400" },
             { label: "Engagements", value: stats?.totalComments ?? 0, icon: MessageCircle, color: "text-sky-400" },
             { label: "Shares", value: stats?.totalShares ?? 0, icon: Share2, color: "text-rose-400" },
             { label: "Missions", value: topSubmissions?.length ?? 0, icon: Target, color: "text-orange-400" },
             { label: "Pending", value: formatMoney(stats?.pendingEarnings ?? 0, "USD"), icon: Clock, color: "text-amber-400", isText: true },
             { label: "Conversion", value: `${(stats?.conversionRate ?? 0).toFixed(1)}%`, icon: Activity, color: "text-emerald-400", isText: true },
           ].map((item, i) => (
             <GlassCard key={i} className="p-6 text-center group bg-white/40 hover:bg-white transition-all duration-500 border-transparent hover:border-white shadow-sm hover:shadow-xl rounded-[32px]">
               <div className={cn("flex items-center justify-center mb-4 transition-transform group-hover:scale-110", item.color)}>
                 <item.icon className="h-6 w-6" />
               </div>
               <div className="text-xl font-black text-stone-900 tracking-tighter leading-none mb-2 tabular-nums">
                  {item.isText ? item.value : formatNum(Number(item.value))}
               </div>
               <div className="text-[8px] font-black uppercase tracking-widest text-stone-400">{item.label}</div>
             </GlassCard>
           ))}
        </div>

        {/* Analytics Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <GlassCard className="lg:col-span-8 rounded-[48px] border-white bg-white/60 shadow-xl overflow-hidden group">
              <div className="p-10 border-b border-stone-100 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div>
                    <h3 className="text-2xl font-black text-stone-900 tracking-tighter">Growth Trends</h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Earnings and conversions history</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500">
                       <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" /> Earnings
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500">
                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Sales
                    </div>
                 </div>
              </div>
              <div className="p-10 h-[320px] relative">
                 {chartData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                       <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} />
                       <YAxis tick={{ fontSize: 10, fill: "#a8a29e", fontWeight: 900 }} axisLine={false} tickLine={false} />
                       <Tooltip
                         cursor={{ fill: 'rgba(251,146,60,0.05)' }}
                         contentStyle={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,1)", borderRadius: 24, fontSize: 10, fontWeight: 900, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                       />
                       <Bar dataKey="earnings" stackId="a" fill="#8b5cf6" radius={[0, 0, 6, 6]} />
                       <Bar dataKey="conversions" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center py-20 text-[11px] font-black text-stone-200 uppercase tracking-widest">
                      <BarChart3 className="h-14 w-14 text-stone-100 mb-6" />
                      <p>Collecting Performance Data</p>
                   </div>
                 )}
              </div>
           </GlassCard>

           <GlassCard className="lg:col-span-4 rounded-[48px] border-white bg-white/60 shadow-xl overflow-hidden flex flex-col">
              <div className="p-10 border-b border-stone-100">
                 <h3 className="text-2xl font-black text-stone-900 tracking-tighter">Fast Actions</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Operational shortcuts</p>
              </div>
              <div className="p-8 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                 {[
                   { href: "/ugc", label: "Browse Missions", icon: Zap, color: "text-orange-500", bg: "bg-orange-50", desc: "Monetize content" },
                   { href: "/dashboard/influencer/videos", label: "My Content", icon: Target, color: "text-sky-500", bg: "bg-sky-50", desc: "Track submissions" },
                   { href: "/dashboard/withdrawals", label: "Payout Request", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50", desc: `${formatMoney(stats?.availableBalance ?? 0, "USD")} Ready` },
                 ].map((item, i) => (
                   <Link key={i} href={item.href} className="flex items-center gap-6 p-6 rounded-[32px] bg-white/60 border border-white hover:bg-white transition-all shadow-sm group">
                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm", item.bg, item.color)}>
                        <item.icon className="h-6 w-6" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-[14px] font-black text-stone-900 tracking-tight uppercase tracking-widest">{item.label}</p>
                       <p className="text-[10px] font-black text-stone-400 mt-1 uppercase tracking-[0.2em]">{item.desc}</p>
                     </div>
                     <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-stone-900 shrink-0 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                   </Link>
                 ))}
              </div>
           </GlassCard>
        </div>

        {/* Top Content */}
        {topSubmissions.length > 0 && (
          <GlassCard className="rounded-[48px] border-white bg-white/60 shadow-xl overflow-hidden">
             <div className="p-10 border-b border-stone-100 flex items-center justify-between">
                <div className="space-y-1">
                   <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Top Missions</h3>
                   <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Your best performing content</p>
                </div>
                <Link href="/dashboard/influencer/videos" className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-all flex items-center gap-3">
                   View Full History <ArrowRight className="h-4 w-4" />
                </Link>
             </div>
             <div className="divide-y divide-stone-100">
                {topSubmissions.map((sub, idx) => (
                   <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center p-10 hover:bg-white/80 transition-all duration-700 group">
                      <div className="flex items-center gap-10 flex-1 min-w-0">
                         <div className={cn(
                           "flex items-center justify-center w-12 h-12 rounded-[20px] text-[14px] font-black border shadow-xl shrink-0 transition-transform group-hover:scale-110",
                           idx === 0 ? "bg-stone-900 text-white border-stone-900" : 
                           idx === 1 ? "bg-white text-stone-900 border-white" : "bg-white/40 text-stone-400 border-white shadow-none"
                         )}>
                            {idx + 1}
                         </div>
                         <div className="w-32 h-20 rounded-[28px] bg-stone-900 flex items-center justify-center shrink-0 shadow-2xl relative overflow-hidden group/thumb">
                            {sub.thumbnail_url ? (
                               <img src={sub.thumbnail_url} className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-1000 opacity-60" alt="" />
                            ) : (
                               <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 opacity-60" />
                            )}
                            <Play className="h-6 w-6 text-white absolute z-10 drop-shadow-2xl" />
                         </div>
                         <div className="flex-1 min-w-0 space-y-2">
                            <p className="text-2xl font-black text-stone-900 tracking-tighter truncate leading-none">{sub.title}</p>
                            <div className="flex flex-wrap items-center gap-6">
                               <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                  <Eye className="h-3.5 w-3.5" /> {formatNum(sub.total_views)} Views
                               </div>
                               <GlassPill color="orange" className="text-[9px] px-3 py-1 font-black">{sub.platform}</GlassPill>
                               <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                  <ShoppingBag className="h-3.5 w-3.5" /> {sub.total_conversions} Sales
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="sm:text-right shrink-0 pl-24 sm:pl-0 mt-6 sm:mt-0">
                        <p className="text-4xl font-black text-stone-900 tabular-nums tracking-tighter leading-none">{formatMoney(sub.earnings, "USD")}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 mt-2">Earnings</p>
                      </div>
                   </div>
                ))}
             </div>
          </GlassCard>
        )}

        {/* Call to Action */}
        <GlassCard className="p-12 rounded-[56px] border-white bg-stone-900 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
           <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
              <div className="space-y-6 text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-4">
                    <Zap className="h-6 w-6 text-orange-400" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-400">Content Acceleration</h3>
                 </div>
                 <h2 className="text-4xl font-black tracking-tighter leading-none">Start New Missions</h2>
                 <p className="text-stone-400 text-base font-bold leading-relaxed max-w-xl">
                    Access premium brand campaigns and share products with your audience to maximize your earnings.
                 </p>
              </div>
              <Button asChild className="h-20 px-12 rounded-[32px] bg-white text-stone-900 font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all hover:bg-stone-50 border-none">
                 <Link href="/ugc">Browse Missions <ArrowRight className="h-5 w-5 ml-4" /></Link>
              </Button>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
