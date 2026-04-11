"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Video, Zap, DollarSign, TrendingUp, Users, 
  Play, Plus, ArrowRight, MousePointer, ExternalLink,
  ShoppingBag, Star, LayoutDashboard, Globe, Eye, Package,
  Send, CheckCircle, BarChart3, Loader2, Film, Target, Sparkles,
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
        // Fetch UGC Submissions
        const { data: submissionsData } = await supabase
          .from("ugc_submissions")
          .select("id, post_url, platform, view_count, total_earnings, status, created_at, ugc_campaigns(id, title, brand_id, rate_per_1k_views, campaign_type)")
          .eq("influencer_id", inf.id)
          .order("created_at", { ascending: false })
          .limit(10);

        const submissionsList = submissionsData ?? [];
        
        // Calculate total views from submissions
        const totalViews = submissionsList.reduce((s, c) => s + (Number(c.view_count) || 0), 0);
        // Calculate unique campaigns interacted with
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
    <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-[var(--color-accent)]" />
      <p className="text-sm font-medium">Powering up your studio...</p>
    </div>
  );

  if (!influencer) {
    return (
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-3xl p-12 text-center max-w-2xl mx-auto mt-10 shadow-xl shadow-black/5">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-lg shadow-violet-900/20">
          <Globe />
        </div>
        <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-4 tracking-tight">Become a Jimvio Creator</h2>
        <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">
          Unlock the ability to earn from your content. Browse brand campaigns, submit your TikTok/IG links, and get paid automatically for every view you generate.
        </p>
        <Button size="lg" asChild className="font-bold rounded-2xl px-12 h-14 bg-gradient-to-r from-violet-600 to-indigo-700 hover:scale-[1.02] transition-transform">
          <Link href="/dashboard/activate/creator">Activate Creator Role</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 px-2">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl text-white font-black text-xl">
               {influencer.display_name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
               <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  Creator Studio
                  <span className="text-zinc-300 font-medium">@{influencer.username || 'creator'}</span>
               </h1>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Global Partner</span>
                  <span>•</span>
                  <span>{influencer.category || 'Lifestyle'}</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <Link href="/dashboard/influencer/videos">
               <Button variant="outline" className="h-11 px-6 rounded-xl border-zinc-200 font-black text-xs uppercase tracking-widest transition-all hover:bg-zinc-50">
                  My Clips
               </Button>
            </Link>
            <Link href="/ugc">
               <Button className="h-11 px-8 rounded-xl bg-zinc-900 text-white hover:bg-black font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  <Plus className="h-4 w-4 mr-2" /> Join Mission
               </Button>
            </Link>
         </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: "Total Earnings", value: formatMoney(stats.totalEarnings), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
           { label: "Content Reach", value: formatCompactNumber(stats.totalViews), icon: Eye, color: "text-blue-500", bg: "bg-blue-50" },
           { label: "Market Influence", value: stats.totalClicks, icon: MousePointer, color: "text-violet-500", bg: "bg-violet-50" },
           { label: "Active Missions", value: stats.activeCampaigns, icon: Target, color: "text-amber-500", bg: "bg-amber-50" },
         ].map((stat, i) => (
            <div key={i} className="bg-white border border-zinc-100 p-5 rounded-[28px] shadow-sm flex items-center gap-4 relative group overflow-hidden">
               <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity", stat.bg)} />
               <div className={cn("relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                  <stat.icon className="h-5 w-5" />
               </div>
               <div className="relative">
                  <p className="text-xl font-black text-zinc-900">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 px-2">Pipeline Status</h2>
            
            {recentSubmissions.length === 0 ? (
               <div className="py-20 text-center rounded-[32px] bg-zinc-50 border border-zinc-100 border-dashed">
                  <Film className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
                  <p className="text-sm font-bold text-zinc-500">No submissions yet.</p>
                  <Link href="/ugc" className="mt-4 inline-block">
                     <Button variant="ghost" className="text-xs font-black uppercase tracking-widest">Find Missions →</Button>
                  </Link>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-3">
                  {recentSubmissions.map((sub) => {
                    const campaign = sub.ugc_campaigns as any;
                    const isPending = sub.status === 'pending';

                    return (
                       <div key={sub.id} className="group bg-white border border-zinc-100 hover:border-zinc-300 rounded-[28px] p-4 pr-6 flex items-center gap-4 transition-all shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                             <Video className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-black text-zinc-900 truncate">{campaign?.title || 'Unknown Mission'}</h4>
                             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <span className={cn("px-1.5 py-0.5 rounded-md border", isPending ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                                   {sub.status}
                                </span>
                                • {sub.platform}
                             </p>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-sm font-black text-zinc-900">{formatMoney(sub.total_earnings || 0)}</p>
                             <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Earned</p>
                          </div>
                          <Link href={sub.post_url} target="_blank" className="ml-2 w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-all">
                             <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                       </div>
                    );
                  })}
               </div>
            )}

        </div>

         {/* ── QUICK ACTIONS ── */}
         <div className="lg:col-span-4 space-y-6">
            <div className="rounded-[32px] bg-zinc-950 p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600 opacity-20 blur-2xl rounded-full translate-x-10 -translate-y-10" />
               <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-widest border border-white/10">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Growth Tips
                  </div>
                  <h3 className="text-lg font-black leading-tight">Max your outreach</h3>
                  <p className="text-xs text-zinc-400 font-medium">Verified creators earn 2x more on average. Complete your profile to get priority reviews.</p>
                  <Button variant="outline" className="w-full h-10 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest transition-all">
                     Upgrade Profile
                  </Button>
               </div>
            </div>

            <div className="rounded-[32px] bg-white border border-zinc-100 p-6 shadow-sm">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Market Pulse</h3>
               <div className="space-y-4">
                  {[
                    { label: "Avg. Payout", value: "$45.00", icon: TrendingUp },
                    { label: "Active Brands", value: "240+", icon: Building2 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <item.icon className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="text-[10px] font-bold text-zinc-500">{item.label}</span>
                       </div>
                       <span className="text-xs font-black text-zinc-900">{item.value}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
  );
}

function Crown(props: any) {
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
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
