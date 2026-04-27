"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle2, XCircle, Clock, 
  ExternalLink, Video, Check,
  Search, Filter, Play,
  MoreVertical, RefreshCcw, Loader2, Sparkles, AlertCircle, Calendar, ArrowRight
} from "lucide-react";
import type { UGCSubmission } from "@/types/ugc";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { icon: any, color: "orange" | "emerald" | "rose" | "indigo", label: string }> = {
  pending:  { icon: Clock,        color: "orange",    label: "Pending Review" },
  approved: { icon: CheckCircle2, color: "emerald",  label: "Approved" },
  rejected: { icon: XCircle,      color: "rose",      label: "Rejected" },
};

export default function VendorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ugc/submissions?status=${statusFilter === "all" ? "" : statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/ugc/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Content successfully ${status}!`);
        loadSubmissions();
      } else {
        toast.error("Failed to update status");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  if (loading && submissions.length === 0) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
         <div className="relative">
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
             <Video className="h-10 w-10 text-stone-900 dark:text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Submissions</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Incoming Content</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-6xl mx-auto space-y-12 px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-sm bg-white dark:bg-surface border border-white shadow-none shrink-0">
                    <Video className="h-8 w-8 text-orange-500" />
                 </div>
                 Mission Submissions
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Review and verify creator content for your missions
              </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-surface/40 p-1.5 rounded-sm border border-white shadow-none backdrop-blur-xl shrink-0">
              {["pending", "approved", "rejected", "all"].map((f) => (
                 <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                       "px-6 h-11 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
                       statusFilter === f
                          ? "bg-stone-900 text-white shadow-none"
                          : "text-stone-400 hover:text-stone-900 dark:text-white"
                    )}
                 >
                    {f}
                    {f === "pending" && pendingCount > 0 && (
                       <span className="ml-2 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-sm ring-2 ring-white">
                          {pendingCount}
                       </span>
                    )}
                 </button>
              ))}
           </div>
        </div>

        {/* Content Feed */}
        <div className="space-y-6">
          {submissions.length === 0 ? (
            <GlassCard className="p-24 text-center rounded-sm border-white bg-white dark:bg-surface/20">
               <div className="w-24 h-24 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-8 border border-white shadow-none">
                  <CheckCircle2 className="h-10 w-10 text-stone-100" />
               </div>
               <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">You're All Caught Up</h2>
               <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mt-4 max-w-xs mx-auto leading-relaxed">
                  No {statusFilter !== "all" ? statusFilter : ""} assets require review right now.
               </p>
               <Button asChild className="h-16 px-12 rounded-sm bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-none mt-10 hover:bg-black transition-all border-none">
                  <Link href="/dashboard/vendor/campaigns">Back to Missions</Link>
               </Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map((sub) => {
                const conf = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
                const isProcessing = processingId === sub.id;
                const campaign = sub.campaign as any;

                return (
                  <GlassCard 
                    key={sub.id} 
                    className="group bg-white dark:bg-surface/60 border-white rounded-sm p-8 hover:shadow-none transition-all duration-500"
                  >
                    <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                      
                      {/* Creator Profile */}
                      <div className="flex items-center gap-5 lg:w-[280px] shrink-0">
                        <div className="w-16 h-16 rounded-sm bg-stone-900 flex items-center justify-center text-white font-black shadow-none shrink-0 group-hover:scale-110 transition-transform duration-700">
                          {sub.influencer?.display_name?.[0]?.toUpperCase() || "C"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-black text-stone-900 dark:text-white truncate tracking-tight mb-1">
                            {sub.influencer?.display_name || "Anonymous Creator"}
                          </p>
                          <div className="flex items-center gap-3">
                             <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-2.5 py-1 rounded-sm border border-orange-100">{sub.platform}</span>
                             <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(sub.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Details Segment */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50/50 rounded-sm p-6 border border-stone-100/50">
                        <div>
                           <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-1.5">Mission Title</p>
                           <p className="text-[14px] text-stone-900 dark:text-white font-black truncate tracking-tight">
                             {campaign?.title || "Standard Campaign"}
                           </p>
                           <a 
                             href={sub.post_url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1.5 text-[11px] text-blue-500 hover:text-blue-600 font-bold tracking-tight mt-2 transition-colors"
                           >
                             Watch Review <ExternalLink className="w-3 h-3" />
                           </a>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-1.5">Reward Profile</p>
                           <div className="flex items-baseline gap-2">
                              <p className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">
                                {campaign?.payment_model === "fixed_per_content" ? `$${campaign?.fixed_rate}` : `$${campaign?.rate_per_1k_views}`}
                              </p>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                {campaign?.payment_model === "fixed_per_content" ? "Fixed" : "per 1K Views"}
                              </p>
                           </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-end gap-3 lg:w-[240px] shrink-0 w-full">
                        {sub.status === "pending" ? (
                          <div className="flex items-center gap-3 w-full">
                            <Button 
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(sub.id, "rejected")}
                              variant="ghost"
                              className="flex-1 h-14 rounded-sm text-rose-500 hover:bg-rose-50 font-black text-[11px] uppercase tracking-widest border border-transparent hover:border-rose-100 transition-all"
                            >
                              Reject
                            </Button>
                            <Button 
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(sub.id, "approved")}
                              className="flex-1 h-14 rounded-sm bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-none active:scale-95 transition-all hover:bg-black border-none"
                            >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end w-full">
                             <GlassPill color={conf.color} className="px-5 py-2.5 font-black text-[10px] uppercase tracking-[0.15em] shadow-none border-none">
                                <conf.icon className="w-4 h-4 mr-2" />
                                {conf.label}
                             </GlassPill>
                          </div>
                        )}
                      </div>

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

