'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import { 
  Plus, Eye, Target, Video, Wallet, ArrowRight,
  TrendingUp, CircleDollarSign, BarChart3, AlertCircle, Trash2,
  Loader2, Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { useCurrency } from '@/context/CurrencyContext';

const STATUS_STYLES: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  active:    { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  draft:     { bg: 'bg-zinc-500/10',    text: 'text-zinc-600 dark:text-zinc-400',       border: 'border-zinc-500/20',    dot: 'bg-zinc-400' },
  paused:    { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-500/20',   dot: 'bg-amber-500' },
  completed: { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-500/20',    dot: 'bg-blue-500' },
  cancelled: { bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',         border: 'border-red-500/20',     dot: 'bg-red-500' },
};

function formatCompactNumber(number: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

export default function BrandCampaignsPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundingId, setFundingId] = useState<string | null>(null);

  async function handleFundCampaign(id: string) {
    if (!confirm("Are you sure you want to deposit the campaign budget into Jimvio Escrow via MoMo to activate this campaign?")) return;
    setFundingId(id);
    
    try {
      const depRes = await fetch(`/api/ugc/campaigns/${id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '250781234567' })
      });
      const depJson = await depRes.json();
      if (!depRes.ok) throw new Error(depJson.error || 'Failed to deposit');

      const actRes = await fetch(`/api/ugc/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (!actRes.ok) throw new Error('Failed to activate campaign');
      
      toast.success("Campaign successfully funded and activated!");
      window.location.reload();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setFundingId(null);
    }
  }

  async function handleDeleteCampaign(id: string) {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success("Campaign archived");
      } else {
        const json = await res.json();
        toast.error("Error: " + (json.error || 'Failed to delete campaign'));
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  }

  useEffect(() => {
    fetch('/api/ugc/campaigns?status=all&limit=50&mine=true')
      .then((r) => r.json())
      .then((j) => setCampaigns(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_budget ?? 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.total_budget ?? 0), 0);
  const totalViews  = campaigns.reduce((s, c) => s + (c.total_views_tracked ?? 0), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
      <Loader2 className="h-8 w-8 text-[var(--color-accent)] animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading Missions...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-500 fade-in pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 px-2">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-xl">
               <Target className="h-6 w-6 text-white" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  Content Missions
                  <span className="text-zinc-300 font-bold">{campaigns.length}</span>
               </h1>
               <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Growth Center</p>
            </div>
         </div>

         <Link href="/dashboard/vendor/campaigns/new">
            <Button className="h-11 px-6 rounded-xl bg-zinc-900 text-white hover:bg-black font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
               <Plus className="h-4 w-4 mr-2" /> Launch Mission
            </Button>
         </Link>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         {[
           { label: "Active Deployments", value: campaigns.filter(c => c.status === 'active').length, icon: Video, color: "text-blue-500", bg: "bg-blue-50" },
           { label: "Budget Burned", value: formatMoney(totalSpent, "USD"), icon: CircleDollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
           { label: "Verified Outreach", value: formatCompactNumber(totalViews), icon: Eye, color: "text-amber-500", bg: "bg-amber-50" },
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

      {/* ── MISSION LIST ── */}
      <div className="space-y-4">
         <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 px-2">Active Registry</h2>
         
         {campaigns.length === 0 ? (
            <div className="py-20 text-center rounded-[32px] bg-zinc-50 border border-zinc-100 border-dashed">
               <Megaphone className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
               <p className="text-sm font-bold text-zinc-500">No missions found. Start your first campaign.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-3">
               {campaigns.map((c) => {
                 const sStyle = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                 const spendPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
                 const pendingReviews = (c.submission_count ?? 0) - (c.approved_count ?? 0);

                  return (
                    <div key={c.id} className="group bg-white border border-zinc-100 hover:border-zinc-300 rounded-[28px] p-4 pr-6 flex flex-col md:flex-row md:items-center gap-6 transition-all shadow-sm hover:shadow-md">
                       
                       {/* Identity */}
                       <div className="flex-1 min-w-0 flex items-center gap-4 border-r border-zinc-100 md:pr-6">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                             <Video className="h-5 w-5 text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border", sStyle.bg, sStyle.text, sStyle.border)}>{c.status}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">{c.campaign_type}</span>
                             </div>
                             <h3 className="text-base font-black text-zinc-900 truncate">{c.title}</h3>
                             <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mt-0.5">Launched {new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                       </div>

                       {/* Progress Card */}
                       <div className="w-full md:w-48 shrink-0 flex flex-col justify-center gap-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Escrow Sync</span>
                             <span className="text-xs font-black text-zinc-900">{formatCompactNumber(spendPct)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                             <div className={cn("h-full transition-all", spendPct > 85 ? "bg-amber-500" : "bg-zinc-900")} style={{ width: `${spendPct}%` }} />
                          </div>
                       </div>

                       {/* Review Indicator */}
                       <Link href={c.status === 'draft' ? `/dashboard/vendor/campaigns/${c.id}` : `/dashboard/vendor/campaigns/${c.id}/submissions`} className="shrink-0">
                          <div className={cn(
                             "h-10 px-5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer relative",
                             pendingReviews > 0 ? "bg-red-50 border-red-100 text-red-600" : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300"
                          )}>
                             <span className="text-[10px] font-black uppercase tracking-widest">{c.status === 'draft' ? 'Finalize' : 'Review'}</span>
                             <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                             {pendingReviews > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center font-black ring-4 ring-white">{pendingReviews}</span>}
                          </div>
                       </Link>

                       {/* Archival */}
                       <button onClick={() => handleDeleteCampaign(c.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                       </button>

                    </div>
                  );
               })}
            </div>
         )}
      </div>

    </div>
  );
}



