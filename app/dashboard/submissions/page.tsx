"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UGCSubmission } from "@/types/ugc";
import { 
  Video, Play, CheckCircle, 
  Clock, XCircle, TrendingUp, 
  DollarSign, ExternalLink, Filter,
  LayoutDashboard, Camera, MessageSquare, ArrowRight, Trash2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

const STATUS_CONFIG: Record<string, { label: string; color: "orange" | "emerald" | "rose" | "indigo"; icon: any }> = {
  pending:  { label: "Pending Review",  color: "orange",  icon: Clock },
  approved: { label: "Approved", color: "emerald", icon: CheckCircle },
  rejected: { label: "Needs Revision", color: "rose",     icon: XCircle },
  removed:  { label: "Removed",  color: "rose",  icon: XCircle },
};

const PLATFORM_ICONS: Record<string, any> = {
  tiktok:    { icon: Play,  color: "text-stone-900 dark:text-white", bg: "bg-stone-50 dark:bg-surface/50" },
  instagram: { icon: Camera, color: "text-orange-500", bg: "bg-orange-50" },
  youtube:   { icon: Play,  color: "text-red-500", bg: "bg-red-50" },
  x:         { icon: MessageSquare, color: "text-stone-800 dark:text-text-secondary", bg: "bg-stone-100" },
};

function SubmissionCard({ sub, onDelete }: { sub: UGCSubmission; onDelete: (id: string) => void }) {
  const { formatMoney } = useCurrency();
  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
  const pCfg = PLATFORM_ICONS[sub.platform] || { icon: Video, color: "text-stone-500", bg: "bg-stone-50 dark:bg-surface/50" };

  return (
    <GlassCard className="p-8 rounded-none bg-white dark:bg-surface border-white hover:shadow-none hover:shadow-orange-500/5 transition-all duration-500 relative group">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Platform Display */}
        <div className={cn("w-20 h-20 rounded-none flex items-center justify-center shrink-0 border border-white shadow-none group-hover:scale-110 transition-transform duration-700", pCfg.bg)}>
          <pCfg.icon className={cn("h-8 w-8", pCfg.color)} />
        </div>

        <div className="flex-1 space-y-6 w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="space-y-2">
                <h3 className="text-xl font-black text-stone-900 dark:text-white tracking-tighter leading-none">
                   {sub.campaign?.title ?? "Standard Mission"}
                </h3>
                <div className="flex items-center gap-2">
                   <GlassPill color={cfg.color} className="font-black py-1 px-3 text-[8px] uppercase tracking-[0.2em] shadow-none border-none">
                      <cfg.icon className="h-2.5 w-2.5 mr-1" />
                      {cfg.label}
                   </GlassPill>
                   <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest ml-2">#{sub.id.slice(0, 8)}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-3">
                <a
                  href={sub.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-5 rounded-none bg-orange-50/50 border border-orange-100/50 text-orange-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-orange-50 transition-all active:scale-95"
                >
                  {sub.platform} Post <ExternalLink className="h-3.5 w-3.5" />
                </a>
                
                {(sub.status === "pending" || sub.status === "rejected") && (
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="h-10 w-10 flex items-center justify-center rounded-none bg-rose-50 border border-rose-100/50 text-rose-500 hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
             </div>
          </div>

          {sub.status === "rejected" && sub.rejection_reason && (
            <div className="p-5 rounded-none bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-600 leading-relaxed shadow-inner">
              <span className="font-black uppercase tracking-widest mr-2 block mb-1">Brand Feedback:</span> 
              {sub.rejection_reason}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-stone-50">
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Views Earned</p>
               <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-lg font-black text-stone-900 dark:text-white tabular-nums">{(sub.total_views_earned ?? 0).toLocaleString()}</span>
               </div>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Total Earned</p>
               <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-lg font-black text-emerald-600 tabular-nums">{formatMoney(Number(sub.total_earnings) || 0, "USD")}</span>
               </div>
            </div>
            <div className="space-y-1 hidden md:block">
               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Submitted Date</p>
               <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-stone-300" />
                  <span className="text-lg font-black text-stone-900 dark:text-white">
                     {new Date(sub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function DashboardSubmissionsPage() {
  const { formatMoney } = useCurrency();
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
       setLoading(true);
       try {
          const params = new URLSearchParams({ limit: "50" });
          if (statusFilter !== "all") params.set("status", statusFilter);
          const res = await fetch(`/api/ugc/submissions?${params}`);
          if (res.ok) {
             const json = await res.json();
             setSubmissions(json.data ?? []);
          }
       } catch (err) {
          console.error(err);
       } finally {
          setLoading(false);
       }
    }
    load();
  }, [statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("ugc_submissions").delete().eq("id", id);
      if (!error) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
      } else {
        alert("Failed to delete submission.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stats = {
    total: submissions.length,
    approved: submissions.filter(s => s.status === "approved").length,
    pending: submissions.filter(s => s.status === "pending").length,
    earned: submissions.reduce((sum, s) => sum + (Number(s.total_earnings) || 0), 0)
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-none bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-none animate-spin m-2" />
            <Video className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Submissions</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Content Performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-5xl mx-auto space-y-12 px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-none bg-white dark:bg-surface border border-white shadow-none shrink-0">
                    <Video className="h-8 w-8 text-orange-500" />
                 </div>
                 My Submissions
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Track your content performance and earned rewards
              </p>
           </div>
           <div className="flex items-center gap-4 bg-white dark:bg-surface/40 p-1.5 rounded-none border border-white shadow-none backdrop-blur-xl">
              <div className="w-3 h-3 rounded-none bg-orange-500 ml-4 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white pr-6 pl-2">Sync Active</span>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none transition-all hover:scale-105 duration-700">
              <div className="w-14 h-14 rounded-none bg-stone-50 dark:bg-surface/50 border border-stone-100 dark:border-border flex items-center justify-center mb-6">
                 <Video className="h-7 w-7 text-stone-900 dark:text-white" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.total.toLocaleString()}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Total Submissions</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none transition-all hover:scale-105 duration-700">
              <div className="w-14 h-14 rounded-none bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
                 <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.approved.toLocaleString()}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Approved Videos</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface/60 border-white shadow-none transition-all hover:scale-105 duration-700">
              <div className="w-14 h-14 rounded-none bg-orange-50 border border-orange-100 flex items-center justify-center mb-6">
                 <Clock className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter leading-none tabular-nums">{stats.pending.toLocaleString()}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Pending Review</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-none bg-white dark:bg-surface border-white shadow-none transition-all hover:scale-105 duration-700">
              <div className="w-14 h-14 rounded-none bg-stone-900 text-white flex items-center justify-center mb-6">
                 <DollarSign className="h-7 w-7" />
              </div>
              <div>
                 <p className="text-3xl font-black text-emerald-600 tracking-tighter leading-none tabular-nums">{formatMoney(stats.earned, "USD")}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Total Earnings</p>
              </div>
           </GlassCard>
        </div>

        {/* Filters Hub */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-2 md:pb-0">
              {["all", "pending", "approved", "rejected"].map((f) => (
                 <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                       "px-8 h-12 rounded-none text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 shadow-none",
                       statusFilter === f
                          ? "bg-stone-900 border-stone-900 text-white shadow-none shadow-stone-900/10"
                          : "bg-white dark:bg-surface border-white text-stone-400 hover:text-stone-900 dark:text-white"
                    )}
                 >
                    {f}
                 </button>
              ))}
           </div>
           
           <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex items-center justify-center rounded-none bg-white dark:bg-surface border border-white text-stone-400 shadow-none">
                 <Filter className="h-4 w-4" />
              </div>
              <Button asChild className="h-12 px-8 rounded-none bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-none shadow-orange-500/20 active:scale-95 transition-all border-none">
                 <Link href="/ugc">Explore missions <ArrowRight className="h-4 w-4 ml-3" /></Link>
              </Button>
           </div>
        </div>

        {/* Content registry */}
        {loading ? (
           <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                 <div key={i} className="h-48 rounded-none bg-white dark:bg-surface border border-white animate-pulse shadow-none" />
              ))}
           </div>
        ) : submissions.length === 0 ? (
           <GlassCard className="p-24 text-center rounded-none border-white bg-white dark:bg-surface/20">
              <div className="w-24 h-24 bg-white dark:bg-surface rounded-none flex items-center justify-center mx-auto mb-8 border border-white shadow-none">
                 <Video className="h-10 w-10 text-stone-100" />
              </div>
              <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">No Activity Logged</h2>
              <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-4 max-w-xs mx-auto leading-relaxed">
                 You haven't submitted any content yet. Explore missions to start earning.
              </p>
              <Button asChild className="h-16 px-12 rounded-none bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-none mt-10 hover:bg-black transition-all border-none">
                 <Link href="/ugc">Browse Campaigns</Link>
              </Button>
           </GlassCard>
        ) : (
           <div className="space-y-6">
              {submissions.map((sub) => <SubmissionCard key={sub.id} sub={sub} onDelete={handleDelete} />)}
           </div>
        )}
      </div>
    </div>
  );
}

