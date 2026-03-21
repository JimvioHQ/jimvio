"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Video, Zap, DollarSign, TrendingUp, Users, 
  Play, Plus, ArrowRight, MousePointer, ExternalLink,
  ShoppingBag, Star, LayoutDashboard, Globe, Eye, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function InfluencerDashboardPage() {
  const [influencer, setInfluencer] = useState<any>(null);
  const [stats, setStats]           = useState({ totalViews: 0, totalEarnings: 0, totalClicks: 0, totalConversions: 0, activeCampaigns: 0 });
  const [recentClips, setRecentClips] = useState<any[]>([]);
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
        const { data: clipsData } = await supabase
          .from("viral_clips")
          .select("id, title, thumbnail_url, video_url, total_views, total_conversions, total_clicks, product_id, products(name)")
          .eq("influencer_id", inf.id)
          .order("created_at", { ascending: false })
          .limit(20);
        const clipsList = clipsData ?? [];
        const totalViews = clipsList.reduce((s, c) => s + (Number(c.total_views) || 0), 0);
        const totalConvs = clipsList.reduce((s, c) => s + (Number(c.total_conversions) || 0), 0);
        const totalClicks = clipsList.reduce((s, c) => s + (Number(c.total_clicks) || 0), 0);
        const productIds = new Set(clipsList.map((c: any) => c.product_id).filter(Boolean));
        setStats({
          totalViews,
          totalEarnings: Number(inf.total_earnings) || 0,
          totalClicks,
          totalConversions: totalConvs,
          activeCampaigns: productIds.size,
        });
        setRecentClips(clipsList.slice(0, 4));
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20 animate-spin"><Zap className="h-8 w-8 text-[var(--color-accent)]" /></div>;

  if (!influencer) {
    return (
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-2xl p-12 text-center max-w-2xl mx-auto mt-10">
        <Video className="h-16 w-16 text-[var(--color-accent)] mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Become a Creator</h2>
        <p className="text-[var(--color-text-muted)] mb-8">
          Promote products using short video clips and earn from views and product sales. Activate your Creator role to get started.
        </p>
        <Button size="lg" asChild className="font-semibold rounded-xl px-10">
          <Link href="/dashboard/activate/creator">Activate Creator Role</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">
            Creator Studio
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Grow your audience and your income at once.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/campaigns/browse">Browse Campaigns</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/clips/new"><Plus className="h-4 w-4" /> Upload Content</Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Video Views" value={loading ? "—" : stats.totalViews.toLocaleString()} icon={<Eye className="h-4 w-4" />} iconColor="from-cyan-600 to-blue-600" />
        <StatCard title="Products Promoted" value={loading ? "—" : stats.activeCampaigns.toString()} icon={<Package className="h-4 w-4" />} iconColor="from-violet-600 to-purple-600" />
        <StatCard title="Total Earnings" value={loading ? "—" : formatCurrency(stats.totalEarnings)} icon={<DollarSign className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Followers" value={loading ? "—" : (influencer?.total_followers ?? 0).toLocaleString()} icon={<Users className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Col: Clips */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border border-[var(--color-border)] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-black">My Latest Content</CardTitle>
              <Link href="/dashboard/clips" className="text-xs text-[var(--color-accent)] font-bold flex items-center gap-1 hover:underline">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentClips.map((clip) => (
                  <div key={clip.id} className="group relative aspect-video rounded-2xl overflow-hidden bg-ink-dark border border-[var(--color-border)]">
                    <img 
                      src={clip.thumbnail_url || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=60"} 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-[var(--color-accent)] transition-colors">
                        <Play className="h-5 w-5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-emerald-500 text-white border-none py-0.5 px-2 text-[10px] font-black">
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs font-bold text-white mb-1 truncate">{clip.title}</p>
                      <div className="flex items-center gap-3 text-[9px] text-white/70 font-bold capitalize tracking-widest">
                        <span>{(clip.total_views || 0).toLocaleString()} Views</span>
                        <span className="text-[var(--color-accent)]">{clip.total_conversions || 0} Conv.</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentClips.length === 0 && (
                  <div className="col-span-2 py-10 text-center border-2 border-dashed border-base rounded-2xl">
                    <Video className="h-10 w-10 text-muted-c mx-auto mb-3" />
                    <p className="text-sm font-bold mb-1">No content yet</p>
                    <p className="text-xs text-muted-c mb-4">Start by uploading a viral clip for a product.</p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/clips/new"><Plus className="h-3 w-3" /> Create Content</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[var(--color-border)] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-black">Active Campaigns</CardTitle>
              <Link href="/dashboard/campaigns" className="text-xs text-[var(--color-accent)] font-bold flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: "Summer Gadget Promo", vendor: "TechHub Store", reward: "15% Comm + $50 Bonus", status: "Active" },
                { title: "Health & Fitness 2024", vendor: "Vitality Labs", reward: "20% Commission", status: "Active" },
                { title: "Organic Coffee Launch", vendor: "Kaffa Roasters", reward: "12% Comm + Free Samples", status: "Reviewing" },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-subtle/50 border border-base hover:border-[var(--color-accent)]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white border border-base flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                      {i === 0 ? "💻" : i === 1 ? "🏋️" : "☕"}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[var(--color-text-primary)]">{c.title}</h4>
                      <p className="text-[10px] text-muted-c font-bold capitalize">{c.vendor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600">{c.reward}</p>
                    <Badge variant={c.status === "Active" ? "success" : "secondary"} className="mt-1 text-[9px] py-0 px-2 capitalize font-black tracking-widest">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Quick Actions & Rank */}
        <div className="space-y-6">
          <Card className="bg-ink-dark text-white border-none shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)] opacity-20 blur-3xl" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" /> Creator Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-4xl font-black text-white mb-1">Rising Star</p>
                <div className="flex justify-center gap-1">
                  {[1,2,3].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  {[4,5].map(i => <Star key={i} className="h-4 w-4 text-white/20" />)}
                </div>
              </div>
              <div className="space-y-2 text-xs text-white/60 mb-6">
                <div className="flex justify-between">
                  <span>Progress to Elite</span>
                  <span className="text-white font-bold">64%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-accent)] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: "64%" }} />
                </div>
              </div>
              <Button className="w-full bg-white text-text-primary hover:bg-white/90 font-black rounded-xl">
                View Perks <Zap className="h-4 w-4 ml-2 fill-current" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black capitalize tracking-widest text-muted-c">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Affiliate Links", icon: <Globe />, href: "/dashboard/links" },
                { label: "Influencer Hub", icon: <Video />, href: "/dashboard/clips" },
                { label: "My Earnings", icon: <DollarSign />, href: "/dashboard/earnings" },
                { label: "Marketplace", icon: <ShoppingBag />, href: "/marketplace" },
              ].map((a, i) => (
                <Button key={i} variant="outline" className="w-full justify-start font-bold h-12 rounded-xl border-dashed hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]/30 hover:text-[var(--color-accent)] group" asChild>
                  <Link href={a.href}>
                    <span className="p-1.5 rounded-lg bg-subtle group-hover:bg-white transition-colors mr-3">{a.icon}</span>
                    {a.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-emerald-600 text-white overflow-hidden shadow-lg group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  💸
                </div>
                <div>
                  <p className="text-xs font-bold text-white/80 capitalize">Available Payout</p>
                  <p className="text-2xl font-black">{formatCurrency(stats.totalEarnings)}</p>
                </div>
              </div>
              <Button className="w-full bg-white text-emerald-700 hover:bg-white/90 font-black rounded-xl">
                Withdraw Now <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
