'use client';

import { useEffect, useState } from 'react';
import type { UGCSubmission } from '@/types/ugc';
import { 
  Video, Play, CheckCircle, 
  Clock, XCircle, TrendingUp, 
  DollarSign, ExternalLink, Filter,
  LayoutDashboard, Camera, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any; border: string }> = {
  pending:  { label: 'Pending',  bg: 'bg-amber-50',  text: 'text-amber-600',  icon: Clock,       border: 'border-amber-100' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle, border: 'border-emerald-100' },
  rejected: { label: 'Rejected', bg: 'bg-red-50',     text: 'text-red-600',     icon: XCircle,     border: 'border-red-100' },
  removed:  { label: 'Removed',  bg: 'bg-slate-50',  text: 'text-slate-500',  icon: XCircle,     border: 'border-slate-100' },
};

const PLATFORM_ICONS: Record<string, any> = {
  tiktok:    { icon: Play,  color: 'text-zinc-900', bg: 'bg-zinc-50' },
  instagram: { icon: Camera, color: 'text-orange-500', bg: 'bg-orange-50' },
  youtube:   { icon: Play,  color: 'text-red-500', bg: 'bg-red-50' },
  x:         { icon: MessageSquare, color: 'text-zinc-800', bg: 'bg-zinc-100' },
};

function SubmissionCard({ sub, onDelete }: { sub: UGCSubmission; onDelete: (id: string) => void }) {
  const { formatMoney } = useCurrency();
  const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending;
  const pCfg = PLATFORM_ICONS[sub.platform] || { icon: Video, color: 'text-zinc-500', bg: 'bg-zinc-50' };

  return (
    <div className="group p-5 rounded-[32px] bg-white border border-zinc-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Media / Platform Icon */}
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-100/50 shadow-inner", pCfg.bg)}>
          <pCfg.icon className={cn("h-6 w-6", pCfg.color)} />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
             <div className="space-y-1">
                <p className="text-sm font-black text-zinc-900 tracking-tight leading-none">
                   {sub.campaign?.title ?? 'Campaign'}
                </p>
                <div className={cn("w-fit px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", cfg.bg, cfg.text, cfg.border)}>
                   <cfg.icon className="h-3 w-3" />
                   {cfg.label}
                </div>
             </div>
             <div className="flex items-center gap-2">
               <a
                 href={sub.post_url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-[11px] font-black text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50 w-fit"
               >
                 {sub.platform.toUpperCase()} POST <ExternalLink className="h-3 w-3" />
               </a>
               {(sub.status === 'pending' || sub.status === 'rejected') && (
                 <button
                   onClick={() => onDelete(sub.id)}
                   className="text-[11px] font-black text-red-500 hover:text-red-600 transition-colors flex items-center bg-red-50/50 px-3 py-1.5 rounded-xl border border-red-100/50 w-fit"
                 >
                   DELETE
                 </button>
               )}
             </div>
          </div>

          {sub.status === 'rejected' && sub.rejection_reason && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-[10px] font-bold text-red-600 leading-relaxed">
              <span className="font-black uppercase tracking-widest mr-1">Feedback:</span> {sub.rejection_reason}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-zinc-50">
            <div className="flex items-center gap-2">
               <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
               <span className="text-xs font-black text-zinc-900">{(sub.total_views_earned ?? 0).toLocaleString()}</span>
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">views</span>
            </div>
            <div className="flex items-center gap-2">
               <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
               <span className="text-xs font-black text-zinc-900">{formatMoney(Number(sub.total_earnings) || 0, "RWF")}</span>
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">earned</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
               <Clock className="h-3.5 w-3.5 text-zinc-300" />
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {new Date(sub.created_at).toLocaleDateString()}
               </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSubmissionsPage() {
  const { formatMoney } = useCurrency();
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
       setLoading(true);
       try {
          const params = new URLSearchParams({ limit: '50' });
          if (statusFilter !== 'all') params.set('status', statusFilter);
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
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.from('ugc_submissions').delete().eq('id', id);
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
    approved: submissions.filter(s => s.status === 'approved').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    earned: submissions.reduce((sum, s) => sum + (Number(s.total_earnings) || 0), 0)
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight leading-none">My Submissions</h1>
            <p className="text-zinc-500 font-medium">Track your content performance and earned rewards</p>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Total Submitted', value: stats.total.toLocaleString(), icon: Video, color: 'text-blue-500' },
           { label: 'Approved Content',  value: stats.approved.toLocaleString(), icon: CheckCircle, color: 'text-emerald-500' },
           { label: 'Pending Review',   value: stats.pending.toLocaleString(), icon: Clock, color: 'text-amber-500' },
           { label: 'Total Earned', value: formatMoney(stats.earned, "RWF"), icon: DollarSign, color: 'text-zinc-900' },
         ].map((s, i) => (
           <div key={i} className="p-6 rounded-[32px] bg-white border border-zinc-100 shadow-sm flex flex-col justify-center gap-1 group hover:border-orange-100 transition-all">
              <div className="flex items-center justify-between w-full mb-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s.label}</span>
                 <s.icon className={cn("h-4 w-4 opacity-40", s.color)} />
              </div>
              <p className="text-2xl font-black text-zinc-900 whitespace-nowrap">{s.value}</p>
           </div>
         ))}
      </div>

      {/* Filters Hub */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-2">
         <div className="flex items-center gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
               <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                     "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0",
                     statusFilter === f
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-xl shadow-zinc-900/10'
                        : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300 hover:text-zinc-700'
                  )}
               >
                  {f}
               </button>
            ))}
         </div>
         <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-400">
            <Filter className="h-4 w-4" />
         </div>
      </div>

      {/* Main Activity Feed */}
      {loading ? (
         <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="h-32 rounded-[32px] bg-white border border-zinc-50 animate-pulse shadow-sm" />
            ))}
         </div>
      ) : submissions.length === 0 ? (
         <div className="p-24 text-center space-y-6 bg-white border border-dashed border-zinc-200 rounded-[48px]">
            <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
               <Video className="h-10 w-10 text-zinc-300" />
            </div>
            <div>
               <p className="text-xl font-black text-zinc-900">No submissions found</p>
               <p className="text-sm font-medium text-zinc-500 max-w-xs mx-auto">Get started by browsing active campaigns and creating your first piece of content.</p>
            </div>
            <Button asChild className="h-14 px-10 rounded-2xl bg-zinc-950 font-black text-sm uppercase tracking-widest shadow-2xl">
               <a href="/ugc">Browse Campaigns →</a>
            </Button>
         </div>
      ) : (
         <div className="space-y-4">
            {submissions.map((sub) => <SubmissionCard key={sub.id} sub={sub} onDelete={handleDelete} />)}
         </div>
      )}
    </div>
  );
}
