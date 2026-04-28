"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UGCCampaign } from "@/types/ugc";
import { 
  Plus, Eye, Target, Video, Wallet, ArrowRight,
  TrendingUp, CircleDollarSign, BarChart3, AlertCircle, Trash2,
  Loader2, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";

const STATUS_STYLES: Record<string, { color: "emerald" | "orange" | "rose" | "indigo" | "amber" }> = {
  active:    { color: "emerald" },
  draft:     { color: "indigo" },
  paused:    { color: "orange" },
  completed: { color: "emerald" },
  cancelled: { color: "rose" },
};

function formatCompactNumber(number: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

export default function BrandCampaignsPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundingId, setFundingId] = useState<string | null>(null);

  async function handleDeleteCampaign(id: string) {
    if (!confirm("Are you sure you want to delete this mission? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success("Mission archived");
      } else {
        const json = await res.json();
        toast.error("Error: " + (json.error || "Failed to delete mission"));
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  }

  useEffect(() => {
    fetch("/api/ugc/campaigns?status=all&limit=50&mine=true")
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0);
  const totalViews  = campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0);

  if (loading) return (
     <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
       <div className="relative">
         <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
         <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
           <Target className="h-10 w-10 text-stone-900 dark:text-white" />
         </div>
       </div>
       <div className="text-center space-y-3">
          <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Mission Hub</h2>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Campaign Metrics</p>
       </div>
     </div>
  );

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
                    <Target className="h-8 w-8 text-orange-500" />
                 </div>
                 Mission Hub
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Track and manage your growth campaigns
              </p>
           </div>
           
           <div className="flex items-center gap-3">
              <Button asChild className="h-14 px-8 rounded-sm bg-stone-900 text-white shadow-none font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-black border-none">
                 <Link href="/dashboard/vendor/campaigns/new">
                    <Plus className="h-4 w-4 mr-3" /> Launch Mission
                 </Link>
              </Button>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-sky-50 border border-sky-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Video className="h-7 w-7 text-sky-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{campaigns.filter(c => c.status === "active").length}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Active Missions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <CircleDollarSign className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-emerald-600 tracking-tighter leading-none tabular-nums">{formatMoney(totalSpent, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Spend</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-sm bg-white dark:bg-surface/60 border-white shadow-none group">
              <div className="w-14 h-14 rounded-sm bg-amber-50 border border-amber-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Eye className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{formatCompactNumber(totalViews)}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Verified Outreach</p>
              </div>
           </GlassCard>
        </div>

        {/* Mission List */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">Campaign Registry</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                 <span className="w-2 h-2 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 Platform Sync Active
              </div>
           </div>
           
           {campaigns.length === 0 ? (
              <GlassCard className="p-24 text-center rounded-sm border-white bg-white dark:bg-surface/20">
                 <div className="w-24 h-24 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-8 border border-white shadow-none">
                    <Megaphone className="h-10 w-10 text-stone-100" />
                 </div>
                 <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">No Missions Found</h2>
                 <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-4 max-w-xs mx-auto leading-relaxed">
                    Start your growth journey by launching your first content mission.
                 </p>
                 <Button asChild className="h-16 px-12 rounded-sm bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-none mt-10 hover:bg-black transition-all border-none">
                    <Link href="/dashboard/vendor/campaigns/new">Launch First Mission</Link>
                 </Button>
              </GlassCard>
           ) : (
              <div className="grid grid-cols-1 gap-4">
                 {campaigns.map((c) => {
                   const sStyle = STATUS_STYLES[c.status] || { color: "indigo" };
                   const spendPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
                   const pendingReviews = (c.submission_count ?? 0) - (c.approved_count ?? 0);

                    return (
                      <GlassCard key={c.id} className="group bg-white dark:bg-surface/60 border-white hover:bg-white dark:bg-surface rounded-sm p-6 pr-10 flex flex-col lg:flex-row lg:items-center gap-8 transition-all duration-500 shadow-none hover:shadow-none">
                         
                         {/* Identity */}
                         <div className="flex-1 min-w-0 flex items-center gap-6 border-stone-50 lg:border-r lg:pr-8">
                            <div className="w-16 h-16 rounded-sm bg-stone-50 dark:bg-surface/50 border border-stone-100 dark:border-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-700">
                               <Video className="h-6 w-6 text-stone-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                               <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <GlassPill color={sStyle.color} className="text-[8px] font-black uppercase tracking-widest px-3 py-1 border-none bg-stone-900/5 shadow-none">{c.status}</GlassPill>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 bg-stone-50 dark:bg-surface/50 px-3 py-1 rounded-sm border border-stone-100 dark:border-border">{c.campaign_type}</span>
                               </div>
                               <h3 className="text-xl font-black text-stone-900 dark:text-white tracking-tighter truncate leading-none">{c.title}</h3>
                               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-2">Started {new Date(c.created_at).toLocaleDateString()}</p>
                            </div>
                         </div>

                         {/* Progress Card */}
                         <div className="w-full lg:w-56 shrink-0 flex flex-col justify-center gap-3">
                            <div className="flex justify-between items-end">
                               <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Budget Usage</span>
                               <span className="text-[11px] font-black text-stone-900 dark:text-white tabular-nums">{spendPct.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-stone-50 dark:bg-surface/50 rounded-sm overflow-hidden border border-stone-100 dark:border-border p-0.5">
                               <div className={cn("h-full rounded-sm transition-all duration-1000", spendPct > 85 ? "bg-orange-500" : "bg-emerald-500")} style={{ width: `${spendPct}%` }} />
                            </div>
                         </div>

                         {/* Actions Indicator */}
                         <div className="flex items-center gap-4">
                            <Link href={c.status === "draft" ? `/dashboard/vendor/campaigns/${c.id}` : `/dashboard/vendor/campaigns/${c.id}/submissions`} className="shrink-0 flex-1 lg:flex-none">
                               <div className={cn(
                                  "h-14 px-8 rounded-sm border flex items-center gap-4 transition-all hover:shadow-none relative",
                                  pendingReviews > 0 
                                     ? "bg-stone-900 text-white border-stone-900 shadow-stone-900/20" 
                                     : "bg-white dark:bg-surface border-white text-stone-600 hover:border-stone-100 dark:border-border shadow-none"
                               )}>
                                  <span className="text-[11px] font-black uppercase tracking-widest">{c.status === "draft" ? "Finalize" : "Manage"}</span>
                                  <ArrowRight className="h-4 w-4 opacity-50" />
                                  {pendingReviews > 0 && (
                                     <span className="absolute -top-3 -right-3 h-7 w-7 rounded-sm bg-orange-500 text-white text-[10px] flex items-center justify-center font-black ring-4 ring-white shadow-none animate-bounce">
                                        {pendingReviews}
                                     </span>
                                  )}
                               </div>
                            </Link>

                            {/* Archival */}
                            <button onClick={() => handleDeleteCampaign(c.id)} className="w-12 h-12 rounded-sm flex items-center justify-center text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-100 shadow-none hover:shadow-none">
                               <Trash2 className="h-5 w-5" />
                            </button>
                         </div>

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

