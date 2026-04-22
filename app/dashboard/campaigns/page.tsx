"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Plus, Play, Pause, Users, Eye, DollarSign, Loader2, TrendingUp, Sparkles, Target, BarChart3, ChevronLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function CampaignsPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);
  const [vendor, setVendor]       = useState<Record<string, unknown> | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vend } = await supabase.from("vendors").select("*").eq("user_id", user.id).single();
      setVendor(vend);

      if (vend) {
        const { data } = await supabase
          .from("influencer_campaigns")
          .select(`
            *, products ( name, slug, images ),
            influencers ( display_name, profile_image, social_platforms )
          `)
          .eq("vendor_id", vend.id)
          .order("created_at", { ascending: false });
        setCampaigns(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function toggleCampaign(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setUpdating(id);
    const supabase = createClient();
    await supabase.from("influencer_campaigns").update({ status: newStatus }).eq("id", id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setUpdating(null);
  }

  const totalViews    = campaigns.reduce((s, c) => s + (c.total_views as number ?? 0), 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + Number(c.total_revenue ?? 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-none bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-none animate-spin m-2" />
            <Zap className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Mission Hub</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing Campaign Progress</p>
        </div>
      </div>
    );
  }

  if (!vendor) return (
    <div className="max-w-4xl mx-auto py-24 text-center space-y-8 px-6">
      <div className="w-24 h-24 rounded-none flex items-center justify-center mx-auto text-4xl bg-white dark:bg-surface border border-white shadow-none">🎯</div>
      <div className="space-y-3">
         <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Mission Hub Offline</h3>
         <p className="text-stone-500 font-bold max-w-md mx-auto leading-relaxed">System requires active vendor status to create missions.</p>
      </div>
      <Button asChild className="h-14 px-10 rounded-none bg-stone-900 text-white font-black text-[12px] uppercase tracking-widest shadow-none transition-all hover:bg-black">
         <Link href="/dashboard/activate/vendor">Activate Vendor Store</Link>
      </Button>
    </div>
  );

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(251,146,60,0.05) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-7xl mx-auto space-y-12 px-6 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-none bg-white dark:bg-surface border border-white shadow-none shrink-0">
                    <Zap className="h-8 w-8 text-orange-500" />
                 </div>
                 Mission Hub
                 <span className="text-stone-300 ml-2 font-black">{campaigns.length}</span>
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Manage your campaigns and engagement missions
              </p>
           </div>

           <Button
              className="h-14 px-8 rounded-none bg-orange-500 text-white font-black text-[11px] uppercase tracking-widest shadow-none active:scale-95 transition-all hover:bg-orange-600 border-none"
              onClick={async () => {
              const supabase = createClient();
              const { data } = await supabase.from("influencer_campaigns").insert({
                vendor_id: vendor.id, title: "New Campaign", status: "draft", campaign_type: "promotion",
              }).select().single();
              if (data) setCampaigns(prev => [data, ...prev]);
           }}>
              <Plus className="h-4 w-4 mr-2 text-white" /> Launch New Mission
           </Button>
        </div>

        {/* Breakdown Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none">
              <div className="w-12 h-12 rounded-none bg-orange-50 border border-orange-100 flex items-center justify-center mb-6">
                 <Zap className="h-6 w-6 text-orange-500" />
              </div>
               <div>
                  <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{campaigns.length}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Total Missions</p>
               </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none">
              <div className="w-12 h-12 rounded-none bg-orange-50 border border-orange-100 flex items-center justify-center mb-6">
                 <Users className="h-6 w-6 text-orange-500" />
              </div>
               <div>
                  <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{activeCampaigns}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Active Missions</p>
               </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none">
              <div className="w-12 h-12 rounded-none bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                 <Eye className="h-6 w-6 text-emerald-500" />
              </div>
               <div>
                  <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{totalViews > 1000 ? `${(totalViews/1000).toFixed(1)}K` : totalViews}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Global Reach</p>
               </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none">
              <div className="w-12 h-12 rounded-none bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
                 <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
               <div>
                  <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{formatMoney(totalRevenue, "USD")}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Mission ROI</p>
               </div>
           </GlassCard>
        </div>

        {/* Registry Matrix */}
        <div className="space-y-8 pt-4">
           <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-stone-400 pl-2">Mission Catalog</h2>
           
           {campaigns.length === 0 ? (
              <GlassCard className="py-24 text-center rounded-none border-dashed border-white bg-white dark:bg-surface/20">
                 <div className="w-24 h-24 bg-white dark:bg-surface rounded-none flex items-center justify-center mx-auto mb-8 border border-white shadow-none">
                    <Target className="h-10 w-10 text-stone-100" />
                 </div>
                 <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">No Campaigns Found</h3>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-3 mb-10 max-w-[240px] mx-auto leading-relaxed">Create a push mission to engage with the creator grid.</p>
                 <Button
                    className="h-16 px-12 rounded-none font-black text-[11px] uppercase tracking-widest shadow-none active:scale-95 transition-all bg-orange-500 text-white hover:bg-orange-600 border-none"
                    onClick={async () => {
                    const supabase = createClient();
                    const { data } = await supabase.from("influencer_campaigns").insert({
                      vendor_id: vendor.id, title: "Initial Growth Mission", status: "draft", campaign_type: "promotion",
                    }).select().single();
                    if (data) setCampaigns([data]);
                 }}>
                    <Plus className="h-4 w-4 mr-2" /> Launch New Mission
                 </Button>
              </GlassCard>
           ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                 {campaigns.map((c) => {
                    const status = c.status as string;
                    const budget = Number(c.budget ?? 0);
                    const views  = c.total_views as number ?? 0;
                    const convs  = c.total_conversions as number ?? 0;
                    const rev    = Number(c.total_revenue ?? 0);
                    const product= c.products as Record<string, unknown> | null;
                    const isUpdating = updating === c.id;

                    return (
                       <GlassCard key={c.id as string} className="p-10 flex flex-col group hover:shadow-none hover:bg-white dark:bg-surface transition-all duration-500 rounded-none bg-white dark:bg-surface/40 border-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] rounded-none translate-x-1/2 -translate-y-1/2" />
                          
                          <div className="flex items-start justify-between mb-8">
                             <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                   <GlassPill color={status === "active" ? "emerald" : status === "draft" ? "default" : "orange"}>
                                      {status}
                                   </GlassPill>
                                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">
                                      {c.start_date ? `${c.start_date} → ${c.end_date ?? 'âˆž'}` : "Mission Pending"}
                                   </span>
                                </div>
                                <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">{c.title as string}</h3>
                                {product && (
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-none bg-orange-500" />
                                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Target Product: {product.name as string}</p>
                                   </div>
                                )}
                             </div>
                             
                             <div className="flex gap-3">
                                <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-none bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none hover:bg-white dark:bg-surface active:scale-95 transition-all text-stone-500">
                                  <Link href={`/dashboard/vendor/campaigns/${c.id}`}><Settings className="h-4 w-4" /></Link>
                                </Button>
                                {status === "active" && (
                                   <Button size="icon" variant="outline" className="h-12 w-12 rounded-none border-white bg-white dark:bg-surface/60 hover:bg-stone-900 hover:text-white transition-all active:scale-95 shadow-none" disabled={isUpdating} onClick={() => toggleCampaign(c.id as string, status)}>
                                      <Pause className="h-4 w-4" />
                                   </Button>
                                )}
                                {(status === "paused" || status === "draft") && (
                                   <Button size="sm" className={cn("h-12 px-6 rounded-none font-black text-[10px] uppercase tracking-widest shadow-none active:scale-95 transition-all text-white border-none", status === 'draft' ? "bg-orange-500 hover:bg-orange-600" : "bg-orange-500 hover:bg-orange-600")} disabled={isUpdating} onClick={() => toggleCampaign(c.id as string, status === 'draft' ? 'active' : 'active')}>
                                      <Play className="h-3.5 w-3.5 mr-2" /> {status === 'draft' ? "Launch" : "Resume"}
                                   </Button>
                                )}
                             </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-8">
                             {[
                                { label: "Reach", value: views > 1000 ? `${(views/1000).toFixed(1)}K` : views, icon: Eye, color: "text-sky-500", bg: "bg-sky-50" },
                                { label: "Handoffs", value: convs, icon: Target, color: "text-indigo-500", bg: "bg-indigo-50" },
                                { label: "Revenue", value: formatMoney(rev, "USD"), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
                             ].map((s, i) => (
                                <div key={i} className="p-6 rounded-none bg-white dark:bg-surface/60 border border-white text-center shadow-none group-hover:scale-[1.02] transition-transform duration-500">
                                   <div className={cn("w-10 h-10 rounded-none mx-auto mb-3 flex items-center justify-center", s.bg, s.color)}>
                                      <s.icon className="h-5 w-5" />
                                   </div>
                                   <p className="text-lg font-black text-stone-900 dark:text-white tabular-nums tracking-tighter">{s.value}</p>
                                   <p className="text-[8px] font-black uppercase tracking-widest text-stone-400 mt-1">{s.label}</p>
                                </div>
                             ))}
                          </div>

                          {budget > 0 && (
                             <div className="p-6 rounded-none bg-stone-50 dark:bg-surface/50 border border-stone-100 dark:border-border group-hover:bg-orange-50/30 transition-colors">
                                <div className="flex justify-between items-end mb-4 px-1">
                                   <div className="space-y-1">
                                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Budget Flow</p>
                                      <p className="text-xs font-black text-stone-900 dark:text-white tracking-tight">Financial Health</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-xs font-black text-orange-600 tracking-tight">{formatMoney(rev, "USD")} / {formatMoney(budget, "USD")}</p>
                                      <p className="text-[8px] font-black uppercase tracking-widest text-stone-400 mt-0.5">{Math.round((rev/budget)*100)}% Spent</p>
                                   </div>
                                </div>
                                <Progress value={budget > 0 ? Math.min(100, (rev/budget)*100) : 0} className="h-2 bg-stone-200" indicatorClassName="bg-orange-500 rounded-none" />
                             </div>
                          )}
                       </GlassCard>
                    );
                 })}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

