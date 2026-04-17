'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign } from '@/types/ugc';
import {
   ArrowLeft, CheckCircle, Globe,
   Calendar, Info, Play, MessageSquare,
   TrendingUp, DollarSign, Camera,
   ChevronRight, Sparkles, ClipboardCheck,
   Users, Music, Target, Zap, Shield,
   ArrowUpRight, Share2, Instagram, Youtube,
   X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const PLATFORM_META: Record<string, { icon: any; label: string }> = {
   tiktok: { icon: Play, label: 'TikTok' },
   instagram: { icon: Instagram, label: 'Instagram' },
   youtube: { icon: Youtube, label: 'YouTube' },
   x: { icon: MessageSquare, label: 'X' },
};

/* ── tiny reusable section header ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
   return (
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 text-stone-500 dark:text-text-muted">
         {children}
      </p>
   );
}

/* ── light card wrapper ── */
function LightCard({
   children,
   className,
}: {
   children: React.ReactNode;
   className?: string;
}) {
   return (
      <div className={cn('rounded-2xl p-6 bg-surface dark:bg-surface border border-border shadow-sm', className)}>
         {children}
      </div>
   );
}

export default function CampaignDetailPage() {
   const { formatMoney } = useCurrency();
   const { id } = useParams<{ id: string }>();
   const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
   const [isJoined, setIsJoined] = useState(false);
   const [loading, setLoading] = useState(true);
   const [activeVideo, setActiveVideo] = useState<string | null>(null);

   useEffect(() => {
      async function init() {
         try {
            const [cRes, pRes] = await Promise.all([
               fetch(`/api/ugc/campaigns/${id}`),
               fetch(`/api/ugc/campaigns/${id}/participant`),
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

   /* ── Loading ── */
   if (loading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface">
            <div className="w-10 h-10 rounded-full border-2 border-t-orange-500 border-orange-500/20 animate-spin" />
         </div>
      );
   }

   /* ── Not found ── */
   if (!campaign) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface dark:bg-surface">
            <p className="text-stone-900 dark:text-white font-black text-xl">Campaign not found</p>
            <Link href="/ugc" className="text-sm font-bold text-orange-500 hover:text-orange-600">
               ← Back to campaigns
            </Link>
         </div>
      );
   }

   const budgetPct = Math.min(
      100,
      ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100
   );
   const banner = campaign.media?.find((m) => m.usage === 'banner')?.url;
   const examples = campaign.media?.filter((m) => m.usage === 'example') ?? [];
   const isUGC = campaign.campaign_type === 'ugc';

   /* ── Helpers ── */
   function getEmbedUrl(url: string) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
         const id = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
         return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (url.includes('instagram.com')) {
         return `${url.split('?')[0]}embed`;
      }
      return url;
   }

   return (
      <div className="min-h-screen pb-28 bg-surface dark:bg-surface">

         {/* ══════════════════════════════════
          HERO BANNER
      ══════════════════════════════════ */}
         <div className="relative w-full overflow-hidden h-[380px] bg-surface dark:bg-surface">
            {/* bg */}
            <div className="absolute inset-0 bg-surface dark:bg-surface" />
            {banner && (
               <Image
                  src={banner}
                  alt={campaign.title}
                  fill
                  className="object-cover opacity-15"
                  priority
               />
            )}
            {/* Vignettes */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent dark:from-zinc-900 dark:via-zinc-900/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface dark:from-zinc-900 via-transparent to-transparent" />

            {/* Orange glow spot behind logo */}
            <div className="absolute w-[260px] h-[260px] rounded-full bg-orange-500/20 blur-[30px] -bottom-10 left-16" />

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-between py-6">
               {/* Back nav */}
               <Link
                  href="/ugc"
                  className="flex items-center gap-2 w-fit text-sm font-bold transition-opacity hover:opacity-70 text-stone-500 dark:text-text-muted"
               >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface dark:bg-surface border border-border shadow-sm">
                     <ArrowLeft className="h-3.5 w-3.5 text-stone-900 dark:text-white" />
                  </div>
                  Back to Campaigns
               </Link>

               {/* Hero bottom row */}
               <div className="flex flex-col md:flex-row items-end justify-between gap-6">
                  <div className="flex items-end gap-5">
                     {/* Logo */}
                     <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-orange-500/20 blur-[18px] scale-110" />
                        {campaign.vendor?.business_logo ? (
                           <img
                              src={campaign.vendor.business_logo}
                              className="relative w-20 h-20 rounded-2xl object-cover border-2 border-surface dark:border-zinc-900 shadow-xl"
                              alt=""
                           />
                        ) : (
                           <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl shadow-orange-500/20">
                              {campaign.vendor?.business_name?.[0] ?? 'B'}
                           </div>
                        )}
                     </div>

                     {/* Title block */}
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {campaign.status}
                           </span>
                           <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", isUGC ? "bg-orange-500/10 border border-orange-500/20 text-orange-600" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-500")}>
                              <Zap className="h-2.5 w-2.5" />
                              {campaign.campaign_type}
                           </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-stone-900 dark:text-white leading-none tracking-tighter">
                           {campaign.title}
                        </h1>

                        <p className="text-xs font-semibold flex items-center gap-1.5 text-stone-500 dark:text-text-muted">
                           by{' '}
                           <span className="text-stone-700 dark:text-stone-300">
                              {campaign.vendor?.business_name}
                           </span>
                           <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-500" />
                        </p>
                     </div>
                  </div>

                  {/* CTA buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                     <button className="w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-surface dark:bg-surface border border-border text-stone-500 shadow-sm hover:text-orange-500 hover:bg-stone-50 dark:hover:bg-zinc-800">
                        <Share2 className="h-4 w-4" />
                     </button>
                     <Link
                        href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black text-white transition-all hover:brightness-110 active:scale-95 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30"
                     >
                        {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                        <ArrowUpRight className="h-4 w-4" />
                     </Link>
                  </div>
               </div>
            </div>
         </div>

         {/* ══════════════════════════════════
          CONTENT GRID
      ══════════════════════════════════ */}
         <div className="max-w-7xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

            {/* ── LEFT: Main content ── */}
            <div className="space-y-6">

               {/* Overview */}
               <LightCard>
                  <SectionLabel>Campaign Overview</SectionLabel>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-stone-600 dark:text-stone-300">
                     {campaign.description}
                  </p>
               </LightCard>

               {/* Stats strip */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                     {
                        label: 'Payout Rate',
                        value:
                           campaign.payment_model === 'fixed_per_content'
                              ? formatMoney(campaign.fixed_rate ?? 0, 'USD')
                              : formatMoney(campaign.rate_per_1k_views, 'USD'),
                        sub:
                           campaign.payment_model === 'fixed_per_content'
                              ? '/ submission'
                              : '/ 1K views',
                        accent: 'text-orange-500',
                     },
                     {
                        label: 'Total Budget',
                        value: formatMoney(campaign.total_budget, 'USD'),
                        sub: 'campaign cap',
                        accent: 'text-indigo-400',
                     },
                     {
                        label: 'Submissions',
                        value: String(campaign.submission_count ?? 0),
                        sub: 'total joined',
                        accent: 'text-emerald-500',
                     },
                     {
                        label: 'Approved',
                        value: String(campaign.approved_count ?? 0),
                        sub: 'content pieces',
                        accent: 'text-blue-400',
                     },
                  ].map((stat) => (
                     <div
                        key={stat.label}
                        className="rounded-2xl p-4 flex flex-col gap-1 bg-surface dark:bg-surface border border-border shadow-sm"
                     >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 dark:text-text-muted">
                           {stat.label}
                        </p>
                        <p className={cn("text-2xl font-black tracking-tighter", stat.accent)}>
                           {stat.value}
                        </p>
                        <p className="text-[10px] text-stone-400 dark:text-text-muted">
                           {stat.sub}
                        </p>
                     </div>
                  ))}
               </div>

               {/* Budget bar */}
               <LightCard>
                  <div className="flex items-center justify-between mb-3">
                     <SectionLabel>Budget Usage</SectionLabel>
                     <span className="text-xs font-bold text-stone-500 dark:text-text-muted">
                        {formatMoney(campaign.spent_budget ?? 0, 'USD')} /{' '}
                        {formatMoney(campaign.total_budget, 'USD')}
                     </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden bg-stone-100 dark:bg-surface-secondary">
                     <div
                        className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-orange-500 to-orange-400"
                        style={{ width: `${budgetPct}%` }}
                     />
                  </div>
                  <p className="text-[10px] font-bold mt-2 text-stone-400 dark:text-text-muted">
                     {Math.round(budgetPct)}% of budget allocated
                  </p>
               </LightCard>

               {/* Content Requirements */}
               {(campaign.min_duration ||
                  campaign.max_duration ||
                  (campaign.required_hashtags?.length ?? 0) > 0 ||
                  (campaign.required_mentions?.length ?? 0) > 0 ||
                  (campaign.required_keywords?.length ?? 0) > 0 ||
                  campaign.content_guidelines) && (
                     <LightCard>
                        <SectionLabel>Content Requirements</SectionLabel>
                        <div className="space-y-6">

                           {/* Duration */}
                           {(campaign.min_duration || campaign.max_duration) && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                    Duration
                                 </p>
                                 <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-stone-900 dark:text-white bg-surface dark:bg-surface border border-border">
                                    <Calendar className="h-4 w-4 text-orange-500" />
                                    {campaign.min_duration ?? 0}s — {campaign.max_duration ?? '∞'}s
                                 </div>
                              </div>
                           )}

                           {/* Music track */}
                           {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                    Required Audio
                                 </p>
                                 <a
                                    href={campaign.music_track_url}
                                    target="_blank"
                                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-orange-500/10 bg-orange-500/5 border border-orange-500/20"
                                 >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface dark:bg-surface border border-orange-500/20">
                                       <Music className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-stone-900 dark:text-white">Listen to Track</p>
                                       <p className="text-xs font-bold text-orange-500">
                                          {campaign.music_artist_name || 'Original Audio'}
                                       </p>
                                    </div>
                                 </a>
                              </div>
                           )}

                           {/* Promotion target */}
                           {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                    Promotion Target
                                 </p>
                                 <a
                                    href={campaign.promotion_target_url || '#'}
                                    target="_blank"
                                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:brightness-125 bg-indigo-500/10 border border-indigo-500/20"
                                 >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500/20">
                                       <Target className="h-4 w-4 text-indigo-400" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-stone-900 dark:text-white">{campaign.promotion_target}</p>
                                       <p className="text-xs text-indigo-400">View Target Link</p>
                                    </div>
                                 </a>
                              </div>
                           )}

                           {/* Hashtags & mentions grid */}
                           {((campaign.required_hashtags?.length ?? 0) > 0 ||
                              (campaign.required_mentions?.length ?? 0) > 0) && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(campaign.required_hashtags?.length ?? 0) > 0 && (
                                       <div>
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                             Hashtags
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                             {campaign.required_hashtags.map((tag, i) => (
                                                <span
                                                   key={i}
                                                   className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 border border-orange-500/20 text-orange-600"
                                                >
                                                   #{tag.replace(/^#/, '')}
                                                </span>
                                             ))}
                                          </div>
                                       </div>
                                    )}
                                    {(campaign.required_mentions?.length ?? 0) > 0 && (
                                       <div>
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                             Mentions
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                             {campaign.required_mentions.map((m, i) => (
                                                <span
                                                   key={i}
                                                   className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-900 dark:text-white bg-surface dark:bg-surface border border-border"
                                                >
                                                   @{m.replace(/^@/, '')}
                                                </span>
                                             ))}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              )}

                           {/* Keywords */}
                           {(campaign.required_keywords?.length ?? 0) > 0 && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                    Keywords
                                 </p>
                                 <div className="flex flex-wrap gap-2">
                                    {campaign.required_keywords.map((k, i) => (
                                       <div
                                          key={i}
                                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
                                       >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          {k}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Legacy text guidelines */}
                           {campaign.content_guidelines && (
                              <div className="pt-4 mt-2 border-t border-border">
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-stone-500 dark:text-text-muted">
                                    Specific Guidelines
                                 </p>
                                 <p className="text-sm leading-relaxed whitespace-pre-line font-medium text-stone-600 dark:text-stone-300">
                                    {campaign.content_guidelines}
                                 </p>
                              </div>
                           )}
                        </div>
                     </LightCard>
                  )}

               {/* Reference content examples */}
               {examples.length > 0 && (
                  <div>
                     <SectionLabel>Reference Content</SectionLabel>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {examples.map((m, i) => (
                           <button
                              key={i}
                              onClick={() => setActiveVideo(m.url)}
                              className="group relative overflow-hidden rounded-2xl w-full text-left bg-surface dark:bg-surface border border-border"
                              style={{ aspectRatio: '16/9' }}
                           >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10" />
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg bg-white/90 dark:bg-surface/90 backdrop-blur-md">
                                    <Play className="h-5 w-5 text-stone-900 dark:text-white fill-stone-900 dark:fill-white" />
                                 </div>
                              </div>
                              <div className="absolute bottom-3 left-3 right-3 z-20 text-[10px] font-bold truncate text-stone-200 dark:text-stone-300">
                                 {m.url}
                              </div>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* ── RIGHT: Sidebar ── */}
            <div className="space-y-4">

               {/* Payout card */}
               <div className="rounded-2xl p-6 relative overflow-hidden bg-surface dark:bg-surface border border-orange-500/20 shadow-sm">
                  {/* Glow */}
                  <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none rounded-full bg-orange-500/10 blur-[20px]" />
                  <div className="relative z-10">
                     <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-stone-500 dark:text-text-muted">
                        {campaign.payment_model === 'fixed_per_content'
                           ? 'Fixed Reward'
                           : 'Earn per 1K views'}
                     </p>
                     <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-black text-orange-500 tracking-tighter">
                           {campaign.payment_model === 'fixed_per_content'
                              ? formatMoney(campaign.fixed_rate ?? 0, 'USD')
                              : formatMoney(campaign.rate_per_1k_views, 'USD')}
                        </span>
                        <span className="text-sm font-medium text-stone-500 dark:text-text-muted">
                           {campaign.payment_model === 'fixed_per_content'
                              ? '/ submission'
                              : '/ 1K views'}
                        </span>
                     </div>

                     {campaign.max_payout_per_sub && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-3 mb-5 bg-surface dark:bg-surface-secondary border border-border">
                           <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-500" />
                           <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                              Max {formatMoney(campaign.max_payout_per_sub, 'USD')} / submission
                           </p>
                        </div>
                     )}

                     {campaign.status === 'active' ? (
                        <Link
                           href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                           className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-black text-white transition-all hover:brightness-110 active:scale-95 mt-4 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30"
                        >
                           {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                           <ArrowUpRight className="h-4 w-4" />
                        </Link>
                     ) : (
                        <div className="w-full py-3.5 mt-4 text-center rounded-xl text-sm font-black uppercase tracking-widest bg-stone-100 dark:bg-surface-secondary border border-border text-stone-500 dark:text-text-muted">
                           Campaign {campaign.status}
                        </div>
                     )}
                  </div>
               </div>

               {/* Platforms */}
               <LightCard>
                  <SectionLabel>Allowed Platforms</SectionLabel>
                  <div className="space-y-2">
                     {(campaign.allowed_platforms ?? []).map((p) => {
                        const meta = PLATFORM_META[p] || { icon: Globe, label: p };
                        return (
                           <div
                              key={p}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/50 bg-surface dark:bg-surface border border-border"
                           >
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface dark:bg-surface border border-border">
                                    <meta.icon className="h-4 w-4 text-stone-500 dark:text-text-muted" />
                                 </div>
                                 <span className="text-sm font-bold text-stone-900 dark:text-white">{meta.label}</span>
                              </div>
                              <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                           </div>
                        );
                     })}
                  </div>

                  {campaign.requires_face && (
                     <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-3 bg-amber-500/10 border border-amber-500/20">
                        <Users className="h-4 w-4 flex-shrink-0 text-amber-600" />
                        <p className="text-[11px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-500">
                           Face required in content
                        </p>
                     </div>
                  )}
               </LightCard>

               {/* Timeline */}
               {(campaign.starts_at || campaign.ends_at) && (
                  <LightCard>
                     <SectionLabel>Campaign Timeline</SectionLabel>
                     <div className="space-y-3">
                        {campaign.starts_at && (
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-text-muted">
                                 Starts
                              </span>
                              <span className="text-sm font-black text-stone-900 dark:text-white">
                                 {new Date(campaign.starts_at).toLocaleDateString()}
                              </span>
                           </div>
                        )}
                        {campaign.ends_at && (
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-text-muted">
                                 Ends
                              </span>
                              <span className="text-sm font-black text-stone-900 dark:text-white">
                                 {new Date(campaign.ends_at).toLocaleDateString()}
                              </span>
                           </div>
                        )}
                     </div>
                  </LightCard>
               )}

               {/* Shield note */}
               <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{
                     background: '#ffffff',
                     border: '1px solid rgba(0,0,0,0.05)',
                  }}
               >
                  <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(0,0,0,0.2)' }} />
                  <p className="text-[10px] leading-relaxed font-medium" style={{ color: 'rgba(0,0,0,0.4)' }}>
                     Payments are processed securely through Jimvio escrow. You get paid after
                     content is approved and views are verified.
                  </p>
               </div>
            </div>
         </div>

         {/* ── Video Player Modal ── */}
         <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
            <DialogContent className="max-w-4xl p-1 bg-stone-950 border-stone-800 overflow-hidden">
               <DialogHeader className="sr-only">
                  <DialogTitle>Video Preview</DialogTitle>
               </DialogHeader>
               <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                  {activeVideo && (
                     activeVideo.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                        <video
                           src={activeVideo}
                           controls
                           autoPlay
                           className="w-full h-full"
                        />
                     ) : (
                        <iframe
                           src={getEmbedUrl(activeVideo)}
                           className="w-full h-full border-0"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                           allowFullScreen
                        />
                     )
                  )}
               </div>
            </DialogContent>
         </Dialog>
      </div>
   );
}