"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Video, Zap, DollarSign, TrendingUp, Users, 
  Play, Plus, ArrowRight, MousePointer, ExternalLink,
  ShoppingBag, Star, LayoutDashboard, Globe, Eye, Package,
  Send, CheckCircle, BarChart3, Loader2, Film, Target, Sparkles,
  Building2, ChevronRight, Crown
} from "lucide-react";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function formatCompactNumber(number: number) {
  return Intl.NumberFormat("en", { notation: "compact" }).format(number);
}

export default function InfluencerDashboardPage() {
  const { formatMoney } = useCurrency();
  const [influencer, setInfluencer] = useState<any>(null);
  const [stats, setStats]           = useState({ totalViews: 0, totalEarnings: 0, totalClicks: 0, totalConversions: 0, activeCampaigns: 0 });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inf } = await supabase
        .from("influencers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setInfluencer(inf);

      if (inf) {
        const { data: submissionsData } = await supabase
          .from("ugc_submissions")
          .select("id, post_url, platform, view_count, total_earnings, status, created_at, ugc_campaigns(id, title, brand_id, rate_per_1k_views, campaign_type)")
          .eq("influencer_id", inf.id)
          .order("created_at", { ascending: false })
          .limit(10);

        const submissionsList = submissionsData ?? [];
        const totalViews = submissionsList.reduce((s, c) => s + (Number(c.view_count) || 0), 0);
        const campaignIds = new Set(submissionsList.map(c => (c.ugc_campaigns as any)?.id).filter(Boolean));

        setStats({
          totalViews: totalViews,
          totalEarnings: Number(inf.total_earnings) || 0,
          totalClicks: Number(inf.total_clicks) || 0,
          totalConversions: Number(inf.total_conversions) || 0,
          activeCampaigns: campaignIds.size,
        });

        setRecentSubmissions(submissionsList.slice(0, 4));
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-stone-400 dark:text-stone-500 space-y-4" style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <p className="text-sm font-medium">Powering up your hub...</p>
    </div>
  );

  if (!influencer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-2xl w-full p-12 text-center rounded-[40px] border-border shadow-xl bg-surface dark:bg-zinc-900/60">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg shadow-orange-900/20">
            <Globe />
          </div>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">Become a Jimvio Creator</h2>
          <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed font-medium">
            Unlock the ability to earn from your content. Browse brand campaigns, submit your content links, and get paid for the views you generate.
          </p>
          <Button size="lg" asChild className="font-bold rounded-2xl px-12 h-14 bg-orange-500 text-white hover:bg-orange-600 transition-all border-none shadow-lg">
            <Link href="/dashboard/activate/creator">Activate Influencer Hub</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 pt-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 px-2">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl text-white font-black text-xl">
               {influencer.display_name?.[0]?.toUpperCase() || 'I'}
            </div>
            <div>
               <h1 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
                  Influencer Hub
                  <span className="text-stone-300 font-medium">@{influencer.username || 'creator'}</span>
               </h1>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Partner Creator</span>
                  <span>•</span>
                  <span>{influencer.category || 'Global'}</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <Link href="/dashboard/influencer/videos">
               <Button className="h-11 px-6 rounded-[14px] bg-white dark:bg-zinc-900 text-stone-700 border border-stone-100 dark:border-zinc-800 font-bold text-[11px] uppercase tracking-widest shadow-sm hover:bg-stone-50 dark:bg-zinc-900/50 hover:text-stone-900 dark:text-white transition-all">
                  My Clips
               </Button>
            </Link>
            <Link href="/ugc">
               <Button className="h-11 px-8 rounded-[14px] bg-stone-900 text-white font-bold text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black border-none">
                  <Plus className="h-4 w-4 mr-2 text-orange-400" /> Start Mission
               </Button>
            </Link>
         </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: "Total Earnings", value: formatMoney(stats.totalEarnings), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
           { label: "Content Reach", value: formatCompactNumber(stats.totalViews), icon: Eye, color: "text-blue-600", bg: "bg-blue-500/10" },
           { label: "Market Influence", value: stats.totalClicks, icon: MousePointer, color: "text-orange-600", bg: "bg-orange-500/10" },
           { label: "Active Missions", value: stats.activeCampaigns, icon: Target, color: "text-orange-600", bg: "bg-orange-500/10" },
         ].map((stat, i) => (
            <GlassCard key={i} className="p-5 flex items-center gap-4 group hover:border-orange-200 transition-all bg-white dark:bg-zinc-900/60 border-white shadow-sm">
               <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-[24px]", stat.bg)} />
               <div className={cn("relative w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 border border-white/80 shadow-sm", stat.bg, stat.color)}>
                  <stat.icon className="h-5 w-5" />
               </div>
               <div className="relative">
                  <p className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">{stat.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-500">{stat.label}</p>
               </div>
            </GlassCard>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500 px-2">Recent Performance</h2>
            
            {recentSubmissions.length === 0 ? (
               <GlassCard className="py-24 text-center border-dashed border-border bg-surface dark:bg-zinc-900/20">
                  <Film className="h-12 w-12 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
                  <p className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">No activity logs found.</p>
                  <Link href="/ugc" className="mt-6 inline-block">
                     <Button className="h-11 px-8 rounded-[14px] bg-surface dark:bg-zinc-900 border border-border text-stone-700 dark:text-stone-300 font-bold text-[11px] uppercase tracking-widest shadow-sm hover:bg-surface-secondary dark:hover:bg-zinc-800 transition-all">Browse Missions →</Button>
                  </Link>
               </GlassCard>
            ) : (
               <div className="grid grid-cols-1 gap-3">
                  {recentSubmissions.map((sub) => {
                    const campaign = sub.ugc_campaigns as any;
                    const isPending = sub.status === 'pending';

                    return (
                       <GlassCard key={sub.id} className="p-4 pr-6 flex items-center gap-4 hover:border-orange-200 transition-all cursor-pointer bg-white dark:bg-zinc-900/60 border-white shadow-sm">
                          <div className="w-12 h-12 rounded-[14px] bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm transition-colors">
                             <Video className="h-5 w-5 text-stone-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-[14px] font-bold text-stone-900 dark:text-white truncate tracking-tight">{campaign?.title || 'Mission Item'}</h4>
                             <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                <span className={cn("px-2 py-0.5 rounded-full border shadow-sm", isPending ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800")}>
                                   {sub.status}
                                </span>
                                • {sub.platform}
                             </p>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-[15px] font-bold text-stone-900 dark:text-white tabular-nums">{formatMoney(sub.total_earnings || 0)}</p>
                             <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest leading-none">Earned</p>
                          </div>
                          <Link href={sub.post_url} target="_blank" className="ml-3 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 flex items-center justify-center text-stone-400 hover:bg-stone-900 hover:text-white transition-all shadow-sm">
                             <ExternalLink className="w-4 h-4" />
                          </Link>
                       </GlassCard>
                    );
                  })}
               </div>
            )}
        </div>

         {/* ── QUICK ACTIONS ── */}
         <div className="xl:col-span-1 space-y-6">
            <div className="rounded-[28px] bg-stone-900 dark:bg-zinc-800 p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500 opacity-20 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:opacity-30 transition-opacity" />
               <div className="relative z-10 space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[9px] font-bold uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    <Sparkles className="h-3 w-3 text-orange-400" /> Growth Insight
                  </div>
                  <h3 className="text-xl font-bold leading-tight tracking-tight">Max your outreach</h3>
                  <p className="text-[12px] text-stone-400 font-medium leading-relaxed">Verified creators earn 2x more on average. Complete your profile for priority reviews.</p>
                  <Button className="w-full h-11 rounded-[14px] bg-white/90 dark:bg-zinc-700 text-stone-900 dark:text-white hover:bg-white dark:hover:bg-zinc-600 font-bold text-[11px] uppercase tracking-widest shadow-xl transition-all border-none">
                     Upgrade Profile
                  </Button>
               </div>
            </div>

            <GlassCard className="p-6 bg-white dark:bg-zinc-900/60 border-white shadow-sm">
               <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-5">Influencer Pulse</h3>
               <div className="space-y-4">
                  {[
                    { label: "Avg. Payout", value: "$45.00", icon: TrendingUp },
                    { label: "Active Brands", value: "240+", icon: Building2 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 flex items-center justify-center text-stone-300 group-hover:text-orange-500 transition-colors shadow-sm">
                             <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-stone-600">{item.label}</span>
                       </div>
                       <span className="text-[13px] font-bold text-stone-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
               </div>
            </GlassCard>
         </div>
      </div>
      </div>
    </div>
  );
}

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
