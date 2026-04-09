"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Video, Zap, DollarSign, TrendingUp, Users, 
  Play, Plus, ArrowRight, MousePointer, ExternalLink,
  ShoppingBag, Star, LayoutDashboard, Globe, Eye, Package,
  Send, CheckCircle, BarChart3, Loader2, Film
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

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
      {/* Welcome Header */}
      <div className="flex items-start justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            Creator Studio
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5 font-medium">Manage your content partnerships and track earnings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" asChild className="rounded-xl h-10 border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
            <Link href="/dashboard/analytics"><BarChart3 className="w-4 h-4 mr-2" /> Analytics</Link>
          </Button>
          <Button size="sm" asChild className="rounded-xl h-10 bg-gradient-to-r from-violet-600 to-indigo-700 font-bold px-6">
            <Link href="/dashboard/influencer/videos"><Video className="h-4 w-4 mr-2" /> Video Studio</Link>
          </Button>
          <Button size="sm" asChild className="rounded-xl h-10 border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-secondary)] font-bold px-4">
            <Link href="/ugc"><Globe className="h-4 w-4 mr-2" /> Browse Campaigns</Link>
          </Button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Submission Views" value={stats.totalViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} iconColor="from-blue-600 to-cyan-600" />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns.toString()} icon={<Package className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" />
        <StatCard title="Total Earnings" value={formatMoney(stats.totalEarnings, "RWF")} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Creator Tier" value="Rising Star" icon={<Star className="h-4 w-4" />} iconColor="from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Submissions Feed */}
          <Card className="border border-[var(--color-border)] rounded-3xl shadow-sm overflow-hidden bg-[var(--color-surface)]">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Send className="w-4 h-4 text-[var(--color-accent)]" /> 
                Recent Content Submissions
              </CardTitle>
              <Link href="/dashboard/submissions" className="text-xs text-[var(--color-accent)] font-bold flex items-center gap-1 hover:underline">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="group flex flex-col justify-between p-5 rounded-2xl bg-[var(--color-surface-secondary)]/50 border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-[10px] py-0 px-2 rounded-lg bg-[var(--color-surface)] border-[var(--color-border)] font-black uppercase text-[var(--color-text-muted)]">
                          {sub.platform}
                        </Badge>
                        <Badge 
                          variant={sub.status === "approved" ? "success" : sub.status === "rejected" ? "destructive" : "warning"} 
                          className="text-[9px] px-2 py-0.5 rounded-full capitalize font-bold tracking-tight shadow-sm"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-black text-[var(--color-text-primary)] mb-1.5 line-clamp-1 leading-tight">
                        {(sub.ugc_campaigns as any)?.title || "Campaign Content"}
                      </p>
                      <a href={sub.post_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--color-accent)] hover:underline truncate block opacity-80">
                        {sub.post_url}
                      </a>
                    </div>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--color-border)]/50">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-widest">Views Tracked</span>
                        <p className="text-sm font-black text-[var(--color-text-primary)]">{(sub.view_count || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-widest">Payout</span>
                        <p className="text-sm font-black text-emerald-500">{formatMoney(Number(sub.total_earnings || 0), "RWF")}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentSubmissions.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 py-16 text-center border-2 border-dashed border-[var(--color-border)] rounded-3xl h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-[var(--color-surface-secondary)] rounded-full flex items-center justify-center text-3xl opacity-30">🎬</div>
                    <div className="max-w-[280px]">
                      <p className="text-sm font-black text-[var(--color-text-primary)]">No submissions found</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-6">Browse active brand campaigns, create amazing content, and submit your first link to start earning.</p>
                    </div>
                    <Button size="sm" asChild className="rounded-xl px-6 h-10 font-bold bg-[var(--color-accent)]">
                      <Link href="/ugc">Explore Campaigns</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Promotion Card */}
          <div className="relative rounded-3xl overflow-hidden group shadow-xl shadow-violet-900/5">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-800 opacity-90 group-hover:scale-105 transition-transform duration-500" />
            <div className="relative p-10 text-center flex flex-col items-center space-y-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-2xl">
                🚀
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Scale Your Content Earnings</h3>
                <p className="text-white/80 text-sm max-w-sm mt-2 mx-auto leading-relaxed">
                  Join exclusive brand campaigns and monetize every view you generate through TikTok, Instagram, and YouTube.
                </p>
              </div>
              <Button asChild className="rounded-2xl h-12 px-10 bg-white text-indigo-700 hover:bg-white/90 font-black shadow-lg shadow-black/20">
                <Link href="/ugc">Browse All Campaigns</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Earnings Card */}
          <Card className="border-none bg-indigo-900 text-white rounded-3xl shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 blur-[60px]" />
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl border border-white/10">
                  💰
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Available Payout</p>
                  <p className="text-3xl font-black">{formatMoney(stats.totalEarnings, "RWF")}</p>
                </div>
              </div>
              <Button className="w-full h-14 bg-white text-indigo-900 hover:bg-indigo-50 font-black rounded-2xl shadow-lg border-none">
                Request Withdrawal <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-[10px] text-center text-indigo-300 mt-4 font-bold opacity-80">
                Minimum withdrawal: FRw 10,000
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-[var(--color-border)] rounded-3xl shadow-sm bg-[var(--color-surface)]">
            <CardHeader className="pb-4 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Success Hub</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-6 space-y-2">
              {[
                { label: "Short Video Studio", icon: <Film className="w-4 h-4" />, href: "/dashboard/influencer/videos" },
                { label: "Find Campaigns", icon: <Globe className="w-4 h-4" />, href: "/ugc" },
                { label: "My Submissions", icon: <Send className="w-4 h-4" />, href: "/dashboard/submissions" },
                { label: "Affiliate Tracking", icon: <MousePointer className="w-4 h-4" />, href: "/dashboard/links" },
                { label: "Profile Settings", icon: <Users className="w-4 h-4" />, href: "/dashboard/settings" },
              ].map((a, i) => (
                <Button key={i} variant="ghost" className="w-full justify-between h-14 rounded-2xl px-4 hover:bg-[var(--color-surface-secondary)] group transition-all" asChild>
                  <Link href={a.href}>
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] group-hover:bg-white group-hover:text-[var(--color-accent)] shadow-sm transition-all">{a.icon}</span>
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">{a.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Tier Tracker */}
          <Card className="border border-[var(--color-border)] rounded-3xl shadow-sm bg-[var(--color-surface)] p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Creator Rank</span>
              <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[10px] font-bold">Lvl 3</Badge>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 flex-1 bg-[var(--color-surface-secondary)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: "72%" }} />
              </div>
              <span className="text-[10px] font-black text-amber-500 italic">PRO</span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-relaxed">
              Generate <b>5,000 more views</b> this month to unlock **Elite Creator** status and 5% higher commission rates.
            </p>
          </Card>
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
