'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign, UGCSubmission } from '@/types/ugc';
import { 
  Plus, Play, CheckCircle, Clock, 
  TrendingUp, DollarSign, ArrowLeft, 
  LayoutDashboard, Share2, MoreVertical,
  ExternalLink, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pending:  { label: 'Pending Review', bg: 'bg-amber-50',  text: 'text-amber-600',  icon: Clock },
  approved: { label: 'Approved',       bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle },
  rejected: { label: 'Rejected',       bg: 'bg-red-50',     text: 'text-red-600',     icon: Info },
};

export default function CampaignDashboardPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch(`/api/ugc/campaigns/${id}`),
          fetch(`/api/ugc/submissions?campaignId=${id}`)
        ]);
        if (cRes.ok) setCampaign((await cRes.json()).campaign);
        if (sRes.ok) setSubmissions((await sRes.json()).data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
       <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!campaign) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-black text-zinc-500">
       Campaign not found
    </div>
  );

  const stats = {
    totalViews: submissions.reduce((acc, s) => acc + (s.total_views_earned || 0), 0),
    totalEarnings: submissions.reduce((acc, s) => acc + (Number(s.total_earnings) || 0), 0),
    approvedCount: submissions.filter(s => s.status === 'approved').length,
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      {/* ── IMMERSIVE TOP BAR ── */}
      <div className="bg-zinc-950 text-white pt-10 pb-20 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full" />
         <div className="max-w-7xl mx-auto px-6 space-y-8 relative z-10">
            <div className="flex items-center justify-between">
               <Link href="/ugc" className="flex items-center gap-2 text-white/50 hover:text-white transition-all text-sm font-black uppercase tracking-widest">
                  <ArrowLeft className="h-4 w-4" /> Back to Explore
               </Link>
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Campaign Access
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-10">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-white p-0.5 shadow-2xl shrink-0">
                     <img src={campaign.media?.[0]?.url || "/hero-bg.png"} className="w-full h-full object-cover rounded-[22px]" alt="" />
                  </div>
                  <div className="space-y-1">
                     <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">{campaign.title}</h1>
                     <p className="text-white/40 font-bold flex items-center gap-2 text-xs uppercase tracking-widest leading-none mt-2">
                        Dashboard <span className="opacity-30">/</span> {campaign.vendor?.business_name} <CheckCircle className="h-3 w-3 text-blue-400 fill-blue-400" />
                     </p>
                  </div>
               </div>

               <div className="flex items-center gap-4 w-full md:w-auto">
                  <Button asChild size="lg" className="flex-1 md:flex-none h-16 px-10 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-100 font-black text-base shadow-2xl active:scale-95 transition-all">
                     <Link href={`/ugc/${id}/submit`}>
                        <Plus className="h-5 w-5 mr-1" /> Submit Content
                     </Link>
                  </Button>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 space-y-8">
         {/* ── STATS GRID ── */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
               { label: 'Total Earnings', val: formatMoney(stats.totalEarnings, "RWF"), icon: DollarSign, color: 'text-emerald-500' },
               { label: 'Views Tracked', val: stats.totalViews.toLocaleString(), icon: TrendingUp, color: 'text-orange-500' },
               { label: 'Submissions', val: submissions.length, icon: Share2, color: 'text-blue-500' },
               { label: 'Approved', val: stats.approvedCount, icon: CheckCircle, color: 'text-zinc-900' },
            ].map((s, i) => (
               <div key={i} className="p-6 rounded-[32px] bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50 flex flex-col justify-center gap-1 group hover:border-orange-100 transition-all">
                  <div className="flex items-center justify-between w-full mb-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s.label}</span>
                     <s.icon className={cn("h-4 w-4 opacity-40", s.color)} />
                  </div>
                  <p className="text-2xl font-black text-zinc-900 whitespace-nowrap">{s.val}</p>
               </div>
            ))}
         </div>

         {/* ── MAIN CONTENT ── */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Submissions List */}
            <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                     <LayoutDashboard className="h-5 w-5 text-zinc-400" /> Your Activity
                  </h2>
               </div>

               {submissions.length === 0 ? (
                  <div className="p-20 text-center bg-white border border-dashed border-zinc-200 rounded-[40px] space-y-4">
                     <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                        <Share2 className="h-8 w-8 text-zinc-300" />
                     </div>
                     <div>
                        <p className="text-lg font-black text-zinc-900">No submissions yet</p>
                        <p className="text-sm font-medium text-zinc-500 max-w-xs mx-auto">Create and post your first piece of content to start earning!</p>
                     </div>
                     <Button asChild variant="outline" className="h-12 rounded-2xl border-zinc-100 px-8 font-black">
                        <Link href={`/ugc/${id}/submit`}>Submit Now →</Link>
                     </Button>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {submissions.map((s) => {
                        const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                        return (
                           <div key={s.id} className="p-4 rounded-[32px] bg-white border border-zinc-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden">
                              <div className="flex items-center gap-5">
                                 {/* Media Thumbnail or Placeholder */}
                                 <div className="w-20 h-28 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 relative overflow-hidden">
                                     {s.media?.[0]?.url ? (
                                        <img src={s.media[0].url} className="w-full h-full object-cover" alt="" />
                                     ) : (
                                        <Play className="h-6 w-6 text-zinc-300" />
                                     )}
                                     <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                 </div>
                                 
                                 <div className="flex-1 space-y-2 py-1">
                                    <div className="flex items-center justify-between">
                                       <div className={cn("px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest", cfg.bg, cfg.text)}>
                                          <cfg.icon className="h-3 w-3" />
                                          {cfg.label}
                                       </div>
                                       <button className="h-8 w-8 rounded-full hover:bg-zinc-50 flex items-center justify-center transition-colors">
                                          <MoreVertical className="h-4 w-4 text-zinc-400" />
                                       </button>
                                    </div>
                                    
                                    <div className="space-y-0.5">
                                       <a href={s.post_url} target="_blank" className="text-sm font-black text-zinc-900 hover:text-orange-500 transition-all flex items-center gap-1.5">
                                          {s.platform.toUpperCase()} POST <ExternalLink className="h-3 w-3" />
                                       </a>
                                       <p className="text-[11px] font-medium text-zinc-400 leading-none">Submitted {new Date(s.created_at).toLocaleDateString()}</p>
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                       <div className="flex items-center gap-1.5">
                                          <TrendingUp className="h-3 w-3 text-orange-500" />
                                          <span className="text-xs font-black text-zinc-900">{s.total_views_earned?.toLocaleString() ?? 0}</span>
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">views</span>
                                       </div>
                                       <div className="flex items-center gap-1.5">
                                          <DollarSign className="h-3 w-3 text-emerald-500" />
                                          <span className="text-xs font-black text-zinc-900">{formatMoney(Number(s.total_earnings) || 0, "RWF")}</span>
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">earned</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* Campaign Sidebar Info */}
            <div className="lg:col-span-4 space-y-6">
               <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm space-y-8">
                  <div className="space-y-4">
                     <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" /> Quick Snapshot
                     </h3>
                     <div className="p-5 rounded-3xl bg-zinc-50 border border-zinc-100 flex flex-col justify-center gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Your Current Tier</span>
                        <p className="text-xl font-black text-zinc-900 leading-tight">Master Creator</p>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Campaign Goal Reach</span>
                        <span className="text-[10px] font-black text-zinc-900">
                           {Math.round(((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100)}%
                        </span>
                     </div>
                     <div className="h-2 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                        <div 
                           className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000"
                           style={{ width: `${Math.min(100, (campaign.spent_budget ?? 0) / (campaign.total_budget || 1) * 100)}%` }}
                        />
                     </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 flex flex-col gap-3">
                     <Button asChild variant="outline" className="h-12 rounded-2xl border-zinc-100 font-black text-xs uppercase tracking-widest hover:bg-zinc-50">
                        <Link href={`/ugc/${id}`}>View Campaign Details</Link>
                     </Button>
                     <Button asChild variant="ghost" className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-600">
                        <Link href="/help">Contact Support</Link>
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
