'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign } from '@/types/ugc';
import { 
  ArrowLeft, CheckCircle, Globe, 
  Calendar, Info, Play, MessageSquare, 
  TrendingUp, DollarSign, Camera, 
  ChevronRight, Sparkles, ClipboardCheck,
  Users, Music, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const PLATFORM_ICONS: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  tiktok:    { icon: Play,      label: 'TikTok',      color: 'text-zinc-600', bg: 'bg-zinc-50'  },
  instagram: { icon: Camera,    label: 'Instagram',   color: 'text-orange-500', bg: 'bg-orange-50' },
  youtube:   { icon: Play,      label: 'YouTube',     color: 'text-red-500', bg: 'bg-red-50'   },
  x:         { icon: MessageSquare, label: 'X',       color: 'text-zinc-900', bg: 'bg-zinc-100' },
};

export default function CampaignDetailPage() {
  const { formatMoney } = useCurrency();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
       try {
          const [cRes, pRes] = await Promise.all([
             fetch(`/api/ugc/campaigns/${id}`),
             fetch(`/api/ugc/campaigns/${id}/participant`)
          ]);
          if (cRes.ok) setCampaign((await cRes.json()).campaign);
          if (pRes.ok) {
             const { status } = await pRes.json();
             if (status === 'accepted') setIsJoined(true);
          }
       } catch (err) {
          console.error(err);
       } finally {
          setLoading(false);
       }
    }
    init();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-zinc-500 font-black">
        Campaign not found
      </div>
    );
  }

  const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
  const banner = campaign.media?.find(m => m.usage === 'banner')?.url;

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      {/* ── IMMERSIVE HERO ── */}
      <div className="relative w-full h-[400px] overflow-hidden bg-zinc-900">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          {banner ? (
            <Image 
              src={banner} 
              alt={campaign.title} 
              fill 
              className="object-cover opacity-60 saturate-[0.8] brightness-[0.7]"
              priority
            />
          ) : (
            <Image 
              src="/hero-bg.png" 
              alt="" 
              fill 
              className="object-cover opacity-40 saturate-[0.5]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-50 via-zinc-50/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-end pb-12 gap-6">
           <Link href="/ugc" className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 font-black text-sm transition-all w-fit mb-4">
             <div className="h-8 w-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-50 shadow-sm">
                <ArrowLeft className="h-4 w-4" />
             </div>
             Back to Campaigns
           </Link>

           <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
                    {campaign.vendor?.business_logo ? (
                      <img src={campaign.vendor.business_logo} className="relative w-24 h-24 rounded-[32px] border-4 border-white object-cover shadow-2xl" alt="" />
                    ) : (
                      <div className="relative w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                        {campaign.vendor?.business_name?.[0] ?? 'B'}
                      </div>
                    )}
                </div>
                
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                         {campaign.status}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-widest border border-zinc-200">
                         {campaign.campaign_type}
                      </span>
                   </div>
                   <h1 className="text-4xl md:text-5xl font-black text-zinc-900 leading-none tracking-tight">
                     {campaign.title}
                   </h1>
                   <p className="text-zinc-500 font-bold flex items-center gap-1.5 uppercase tracking-widest text-xs">
                     By <span className="text-zinc-900 border-b-2 border-orange-500/30 pb-0.5">{campaign.vendor?.business_name}</span>
                     <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-500" />
                   </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <button className="h-14 w-14 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
                    <Sparkles className="h-6 w-6 text-orange-500" />
                 </button>
                 <Button asChild size="lg" className="h-14 px-10 rounded-2xl bg-zinc-950 hover:bg-black text-white text-base font-black shadow-2xl shadow-zinc-950/20 transition-all">
                    <Link href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}>
                       {isJoined ? "Go to Dashboard →" : "Join Campaign →"}
                    </Link>
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* ── CONTENT GRID ── */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
        {/* Left: Details */}
        <div className="lg:col-span-8 space-y-10">
           {/* Section: Overview */}
           <section className="space-y-4">
              <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <Info className="h-5 w-5 text-zinc-400" /> Campaign Overview
              </h2>
              <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm leading-relaxed text-zinc-600 font-medium whitespace-pre-line">
                {campaign.description}
              </div>
           </section>

           {/* Section: Guidelines (Structured with Legacy Fallback) */}
           {(campaign.min_duration || campaign.max_duration || (campaign.required_hashtags?.length ?? 0) > 0 || (campaign.required_mentions?.length ?? 0) > 0 || (campaign.required_keywords?.length ?? 0) > 0 || campaign.content_guidelines) && (
             <section className="space-y-4">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-zinc-400" /> Content Requirements
                </h2>
                <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm space-y-8">
                  {/* Durations */}
                  {(campaign.min_duration || campaign.max_duration) && (
                     <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Required Duration</p>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 w-fit min-w-[200px]">
                           <Calendar className="h-4 w-4 text-orange-500" />
                           <span className="text-sm font-black text-zinc-900">
                             {campaign.min_duration ?? 0}s — {campaign.max_duration ?? '∞'}s
                           </span>
                        </div>
                     </div>
                  )}

                  {/* Structured: Custom Mission Types */}
                  {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Required Audio</p>
                           <a href={campaign.music_track_url} target="_blank" className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-100 hover:border-orange-300 transition-all group">
                              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                 <Music className="h-4 w-4 text-orange-500" />
                              </div>
                              <div className="overflow-hidden">
                                 <p className="text-sm font-black text-zinc-900 truncate">Listen to Track</p>
                                 <p className="text-xs font-bold text-orange-600 truncate">{campaign.music_artist_name || 'Original Audio'}</p>
                              </div>
                           </a>
                        </div>
                     </div>
                  )}

                  {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Promotion Target</p>
                           <a href={campaign.promotion_target_url || '#'} target="_blank" className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100 hover:border-blue-300 transition-all group">
                              <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                 <Target className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="overflow-hidden">
                                 <p className="text-sm font-black text-zinc-900 truncate">{campaign.promotion_target}</p>
                                 <p className="text-xs font-bold text-blue-600 truncate">View Target Link</p>
                              </div>
                           </a>
                        </div>
                     </div>
                  )}

                  {/* Structured: Hashtags & Mentions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {(campaign.required_hashtags?.length ?? 0) > 0 && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Required Hashtags</p>
                           <div className="flex flex-wrap gap-2">
                              {campaign.required_hashtags.map((tag, i) => (
                                 <span key={i} className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 text-xs font-black">
                                   #{tag.replace(/^#/, '')}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}
                     {(campaign.required_mentions?.length ?? 0) > 0 && (
                        <div className="space-y-3">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Required Mentions</p>
                           <div className="flex flex-wrap gap-2">
                              {campaign.required_mentions.map((m, i) => (
                                 <span key={i} className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-black">
                                   @{m.replace(/^@/, '')}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Structured: Keywords */}
                  {(campaign.required_keywords?.length ?? 0) > 0 && (
                     <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Mandatory Keywords</p>
                        <div className="flex flex-wrap gap-2">
                           {campaign.required_keywords.map((k, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs font-bold text-zinc-600">
                                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                 {k}
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* LEGACY FALLBACK: Guidelines Text */}
                  {campaign.content_guidelines && (
                    <div className="space-y-4 pt-4 border-t border-zinc-50">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 px-1">Specific Guidelines</p>
                       <div className="leading-relaxed text-zinc-600 font-medium whitespace-pre-line text-sm">
                          {campaign.content_guidelines}
                       </div>
                    </div>
                  )}
                </div>
             </section>
           )}

           {/* Section: Examples */}
           {campaign.media && campaign.media.filter(m => m.usage === 'example').length > 0 && (
             <section className="space-y-4">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Play className="h-5 w-5 text-zinc-400" /> Reference Content
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaign.media.filter(m => m.usage === 'example').map((m, i) => (
                    <a key={i} href={m.url} target="_blank" className="group relative aspect-[16/9] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-100 shadow-lg">
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60" />
                       <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Play className="h-6 w-6 text-white fill-white" />
                          </div>
                       </div>
                       <div className="absolute bottom-4 left-4 right-4 z-20 text-white text-[10px] font-black uppercase tracking-widest opacity-80 decoration-white underline truncate">
                          {m.url}
                       </div>
                    </a>
                  ))}
                </div>
             </section>
           )}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           {/* Payout Card */}
           <div className="p-8 rounded-[40px] bg-zinc-950 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full" />
              {campaign.payment_model === 'fixed_per_content' ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Fixed Reward</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black">{formatMoney(campaign.fixed_rate ?? 0, "USD")}</span>
                    <span className="text-sm font-bold text-zinc-500"> / Submission</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Earn per 1K views</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-black">{formatMoney(campaign.rate_per_1k_views, "USD")}</span>
                    <span className="text-sm font-bold text-zinc-500"> / 1K</span>
                  </div>
                </>
              )}
              {campaign.max_payout_per_sub && (
                <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-white/5 border border-white/10 mt-4 mb-8">
                   <div className="h-2 w-2 rounded-full bg-orange-500" />
                   <p className="text-[11px] font-black text-zinc-300">Max {formatMoney(campaign.max_payout_per_sub, "USD")} / submission</p>
                </div>
              )}
              
              {campaign.status === 'active' ? (
                <Button asChild size="lg" className="w-full h-14 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-100 font-black text-base shadow-xl active:scale-95 transition-all">
                  <Link href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}>
                    {isJoined ? "Go to Dashboard →" : "Join Campaign →"}
                  </Link>
                </Button>
              ) : (
                <div className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/10 text-zinc-500 font-black text-sm uppercase tracking-widest">
                  Campaign {campaign.status}
                </div>
              )}
           </div>

           {/* Stats Grid */}
           <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm space-y-8">
              <div className="space-y-3">
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Budget used</span>
                    <span className="text-[11px] font-black text-zinc-900">{formatMoney(campaign.spent_budget || 0, "USD")} / {formatMoney(campaign.total_budget, "USD")}</span>
                 </div>
                 <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000" 
                      style={{ width: `${budgetPct}%` }}
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-100 text-center space-y-1">
                    <p className="text-2xl font-black text-zinc-900 leading-none">{campaign.submission_count ?? 0}</p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Submissions</p>
                 </div>
                 <div className="p-4 rounded-3xl bg-zinc-50 border border-zinc-100 text-center space-y-1">
                    <p className="text-2xl font-black text-zinc-900 leading-none">{campaign.approved_count ?? 0}</p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Approved</p>
                 </div>
              </div>
           </div>

           {/* Platforms */}
           <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Allowed Platforms</p>
              <div className="space-y-2">
                 {(campaign.allowed_platforms ?? []).map((p) => {
                    const cfg = PLATFORM_ICONS[p] || { icon: Globe, label: p, color: 'text-zinc-600', bg: 'bg-zinc-50' };
                    return (
                      <div key={p} className={cn("flex items-center justify-between p-3 px-4 rounded-2xl border border-zinc-100 transition-all", cfg.bg)}>
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-white border border-zinc-200/50 flex items-center justify-center">
                               <cfg.icon className={cn("h-4 w-4", cfg.color)} />
                            </div>
                            <span className="text-sm font-black text-zinc-700">{cfg.label}</span>
                         </div>
                         <CheckCircle className="h-4 w-4 text-emerald-500 opacity-20" />
                      </div>
                    );
                 })}
              </div>
              {campaign.requires_face && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 mt-4">
                   <div className="h-8 w-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-amber-500" />
                   </div>
                   <p className="text-[11px] font-black text-amber-700 leading-tight tracking-tight uppercase">Face required in content</p>
                </div>
              )}
           </div>

           {/* Timeline */}
           {(campaign.starts_at || campaign.ends_at) && (
              <div className="p-8 rounded-[40px] bg-white border border-zinc-100 shadow-sm space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Campaign Timeline</p>
                 {campaign.starts_at && (
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-zinc-400 uppercase">Starts</span>
                       <span className="text-sm font-black text-zinc-900">{new Date(campaign.starts_at).toLocaleDateString()}</span>
                    </div>
                 )}
                 {campaign.ends_at && (
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-zinc-400 uppercase">Ends</span>
                       <span className="text-sm font-black text-zinc-900 tracking-tight">{new Date(campaign.ends_at).toLocaleDateString()}</span>
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
