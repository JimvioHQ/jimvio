'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import { 
  Plus, Eye, Target, Video, Wallet, ArrowRight,
  TrendingUp, CircleDollarSign, BarChart3, AlertCircle, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
      
      alert("Campaign successfully funded and activated!");
      window.location.reload();
    } catch (e: any) {
      alert("Error: " + e.message);
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
      } else {
        const json = await res.json();
        alert("Error: " + (json.error || 'Failed to delete campaign'));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 fade-in pb-12">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-1.5 flex items-center gap-3">
              Content Missions
              <span className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {campaigns.length}
              </span>
            </h1>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">Scale your brand reach with our global creator network.</p>
          </div>
          <Link href="/dashboard/vendor/campaigns/new">
            <Button className="h-11 px-6 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-md font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-violet-500/20">
               <Plus className="h-4 w-4 mr-2" /> Launch Mission
            </Button>
          </Link>
        </div>

        {/* Executive Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-20 group-hover:opacity-100 transition-opacity"><Target className="h-10 w-10 text-blue-500" /></div>
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Total Campaigns</p>
            <p className="text-3xl font-bold text-[var(--color-text-primary)]">{campaigns.length}</p>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-20 group-hover:opacity-100 transition-opacity"><CircleDollarSign className="h-10 w-10 text-emerald-500" /></div>
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Budget Deployed</p>
            <div className="flex items-baseline gap-2">
               <p className="text-3xl font-bold text-[var(--color-text-primary)]">${formatCompactNumber(totalSpent)}</p>
               <p className="text-sm font-semibold text-[var(--color-text-muted)]">/ ${formatCompactNumber(totalBudget)}</p>
            </div>
          </div>
          <div className="rounded-[20px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-5 opacity-20 group-hover:opacity-100 transition-opacity"><Eye className="h-10 w-10 text-orange-500" /></div>
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Network Reach</p>
            <div className="flex items-baseline gap-2">
               <p className="text-3xl font-bold text-[var(--color-text-primary)]">{formatCompactNumber(totalViews)}</p>
               <p className="text-sm font-semibold text-[var(--color-text-muted)]">Verified Views</p>
            </div>
          </div>
        </div>

        {/* Registry Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4 px-1">Campaign Registry</h2>
          
          {loading ? (
             <div className="space-y-3">
               {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-[var(--color-surface-secondary)] animate-pulse" />)}
             </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-[var(--color-surface-secondary)] rounded-[24px] border border-[var(--color-border)] border-dashed">
              <div className="h-16 w-16 bg-white/5 border border-[var(--color-border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <Video className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">No Missions Yet</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mb-6">Create your first campaign to tap into thousands of active creators.</p>
              <Link href="/dashboard/vendor/campaigns/new">
                <Button className="font-semibold bg-white text-black hover:bg-zinc-200">Create Campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((c) => {
                const sStyle = STATUS_STYLES[c.status] || STATUS_STYLES.draft;
                const spendPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
                const pendingReviews = (c.submission_count ?? 0) - (c.approved_count ?? 0);

                return (
                  <div key={c.id} className="group rounded-[24px] bg-[var(--color-surface)] border border-[var(--color-border)] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6">
                    
                    {/* Status & Identity Ribbon */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest", sStyle.bg, sStyle.text, sStyle.border)}>
                           <span className={cn("w-1.5 h-1.5 rounded-full", sStyle.dot)} />
                           {c.status}
                        </span>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                          {c.campaign_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)] truncate mb-2">{c.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--color-text-muted)] font-medium">
                        <div className="flex items-center gap-1.5">
                           <Wallet className="h-4 w-4 text-[var(--color-accent)]" /> 
                           {c.payment_model === 'fixed_per_content' ? `$${c.fixed_rate} Flat` : `$${c.rate_per_1k_views}/1K Views`}
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Eye className="h-4 w-4 opacity-70" /> {formatCompactNumber(c.total_views_tracked ?? 0)} Views
                        </div>
                        <div className="flex items-center gap-1.5">
                           <Video className="h-4 w-4 opacity-70" /> {c.approved_count ?? 0} Assets
                        </div>
                      </div>
                    </div>

                    {/* Escrow Progress */}
                    <div className="w-full md:w-56 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-[var(--color-border)]">
                       <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Escrow Spend</span>
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">${formatCompactNumber(c.spent_budget ?? 0)} <span className="text-zinc-500">/ ${formatCompactNumber(c.total_budget)}</span></span>
                       </div>
                       <div className="h-2 bg-[var(--color-surface-secondary)] rounded-full overflow-hidden shadow-inner">
                          <div className={cn("h-full rounded-full transition-all", spendPct > 80 ? "bg-amber-500" : "bg-[var(--color-accent)]")} style={{ width: `${spendPct}%` }} />
                       </div>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 border-[var(--color-border)] pt-4 md:pt-0 justify-end">
                      {c.status === 'draft' ? (
                        <>
                           <Button onClick={() => handleFundCampaign(c.id)} disabled={fundingId === c.id} className="w-full md:w-36 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md font-bold text-xs h-10 shadow-orange-500/20 active:scale-95">
                             {fundingId === c.id ? <AlertCircle className="h-4 w-4 mr-2 animate-pulse" /> : <Wallet className="h-4 w-4 mr-2" />} 
                             {fundingId === c.id ? 'Funding...' : 'Fund Escrow'}
                           </Button>
                           <Link href={`/dashboard/vendor/campaigns/${c.id}`} className="w-full md:w-36">
                              <Button variant="outline" className="w-full rounded-xl text-xs font-semibold h-10 border-[var(--color-border)]">Edit Blueprints</Button>
                           </Link>
                           <Button 
                             variant="ghost" 
                             onClick={() => handleDeleteCampaign(c.id)}
                             className="w-full md:w-36 rounded-xl text-xs font-semibold h-10 text-red-500 hover:bg-red-50 hover:text-red-600"
                           >
                             <Trash2 className="h-4 w-4 mr-2" /> Delete
                           </Button>
                        </>
                      ) : (
                        <>
                           <Link href={`/dashboard/vendor/campaigns/${c.id}/submissions`} className="w-full md:w-36">
                              <Button className="w-full rounded-xl font-bold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-md text-xs h-10 shadow-violet-500/20 relative">
                                Review Queue
                                {pendingReviews > 0 && <span className="absolute -top-2 -right-2 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1 font-black ring-2 ring-[var(--color-surface)] animate-bounce">{pendingReviews}</span>}
                              </Button>
                           </Link>
                            <Link href={`/dashboard/vendor/campaigns/${c.id}`} className="w-full md:w-36">
                               <Button variant="outline" className="w-full rounded-xl text-xs font-semibold h-10 border-[var(--color-border)] group">
                                 View Analytics <BarChart3 className="h-3.5 w-3.5 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                               </Button>
                            </Link>
                         </>
                       )}
                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
