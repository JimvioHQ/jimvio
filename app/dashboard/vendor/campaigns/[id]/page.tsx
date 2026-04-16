'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Hash, Users, Type, 
  Clock, DollarSign, TrendingUp,
  LayoutDashboard, MoreVertical,
  CheckCircle, ShieldCheck,
  Calendar, Info, Plus
} from 'lucide-react';
import type { UGCCampaign } from '@/types/ugc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  draft:     'bg-slate-500/20 text-[var(--color-text-muted)] border-slate-500/30',
  paused:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ['active', 'cancelled'],
  active:    ['paused', 'completed', 'cancelled'],
  paused:    ['active', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function BrandCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMoney } = useCurrency();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Escrow Funding States
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundPhone, setFundPhone] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/ugc/campaigns/${id}`);
    const json = await res.json();
    setCampaign(json.campaign ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(newStatus: string) {
    setUpdating(true);
    const res = await fetch(`/api/ugc/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (res.status === 402) {
      alert("You must fund the campaign into Escrow before activating it.");
      setShowFundModal(true);
    } else {
      await load();
    }
    setUpdating(false);
  }

  async function handleFundCampaign() {
    if (!fundPhone) return;
    setIsFunding(true);
    setFundError(null);
    try {
      const res = await fetch(`/api/ugc/campaigns/${id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fundPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fund campaign');
      alert('Campaign funded successfully! You may now activate it.');
      setShowFundModal(false);
    } catch (err: any) {
      setFundError(err.message);
    } finally {
      setIsFunding(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center text-zinc-500 font-black">
        Campaign not found
      </div>
    );
  }

  const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
  const remainingBudget = campaign.total_budget - (campaign.spent_budget ?? 0);
  const earnRate = campaign.total_views_tracked
    ? ((campaign.spent_budget ?? 0) / (campaign.total_views_tracked / 1000)).toFixed(2)
    : '—';
  const nextStatuses = STATUS_TRANSITIONS[campaign.status] ?? [];

  return (
    <div className="min-h-screen bg-[var(--color-surface)] pb-20">
      
      {/* Funding Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative">
             <h2 className="text-2xl font-black text-white mb-2">Fund Campaign</h2>
             <p className="text-sm text-zinc-400 font-medium mb-6">Deposit {formatMoney(campaign.total_budget, "RWF")} to your secure Jimvio Escrow vault before activating.</p>
             
             {fundError && <p className="text-xs text-red-500 font-bold mb-4">{fundError}</p>}
             
             <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Mobile Money Phone (e.g. 2507...)"
                  className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 text-white text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors"
                  value={fundPhone}
                  onChange={(e) => setFundPhone(e.target.value)}
                />
                <div className="flex gap-3">
                   <Button onClick={() => setShowFundModal(false)} variant="outline" className="flex-1 h-12 bg-transparent text-zinc-400 border-zinc-800 rounded-2xl hover:bg-zinc-900 hover:text-white">Cancel</Button>
                   <Button onClick={handleFundCampaign} disabled={isFunding || !fundPhone} className="flex-1 h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest disabled:opacity-50">
                     {isFunding ? 'Processing...' : 'Deposit Funds'}
                   </Button>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/vendor/campaigns" className="group h-12 w-12 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center hover:bg-zinc-800 transition-all">
               <ArrowLeft className="h-6 w-6 text-zinc-400 group-hover:text-white" />
            </Link>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-[var(--color-text-primary)] leading-none tracking-tight">{campaign.title}</h1>
                <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest", STATUS_COLORS[campaign.status])}>
                  {campaign.status}
                </span>
              </div>
              <p className="text-sm text-zinc-500 font-medium">{campaign.campaign_type.toUpperCase()} Mission • Created {new Date(campaign.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             {campaign.status === 'draft' && (
                <Button
                  onClick={() => setShowFundModal(true)}
                  className="h-12 px-6 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Deposit Escrow
                </Button>
             )}
             {nextStatuses.map((s) => (
               <Button
                 key={s}
                 onClick={() => changeStatus(s)}
                 disabled={updating}
                 className={cn(
                   "h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                   s === 'active'    ? "bg-emerald-600 hover:bg-emerald-500 text-white" :
                   s === 'paused'    ? "bg-amber-600   hover:bg-amber-500   text-white" :
                   s === 'cancelled' ? "bg-red-600     hover:bg-red-500     text-white" :
                   "bg-zinc-800 text-zinc-400"
                 )}
               >
                 Mark as {s}
               </Button>
             ))}
             <Button asChild variant="outline" className="h-12 w-12 rounded-2xl border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <Link href={`/dashboard/vendor/campaigns/${id}/edit`}><Plus className="h-5 w-5 transform rotate-45" /></Link>
             </Button>
          </div>
        </div>

        {/* TOP STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
           {[
             { label: 'Total Earnings', val: formatMoney(campaign.spent_budget || 0, "RWF"), icon: DollarSign, color: 'text-emerald-500' },
             { label: 'Views Result', val: `${((campaign.total_views_tracked ?? 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-orange-500' },
             { label: 'Submissions', val: campaign.submission_count ?? 0, icon: LayoutDashboard, color: 'text-blue-500' },
             { label: 'Approved', val: campaign.approved_count ?? 0, icon: CheckCircle, color: 'text-white' },
           ].map((s, i) => (
             <div key={i} className="p-6 rounded-[32px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] shadow-xl flex flex-col justify-center gap-1 group">
                <div className="flex items-center justify-between w-full mb-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{s.label}</span>
                   <s.icon className={cn("h-4 w-4 opacity-40", s.color)} />
                </div>
                <p className="text-2xl font-black text-[var(--color-text-primary)] whitespace-nowrap">{s.val}</p>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* LEFT COLUMN: UTILIZATION & REQUIREMENTS */}
           <div className="lg:col-span-8 space-y-8">
              
              {/* UTILIZATION CARD */}
              <div className="p-8 rounded-[40px] bg-zinc-950 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/15 blur-3xl rounded-full" />
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between">
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Budget Utilization</h2>
                      <div className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900/10 border border-white/10 text-[10px] font-black">
                         {budgetPct.toFixed(1)}% CONSUMED
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                         <p className="text-4xl font-black tracking-tight">{formatMoney(campaign.spent_budget || 0, "RWF")}</p>
                         <p className="text-sm font-bold text-zinc-500">Target: {formatMoney(campaign.total_budget, "RWF")}</p>
                      </div>
                      <div className="h-3 w-full bg-white dark:bg-zinc-900/5 rounded-full overflow-hidden border border-white/5">
                         <div 
                           className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-1000"
                           style={{ width: `${budgetPct}%` }}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/5">
                      <div>
                         <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Remaining</p>
                         <p className="text-lg font-black text-white">{formatMoney(remainingBudget, "RWF")}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Eff. Rate</p>
                         <p className="text-lg font-black text-white">{earnRate === '—' ? '—' : `$${earnRate}/1K`}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Status</p>
                         <p className="text-lg font-black text-emerald-500">Optimal</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* MISSION REQUIREMENTS CARD */}
              <div className="p-8 rounded-[40px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] shadow-xl space-y-10">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <Info className="h-4 w-4 text-orange-500" />
                   </div>
                   <h2 className="text-lg font-black text-[var(--color-text-primary)]">Mission Parameters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   {/* Text Requirements */}
                   <div className="space-y-8">
                      {campaign.required_hashtags?.length > 0 && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Hashtags</p>
                           <div className="flex flex-wrap gap-2">
                             {campaign.required_hashtags.map((h, i) => (
                               <span key={i} className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-black">#{h}</span>
                             ))}
                           </div>
                        </div>
                      )}
                      
                      {campaign.required_mentions?.length > 0 && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Mentions</p>
                           <div className="flex flex-wrap gap-2">
                             {campaign.required_mentions.map((m, i) => (
                               <span key={i} className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-black">@{m}</span>
                             ))}
                           </div>
                        </div>
                      )}

                      {campaign.required_keywords?.length > 0 && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Keywords</p>
                           <div className="flex flex-wrap gap-2">
                             {campaign.required_keywords.map((k, i) => (
                               <span key={i} className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-black">{k}</span>
                             ))}
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Format Requirements */}
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Video Duration</p>
                         <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4">
                            <Clock className="h-5 w-5 text-zinc-400" />
                            <div>
                               <p className="text-sm font-black text-[var(--color-text-primary)]">{campaign.min_duration}s - {campaign.max_duration}s</p>
                               <p className="text-[10px] font-bold text-zinc-500 uppercase">Recommended Length</p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Identity Check</p>
                         <div className={cn("p-4 rounded-2xl border flex items-center gap-4", campaign.requires_face ? "bg-emerald-500/10 border-emerald-500/20" : "bg-zinc-800/50 border-zinc-800")}>
                            <ShieldCheck className={cn("h-5 w-5", campaign.requires_face ? "text-emerald-500" : "text-zinc-600")} />
                            <div>
                               <p className={cn("text-sm font-black", campaign.requires_face ? "text-emerald-500" : "text-zinc-500")}>
                                  {campaign.requires_face ? "Face Required" : "Identity Neutral"}
                               </p>
                               <p className="text-[10px] font-bold text-zinc-500 uppercase">Visual Mandate</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {campaign.content_guidelines && (
                   <div className="pt-8 border-t border-[var(--color-border)] space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Action Guidelines</p>
                      <div className="text-sm text-zinc-400 font-medium leading-relaxed whitespace-pre-line bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-border)]">
                        {campaign.content_guidelines}
                      </div>
                   </div>
                )}
              </div>
           </div>

           {/* RIGHT COLUMN: ACTIONS & NAVIGATION */}
           <div className="lg:col-span-4 space-y-6">
              
              <Link
                href={`/dashboard/vendor/campaigns/${id}/submissions`}
                className="group flex flex-col p-8 rounded-[40px] bg-white dark:bg-zinc-900 text-zinc-950 shadow-2xl relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6 group-hover:text-violet-600 transition-colors">Action Required</span>
                <div className="flex items-center justify-between mb-2">
                   <p className="text-3xl font-black">Review Queue</p>
                   <ArrowLeft className="h-6 w-6 transform rotate-180" />
                </div>
                <p className="text-sm font-bold text-zinc-500">
                   {(campaign.submission_count ?? 0) - (campaign.approved_count ?? 0)} pending submissions await your feedback.
                </p>
              </Link>

              <div className="p-8 rounded-[40px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] shadow-xl space-y-6">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Campaign Logistics</p>
                 <div className="space-y-4">
                    {[
                      { icon: Calendar, label: "Started", val: campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString() : "Immediate" },
                      { icon: Calendar, label: "Expires", val: campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString() : "Never" },
                      { icon: DollarSign, label: "Max Per Sub", val: formatMoney(campaign.max_payout_per_sub || 0, "RWF") },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                         <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 text-zinc-500" />
                            <span className="text-[10px] font-black uppercase text-zinc-500">{item.label}</span>
                         </div>
                         <span className="text-xs font-black text-[var(--color-text-primary)]">{item.val}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 rounded-[40px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] shadow-xl space-y-6 text-center">
                 <div className="w-16 h-16 rounded-full bg-violet-600/10 flex items-center justify-center mx-auto mb-2">
                    <Info className="h-8 w-8 text-[var(--color-accent)]" />
                 </div>
                 <h3 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-widest">Need Support?</h3>
                 <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                    Our team can help optimize your campaign briefings for higher creator conversion.
                 </p>
                 <Button variant="outline" className="w-full h-12 rounded-2xl border-[var(--color-border)] text-xs font-black uppercase tracking-widest">
                    Contact Liaison
                 </Button>
              </div>

           </div>

        </div>

      </div>
    </div>
  );
}
