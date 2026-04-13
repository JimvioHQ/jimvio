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
      <p
         className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
         style={{ color: 'rgba(0,0,0,0.35)' }}
      >
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
      <div
         className={cn('rounded-2xl p-6', className)}
         style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
         }}
      >
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
         <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f7f5' }}>
            <div
               className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#f97316' }}
            />
         </div>
      );
   }

   /* ── Not found ── */
   if (!campaign) {
      return (
         <div
            className="min-h-screen flex flex-col items-center justify-center gap-4"
            style={{ background: '#f8f7f5' }}
         >
            <p className="text-stone-900 font-black text-xl">Campaign not found</p>
            <Link href="/ugc" className="text-sm font-bold" style={{ color: '#f97316' }}>
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
      <div className="min-h-screen pb-28" style={{ background: '#f8f7f5' }}>

         {/* ══════════════════════════════════
          HERO BANNER
      ══════════════════════════════════ */}
         <div className="relative w-full overflow-hidden" style={{ height: 380 }}>
            {/* bg */}
            <div
               className="absolute inset-0"
               style={{ background: '#ffffff' }}
            />
            {banner && (
               <Image
                  src={banner}
                  alt={campaign.title}
                  fill
                  className="object-cover"
                  style={{ opacity: 0.15 }}
                  priority
               />
            )}
            {/* Vignettes */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#f8f7f5] via-[#f8f7f5]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent" />

            {/* Orange glow spot behind logo */}
            <div
               className="absolute"
               style={{
                  width: 260,
                  height: 260,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle,rgba(249,115,22,0.18),transparent 70%)',
                  bottom: -40,
                  left: 60,
                  filter: 'blur(30px)',
               }}
            />

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-between py-6">
               {/* Back nav */}
               <Link
                  href="/ugc"
                  className="flex items-center gap-2 w-fit text-sm font-bold transition-opacity hover:opacity-70"
                  style={{ color: 'rgba(0,0,0,0.45)' }}
               >
                  <div
                     className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                     }}
                  >
                     <ArrowLeft className="h-3.5 w-3.5 text-stone-900" />
                  </div>
                  Back to Campaigns
               </Link>

               {/* Hero bottom row */}
               <div className="flex flex-col md:flex-row items-end justify-between gap-6">
                  <div className="flex items-end gap-5">
                     {/* Logo */}
                     <div className="relative flex-shrink-0">
                        <div
                           className="absolute inset-0 rounded-2xl"
                           style={{
                              background: 'rgba(249,115,22,0.25)',
                              filter: 'blur(18px)',
                              transform: 'scale(1.2)',
                           }}
                        />
                        {campaign.vendor?.business_logo ? (
                           <img
                              src={campaign.vendor.business_logo}
                              className="relative w-20 h-20 rounded-2xl object-cover"
                              style={{ border: '2px solid #fff', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                              alt=""
                           />
                        ) : (
                           <div
                              className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 10px 30px rgba(249,115,22,0.2)' }}
                           >
                              {campaign.vendor?.business_name?.[0] ?? 'B'}
                           </div>
                        )}
                     </div>

                     {/* Title block */}
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                 background: 'rgba(52,211,153,0.1)',
                                 border: '1px solid rgba(52,211,153,0.2)',
                                 color: '#059669',
                              }}
                           >
                              <span
                                 className="w-1.5 h-1.5 rounded-full"
                                 style={{ background: '#10b981' }}
                              />
                              {campaign.status}
                           </span>
                           <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                 background: isUGC
                                    ? 'rgba(249,115,22,0.1)'
                                    : 'rgba(99,102,241,0.1)',
                                 border: isUGC
                                    ? '1px solid rgba(249,115,22,0.2)'
                                    : '1px solid rgba(99,102,241,0.2)',
                                 color: isUGC ? '#ea580c' : '#4f46e5',
                              }}
                           >
                              <Zap className="h-2.5 w-2.5" />
                              {campaign.campaign_type}
                           </span>
                        </div>

                        <h1
                           className="text-3xl md:text-5xl font-black text-stone-900 leading-none"
                           style={{ letterSpacing: '-0.03em' }}
                        >
                           {campaign.title}
                        </h1>

                        <p
                           className="text-xs font-semibold flex items-center gap-1.5"
                           style={{ color: 'rgba(0,0,0,0.45)' }}
                        >
                           by{' '}
                           <span style={{ color: 'rgba(0,0,0,0.7)' }}>
                              {campaign.vendor?.business_name}
                           </span>
                           <CheckCircle className="h-3 w-3" style={{ color: '#3b82f6', fill: '#3b82f6' }} />
                        </p>
                     </div>
                  </div>

                  {/* CTA buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                     <button
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all bg-white border border-stone-200 text-stone-500 hover:text-orange-500 shadow-sm"
                     >
                        <Share2 className="h-4 w-4" />
                     </button>
                     <Link
                        href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black text-white transition-all hover:brightness-110 active:scale-95"
                        style={{
                           background: 'linear-gradient(135deg,#f97316,#ea580c)',
                           boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
                        }}
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
                  <p
                     className="text-sm leading-relaxed whitespace-pre-line"
                     style={{ color: 'rgba(0,0,0,0.6)' }}
                  >
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
                        accent: '#f97316',
                     },
                     {
                        label: 'Total Budget',
                        value: formatMoney(campaign.total_budget, 'USD'),
                        sub: 'campaign cap',
                        accent: '#a78bfa',
                     },
                     {
                        label: 'Submissions',
                        value: String(campaign.submission_count ?? 0),
                        sub: 'total joined',
                        accent: '#34d399',
                     },
                     {
                        label: 'Approved',
                        value: String(campaign.approved_count ?? 0),
                        sub: 'content pieces',
                        accent: '#60a5fa',
                     },
                  ].map((stat) => (
                     <div
                        key={stat.label}
                        className="rounded-2xl p-4 flex flex-col gap-1"
                        style={{
                           background: '#ffffff',
                           border: '1px solid rgba(0,0,0,0.05)',
                           boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        }}
                     >
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.4)' }}>
                           {stat.label}
                        </p>
                        <p className="text-2xl font-black" style={{ color: stat.accent, letterSpacing: '-0.03em' }}>
                           {stat.value}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
                           {stat.sub}
                        </p>
                     </div>
                  ))}
               </div>

               {/* Budget bar */}
               <LightCard>
                  <div className="flex items-center justify-between mb-3">
                     <SectionLabel>Budget Usage</SectionLabel>
                     <span className="text-xs font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>
                        {formatMoney(campaign.spent_budget ?? 0, 'USD')} /{' '}
                        {formatMoney(campaign.total_budget, 'USD')}
                     </span>
                  </div>
                  <div
                     className="h-2 w-full rounded-full overflow-hidden"
                     style={{ background: 'rgba(0,0,0,0.05)' }}
                  >
                     <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                           width: `${budgetPct}%`,
                           background: 'linear-gradient(90deg,#f97316,#fb923c)',
                        }}
                     />
                  </div>
                  <p className="text-[10px] font-bold mt-2" style={{ color: 'rgba(0,0,0,0.3)' }}>
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
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                    Duration
                                 </p>
                                 <div
                                    className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-stone-900"
                                    style={{
                                       background: '#f8f7f5',
                                       border: '1px solid #eeedea',
                                    }}
                                 >
                                    <Calendar className="h-4 w-4" style={{ color: '#ea580c' }} />
                                    {campaign.min_duration ?? 0}s — {campaign.max_duration ?? '∞'}s
                                 </div>
                              </div>
                           )}

                           {/* Music track */}
                           {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                    Required Audio
                                 </p>
                                 <a
                                    href={campaign.music_track_url}
                                    target="_blank"
                                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-orange-50/50"
                                    style={{
                                       background: 'rgba(249,115,22,0.05)',
                                       border: '1px solid rgba(249,115,22,0.1)',
                                    }}
                                 >
                                    <div
                                       className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                       style={{ background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}
                                    >
                                       <Music className="h-4 w-4" style={{ color: '#ea580c' }} />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-stone-900">Listen to Track</p>
                                       <p className="text-xs font-bold" style={{ color: '#ea580c' }}>
                                          {campaign.music_artist_name || 'Original Audio'}
                                       </p>
                                    </div>
                                 </a>
                              </div>
                           )}

                           {/* Promotion target */}
                           {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                    Promotion Target
                                 </p>
                                 <a
                                    href={campaign.promotion_target_url || '#'}
                                    target="_blank"
                                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:brightness-125"
                                    style={{
                                       background: 'rgba(99,102,241,0.08)',
                                       border: '1px solid rgba(99,102,241,0.18)',
                                    }}
                                 >
                                    <div
                                       className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                       style={{ background: 'rgba(99,102,241,0.15)' }}
                                    >
                                       <Target className="h-4 w-4" style={{ color: '#a5b4fc' }} />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-white">{campaign.promotion_target}</p>
                                       <p className="text-xs" style={{ color: '#a5b4fc' }}>View Target Link</p>
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
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                             Hashtags
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                             {campaign.required_hashtags.map((tag, i) => (
                                                <span
                                                   key={i}
                                                   className="px-3 py-1.5 rounded-xl text-xs font-bold"
                                                   style={{
                                                      background: 'rgba(249,115,22,0.06)',
                                                      border: '1px solid rgba(249,115,22,0.15)',
                                                      color: '#ea580c',
                                                   }}
                                                >
                                                   #{tag.replace(/^#/, '')}
                                                </span>
                                             ))}
                                          </div>
                                       </div>
                                    )}
                                    {(campaign.required_mentions?.length ?? 0) > 0 && (
                                       <div>
                                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                             Mentions
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                             {campaign.required_mentions.map((m, i) => (
                                                <span
                                                   key={i}
                                                   className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-900"
                                                   style={{
                                                      background: '#f8f7f5',
                                                      border: '1px solid #eeedea',
                                                   }}
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
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                    Keywords
                                 </p>
                                 <div className="flex flex-wrap gap-2">
                                    {campaign.required_keywords.map((k, i) => (
                                       <div
                                          key={i}
                                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                                          style={{
                                             background: 'rgba(52,211,153,0.06)',
                                             border: '1px solid rgba(52,211,153,0.15)',
                                             color: '#059669',
                                          }}
                                       >
                                          <span
                                             className="w-1.5 h-1.5 rounded-full"
                                             style={{ background: '#10b981' }}
                                          />
                                          {k}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Legacy text guidelines */}
                           {campaign.content_guidelines && (
                              <div
                                 className="pt-4 mt-2"
                                 style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
                              >
                                 <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                    Specific Guidelines
                                 </p>
                                 <p
                                    className="text-sm leading-relaxed whitespace-pre-line font-medium"
                                    style={{ color: 'rgba(0,0,0,0.6)' }}
                                 >
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
                              className="group relative overflow-hidden rounded-2xl w-full text-left"
                              style={{
                                 aspectRatio: '16/9',
                                 background: '#fff',
                                 border: '1px solid rgba(0,0,0,0.06)',
                              }}
                           >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10" />
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
                                    style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                                 >
                                    <Play className="h-5 w-5 text-stone-900 fill-stone-900" />
                                 </div>
                              </div>
                              <div
                                 className="absolute bottom-3 left-3 right-3 z-20 text-[10px] font-bold truncate"
                                 style={{ color: 'rgba(0,0,0,0.4)' }}
                              >
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
               <div
                  className="rounded-2xl p-6 relative overflow-hidden"
                  style={{
                     background: 'linear-gradient(160deg, #ffffff 0%, #fcfbf9 100%)',
                     border: '1px solid rgba(249,115,22,0.2)',
                     boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  }}
               >
                  {/* Glow */}
                  <div
                     className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                     style={{
                        background: 'radial-gradient(circle,rgba(249,115,22,0.08),transparent 70%)',
                        filter: 'blur(20px)',
                     }}
                  />
                  <div className="relative z-10">
                     <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>
                        {campaign.payment_model === 'fixed_per_content'
                           ? 'Fixed Reward'
                           : 'Earn per 1K views'}
                     </p>
                     <div className="flex items-baseline gap-2 mb-1">
                        <span
                           className="text-4xl font-black"
                           style={{ color: '#ea580c', letterSpacing: '-0.04em' }}
                        >
                           {campaign.payment_model === 'fixed_per_content'
                              ? formatMoney(campaign.fixed_rate ?? 0, 'USD')
                              : formatMoney(campaign.rate_per_1k_views, 'USD')}
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'rgba(0,0,0,0.4)' }}>
                           {campaign.payment_model === 'fixed_per_content'
                              ? '/ submission'
                              : '/ 1K views'}
                        </span>
                     </div>

                     {campaign.max_payout_per_sub && (
                        <div
                           className="flex items-center gap-2 px-3 py-2 rounded-xl mt-3 mb-5"
                           style={{
                              background: '#fff',
                              border: '1px solid #eeedea',
                           }}
                        >
                           <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: '#f97316' }}
                           />
                           <p className="text-[11px] font-bold" style={{ color: 'rgba(0,0,0,0.5)' }}>
                              Max {formatMoney(campaign.max_payout_per_sub, 'USD')} / submission
                           </p>
                        </div>
                     )}

                     {campaign.status === 'active' ? (
                        <Link
                           href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                           className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-black text-white transition-all hover:brightness-110 active:scale-95 mt-4"
                           style={{
                              background: 'linear-gradient(135deg,#f97316,#ea580c)',
                              boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
                           }}
                        >
                           {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                           <ArrowUpRight className="h-4 w-4" />
                        </Link>
                     ) : (
                        <div
                           className="w-full py-3.5 mt-4 text-center rounded-xl text-sm font-black uppercase tracking-widest"
                           style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              color: 'rgba(255,255,255,0.25)',
                           }}
                        >
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
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-stone-50"
                              style={{
                                 background: '#ffffff',
                                 border: '1px solid rgba(0,0,0,0.06)',
                              }}
                           >
                              <div className="flex items-center gap-3">
                                 <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: '#f8f7f5', border: '1px solid #eeedea' }}
                                 >
                                    <meta.icon className="h-4 w-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
                                 </div>
                                 <span className="text-sm font-bold text-stone-900">{meta.label}</span>
                              </div>
                              <CheckCircle className="h-4 w-4" style={{ color: '#10b981', fill: '#10b981', opacity: 0.8 }} />
                           </div>
                        );
                     })}
                  </div>

                  {campaign.requires_face && (
                     <div
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-3"
                        style={{
                           background: 'rgba(251,191,36,0.1)',
                           border: '1px solid rgba(251,191,36,0.2)',
                        }}
                     >
                        <Users className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
                        <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#b45309' }}>
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
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                 Starts
                              </span>
                              <span className="text-sm font-black text-stone-900">
                                 {new Date(campaign.starts_at).toLocaleDateString()}
                              </span>
                           </div>
                        )}
                        {campaign.ends_at && (
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.4)' }}>
                                 Ends
                              </span>
                              <span className="text-sm font-black text-stone-900">
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