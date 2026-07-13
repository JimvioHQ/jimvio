'use client';

import { CampaignDetailView } from "@/components/ugc/campaign-detail/CampaignDetailView";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign } from '@/types/ugc';
import {
   ArrowLeft, CheckCircle, Globe, Info, Play,
   MessageSquare, Users, Music, Target, Zap, Shield, ArrowUpRight,
   Share2, Instagram, Youtube, Clock,
   AlertCircle, Copy, Check,
} from 'lucide-react';
import {
   Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

/* ─── Platform meta ──────────────────────────────────────────────────────── */
const PLATFORM_META: Record<string, {
   icon: any; label: string;
   bg: string; text: string; dot: string;
}> = {
   tiktok: { icon: Play, label: 'TikTok', bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', dot: 'bg-pink-500' },
   instagram: { icon: Instagram, label: 'Instagram', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
   youtube: { icon: Youtube, label: 'YouTube', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
   x: { icon: MessageSquare, label: 'X / Twitter', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
};

/* ─── Primitives ─────────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
   return (
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-3">
         {children}
      </p>
   );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
   return (
      <div className={cn(
         'rounded-2xl border border-border bg-surface p-4 sm:p-5',
         className,
      )}>
         {children}
      </div>
   );
}

function CopyChip({ text, display }: { text: string; display: string }) {
   const [copied, setCopied] = useState(false);
   function copy(e: React.MouseEvent) {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   }
   return (
      <button
         onClick={copy}
         className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'text-[11px] font-semibold border transition-all select-none touch-manipulation',
            'border-accent bg-accent-light text-accent',
            'hover:bg-accent-subtle active:scale-95',
         )}
      >
         {display}
         {copied
            ? <Check className="h-3 w-3 text-success shrink-0" />
            : <Copy className="h-3 w-3 opacity-40 shrink-0" />}
      </button>
   );
}

function KeywordChip({ children }: { children: React.ReactNode }) {
   return (
      <span className={cn(
         'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
         'text-[11px] font-semibold border',
         'border-success bg-success-light text-success',
      )}>
         <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
         {children}
      </span>
   );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, colorClass }: {
   label: string; value: string; sub: string; colorClass: string;
}) {
   return (
      <div className="rounded-md border border-border bg-surface p-3.5 sm:p-4 flex flex-col gap-1.5">
         <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-muted leading-none">
            {label}
         </p>
         <p className={cn('text-[19px] sm:text-[22px] font-bold tabular-nums leading-none tracking-tight', colorClass)}>
            {value}
         </p>
         <p className="text-[10px] text-text-muted leading-relaxed">{sub}</p>
      </div>
   );
}

/* ─── Decorative concentric rings ────────────────────────────────────────── */
function RingDecoration({ className }: { className?: string }) {
   return (
      <svg
         aria-hidden
         className={cn('pointer-events-none select-none', className)}
         viewBox="0 0 320 320"
         fill="none"
         xmlns="http://www.w3.org/2000/svg"
      >
         <circle cx="320" cy="0" r="200" stroke="var(--color-accent)" strokeWidth="0.75" />
         <circle cx="320" cy="0" r="140" stroke="var(--color-accent)" strokeWidth="0.75" />
         <circle cx="320" cy="0" r="80" stroke="var(--color-accent)" strokeWidth="0.75" />
      </svg>
   );
}

/* ─── Mobile sticky CTA ──────────────────────────────────────────────────── */
function MobileStickyCTA({
   isActive, isJoined, id, payRate, payLabel,
}: {
   isActive: boolean; isJoined: boolean; id: string;
   payRate: string; payLabel: string;
}) {
   return (
      <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
         <div className={cn(
            'bg-surface/95 backdrop-blur-xl',
            'border-t border-border',
            'px-4 pt-3',
            'pb-[max(12px,env(safe-area-inset-bottom))]',
            'flex items-center gap-3',
         )}>
            <div className="flex flex-col shrink-0">
               <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted leading-none mb-0.5">Earn</span>
               <span className="text-[17px] font-bold text-accent tabular-nums leading-none">{payRate}</span>
               <span className="text-[9px] text-text-muted leading-none mt-0.5">{payLabel}</span>
            </div>

            <div className="w-px h-8 bg-border shrink-0" />

            {isActive ? (
               <Link
                  href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                  className={cn(
                     'flex-1 flex items-center justify-center gap-2',
                     'h-12 rounded-2xl text-sm font-bold text-white',
                     'bg-accent active:bg-accent-hover',
                     'shadow-[0_4px_20px_rgba(253,80,0,0.35)]',
                     'active:scale-[0.98] transition-transform touch-manipulation',
                  )}
               >
                  {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
               </Link>
            ) : (
               <div className={cn(
                  'flex-1 flex items-center justify-center h-12 rounded-2xl',
                  'text-sm font-bold text-text-muted',
                  'border border-border bg-surface-secondary',
               )}>
                  Unavailable
               </div>
            )}
         </div>
      </div>
   );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function CampaignDetailPage() {
   const { formatMoney } = useCurrency();
   const { id } = useParams<{ id: string }>();

   const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
   const [isJoined, setIsJoined] = useState(false);
   const [loading, setLoading] = useState(true);
   const [activeVideo, setActiveVideo] = useState<string | null>(null);
   const [shared, setShared] = useState(false);

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
   if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
         <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-[2.5px] border-accent border-t-transparent animate-spin" />
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Loading</p>
         </div>
      </div>
   );

   /* ── Not found ── */
   if (!campaign) return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-bg px-4 text-center">
         <div className="h-14 w-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-text-muted" />
         </div>
         <div>
            <p className="text-base font-bold text-text-primary mb-1">Campaign not found</p>
            <p className="text-sm text-text-muted">This campaign may have ended or been removed.</p>
         </div>
         <Link
            href="/ugc"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
         >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to campaigns
         </Link>
      </div>
   );

   /* ── Derived ── */
   const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
   const banner = campaign.media?.find(m => m.usage === 'banner')?.url;
   const examples = campaign.media?.filter(m => m.usage === 'example') ?? [];
   const isUGC = campaign.campaign_type === 'ugc';
   const isActive = campaign.status === 'active';
   const payRate = campaign.payment_model === 'fixed_per_content'
      ? formatMoney(campaign.fixed_rate ?? 0, 'USD')
      : formatMoney(campaign.rate_per_1k_views, 'USD');
   const payLabel = campaign.payment_model === 'fixed_per_content' ? 'per submission' : 'per 1K views';
   const daysLeft = campaign.ends_at
      ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000))
      : null;

   const urgencyClass = daysLeft !== null
      ? daysLeft <= 3
         ? 'border-danger bg-danger-light text-danger'
         : daysLeft <= 7
            ? 'border-warning bg-warning-light text-warning'
            : 'border-border bg-surface text-text-muted'
      : '';

   function getEmbedUrl(url: string) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
         const vid = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
         return `https://www.youtube.com/embed/${vid}?autoplay=1`;
      }
      if (url.includes('instagram.com')) return `${url.split('?')[0]}embed`;
      return url;
   }

   function shareUrl() {
      if (typeof navigator !== 'undefined' && navigator.share) {
         navigator.share({ title: campaign?.title || "", url: window.location.href });
      } else {
         navigator.clipboard.writeText(window.location.href);
         setShared(true);
         setTimeout(() => setShared(false), 2000);
      }
   }

   /* ── Render ── */
   return (
      <>
         <div className="min-h-screen pb-28 lg:pb-14 bg-bg">

            {/* ════════════ HERO ════════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-surface">

               {banner && (
                  <div className="absolute inset-0">
                     <Image
                        src={banner} alt="" fill priority
                        className="object-cover opacity-[0.07] dark:opacity-[0.05]"
                     />
                  </div>
               )}

               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/70 to-surface pointer-events-none" />
               <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-transparent to-transparent pointer-events-none" />

               <RingDecoration className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 opacity-[0.09] dark:opacity-[0.06]" />

               <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">

                  <div className="pt-4 sm:pt-5 pb-5 sm:pb-7">
                     <Link
                        href="/ugc"
                        className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-muted hover:text-text-primary transition-colors group w-fit"
                     >
                        <span className={cn(
                           'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                           'border border-border bg-surface',
                           'group-hover:border-border-strong',
                        )}>
                           <ArrowLeft className="h-3.5 w-3.5" />
                        </span>
                        Campaigns
                     </Link>
                  </div>

                  <div className="pb-7 sm:pb-9 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">

                     <div className="flex items-end gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="relative shrink-0">
                           <div className="absolute -inset-2 rounded-[18px] bg-accent opacity-20 blur-xl" />
                           {campaign.vendor?.business_logo ? (
                              <img
                                 src={campaign.vendor.business_logo}
                                 alt={campaign.vendor?.business_name ?? ''}
                                 className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-2xl object-cover border-2 border-surface shadow-lg"
                              />
                           ) : (
                              <div className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-gradient-to-br from-accent to-accent-hover shadow-lg">
                                 {campaign.vendor?.business_name?.[0] ?? 'B'}
                              </div>
                           )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                           <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className={cn(
                                 'inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border',
                                 isActive
                                    ? 'bg-success-light border-success text-success'
                                    : 'bg-surface-secondary border-border text-text-muted',
                              )}>
                                 {isActive && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                                 {campaign.status}
                              </span>
                              <span className={cn(
                                 'inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border',
                                 isUGC
                                    ? 'bg-accent-light border-accent text-accent'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400',
                              )}>
                                 <Zap className="h-2.5 w-2.5" />
                                 {campaign.campaign_type}
                              </span>
                           </div>

                           <h1 className="text-[19px] sm:text-[28px] lg:text-[32px] font-bold text-text-primary leading-tight tracking-tight line-clamp-2">
                              {campaign.title}
                           </h1>

                           <p className="text-[11px] sm:text-xs text-text-muted flex items-center gap-1.5 flex-wrap">
                              by{' '}
                              <span className="font-semibold text-text-secondary">
                                 {campaign.vendor?.business_name}
                              </span>
                              <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-100 dark:fill-blue-500/20 shrink-0" />
                           </p>
                        </div>
                     </div>

                     <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <button
                           onClick={shareUrl}
                           title="Share"
                           className={cn(
                              'h-10 w-10 rounded-md flex items-center justify-center transition-all',
                              'border border-border bg-surface',
                              'text-text-muted hover:text-text-primary',
                              'hover:border-border-strong',
                           )}
                        >
                           {shared ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
                        </button>

                        {isActive ? (
                           <Link
                              href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                              className={cn(
                                 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                 'bg-accent shadow-[0_4px_16px_rgba(253,80,0,0.3)]',
                                 'hover:bg-accent-hover',
                              )}
                           >
                              {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                              <ArrowUpRight className="h-4 w-4" />
                           </Link>
                        ) : (
                           <div className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-bold text-text-muted border border-border bg-surface-secondary cursor-not-allowed">
                              Unavailable
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* ════════════ BODY ════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 sm:gap-6 items-start">

               <div className="space-y-4 sm:space-y-5 min-w-0">

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                     <StatCard label="Payout" colorClass="text-accent" value={payRate} sub={payLabel} />
                     <StatCard label="Total Budget" colorClass="text-violet-500" value={formatMoney(campaign.total_budget, 'USD')} sub="campaign cap" />
                     <StatCard label="Submissions" colorClass="text-success" value={String(campaign.submission_count ?? 0)} sub="total joined" />
                     <StatCard label="Approved" colorClass="text-sky-500" value={String(campaign.approved_count ?? 0)} sub="content pieces" />
                  </div>

                  <Card>
                     <SectionLabel>About this Campaign</SectionLabel>
                     <p className="text-sm leading-[1.8] text-text-muted whitespace-pre-line">
                        {campaign.description}
                     </p>
                  </Card>

                  <Card>
                     <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                           <SectionLabel>Budget Usage</SectionLabel>
                           <p className="text-[20px] sm:text-[22px] font-bold text-text-primary tabular-nums leading-none">
                              {Math.round(budgetPct)}%
                              <span className="text-sm font-semibold text-text-muted ml-2">allocated</span>
                           </p>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[10px] font-semibold text-text-muted mb-0.5">Remaining</p>
                           <p className="text-sm font-bold text-text-primary tabular-nums">
                              {formatMoney(campaign.total_budget - (campaign.spent_budget ?? 0), 'USD')}
                           </p>
                        </div>
                     </div>
                     <div className="h-2 w-full rounded-full bg-surface-secondary overflow-hidden">
                        <div
                           className="h-full rounded-full bg-accent transition-all duration-700"
                           style={{ width: `${budgetPct}%` }}
                        />
                     </div>
                     <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-text-muted tabular-nums">
                           {formatMoney(campaign.spent_budget ?? 0, 'USD')} spent
                        </p>
                        <p className="text-[10px] text-text-muted tabular-nums">
                           of {formatMoney(campaign.total_budget, 'USD')}
                        </p>
                     </div>
                  </Card>

                  {/* Content requirements */}
                  {(campaign.min_duration || campaign.max_duration ||
                     (campaign.required_hashtags?.length ?? 0) > 0 ||
                     (campaign.required_mentions?.length ?? 0) > 0 ||
                     (campaign.required_keywords?.length ?? 0) > 0 ||
                     campaign.content_guidelines) && (
                        <Card>
                           <SectionLabel>Content Requirements</SectionLabel>
                           <div className="space-y-5">

                              {(campaign.min_duration || campaign.max_duration) && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Duration</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface-secondary text-sm font-semibold text-text-primary">
                                       <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                                       {campaign.min_duration ?? 0}s – {campaign.max_duration ?? '∞'}s
                                    </div>
                                 </div>
                              )}

                              {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Required Audio</p>
                                    <a
                                       href={campaign.music_track_url}
                                       target="_blank" rel="noreferrer"
                                       className="flex items-center gap-3 p-3 sm:p-3.5 rounded-md border border-accent bg-accent-light hover:bg-accent-subtle transition-colors group"
                                    >
                                       <div className="h-9 w-9 rounded-md bg-accent-light flex items-center justify-center shrink-0">
                                          <Music className="h-4 w-4 text-accent" />
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-text-primary">Listen to Track</p>
                                          <p className="text-[11px] text-accent mt-0.5 truncate">
                                             {campaign.music_artist_name || 'Original Audio'}
                                          </p>
                                       </div>
                                       <ArrowUpRight className="h-4 w-4 text-text-muted shrink-0 group-hover:text-accent transition-colors" />
                                    </a>
                                 </div>
                              )}

                              {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Promotion Target</p>
                                    <a
                                       href={campaign.promotion_target_url || '#'}
                                       target="_blank" rel="noreferrer"
                                       className="flex items-center gap-3 p-3 sm:p-3.5 rounded-md border border-indigo-200 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-colors group"
                                    >
                                       <div className="h-9 w-9 rounded-md bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                          <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-text-primary truncate">{campaign.promotion_target}</p>
                                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">View target</p>
                                       </div>
                                       <ArrowUpRight className="h-4 w-4 text-text-muted shrink-0 group-hover:text-indigo-500 transition-colors" />
                                    </a>
                                 </div>
                              )}

                              {(campaign.required_hashtags?.length ?? 0) > 0 && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">
                                       Hashtags <span className="normal-case font-normal">(tap to copy)</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                       {campaign.required_hashtags.map((tag, i) => (
                                          <CopyChip key={i} text={`#${tag.replace(/^#/, '')}`} display={`#${tag.replace(/^#/, '')}`} />
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {(campaign.required_mentions?.length ?? 0) > 0 && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Tag These Accounts</p>
                                    <div className="flex flex-wrap gap-2">
                                       {campaign.required_mentions.map((m, i) => (
                                          <CopyChip key={i} text={`@${m.replace(/^@/, '')}`} display={`@${m.replace(/^@/, '')}`} />
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {(campaign.required_keywords?.length ?? 0) > 0 && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Keywords to Include</p>
                                    <div className="flex flex-wrap gap-2">
                                       {campaign.required_keywords.map((k, i) => (
                                          <KeywordChip key={i}>{k}</KeywordChip>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {campaign.content_guidelines && (
                                 <div className="pt-4 border-t border-border">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-2">Additional Guidelines</p>
                                    <p className="text-sm leading-[1.8] text-text-muted whitespace-pre-line">
                                       {campaign.content_guidelines}
                                    </p>
                                 </div>
                              )}
                           </div>
                        </Card>
                     )}

                  {/* Reference videos */}
                  {examples.length > 0 && (
                     <div>
                        <SectionLabel>Reference Content</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {examples.map((m, i) => (
                              <button
                                 key={i}
                                 onClick={() => setActiveVideo(m.url)}
                                 className="group relative overflow-hidden rounded-2xl border border-border bg-surface w-full text-left hover:border-border-strong hover:shadow-md transition-all touch-manipulation"
                                 style={{ aspectRatio: '16/9' }}
                                 aria-label={`Play example video ${i + 1}`}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                                 <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-surface/90 backdrop-blur-sm shadow-lg flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform duration-200">
                                       <Play className="h-4 w-4 sm:h-5 sm:w-5 text-text-primary fill-text-primary ml-0.5" />
                                    </div>
                                 </div>
                                 <p className="absolute bottom-3 left-3 sm:left-3.5 z-20 text-[11px] font-semibold text-white/70">
                                    Example {i + 1}
                                 </p>
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* ── RIGHT sidebar ── */}
               <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-[calc(var(--navbar-height,64px)+24px)]">

                  {/* Payout card */}
                  <div className="relative rounded-2xl border border-accent bg-surface overflow-hidden">
                     <RingDecoration className="absolute top-0 right-0 w-40 h-40 sm:w-44 sm:h-44 opacity-[0.08] dark:opacity-[0.05]" />

                     <div className="relative z-10 p-4 sm:p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted mb-1.5">
                           {campaign.payment_model === 'fixed_per_content' ? 'Fixed Reward' : 'Performance Pay'}
                        </p>
                        <div className="flex items-baseline gap-2 mb-0.5">
                           <span className="text-[32px] sm:text-[38px] font-bold text-accent tabular-nums tracking-tight leading-none">
                              {payRate}
                           </span>
                        </div>
                        <p className="text-sm text-text-muted mb-4 sm:mb-5">{payLabel}</p>

                        {campaign.max_payout_per_sub && (
                           <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-border bg-surface-secondary mb-4">
                              <Info className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
                              <p className="text-xs text-text-muted">
                                 Capped at{' '}
                                 <span className="font-semibold text-text-primary">
                                    {formatMoney(campaign.max_payout_per_sub, 'USD')}
                                 </span>
                                 {' '}per submission
                              </p>
                           </div>
                        )}

                        <div className="hidden lg:block">
                           {isActive ? (
                              <Link
                                 href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                                 className={cn(
                                    'inline-flex items-center justify-center w-full gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                    'bg-accent shadow-[0_4px_16px_rgba(253,80,0,0.3)]',
                                    'hover:bg-accent-hover',
                                 )}
                              >
                                 {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                                 <ArrowUpRight className="h-4 w-4" />
                              </Link>
                           ) : (
                              <div className="flex items-center justify-center w-full h-12 rounded-xl text-sm font-bold text-text-muted border border-border bg-surface-secondary">
                                 Campaign {campaign.status}
                              </div>
                           )}
                        </div>

                        <div className="sm:block lg:hidden">
                           {isActive ? (
                              <Link
                                 href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                                 className={cn(
                                    'inline-flex items-center justify-center w-full gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                    'bg-accent shadow-[0_4px_16px_rgba(253,80,0,0.3)]',
                                    'hover:bg-accent-hover',
                                 )}
                              >
                                 {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                                 <ArrowUpRight className="h-4 w-4" />
                              </Link>
                           ) : (
                              <div className="flex items-center justify-center w-full h-12 rounded-xl text-sm font-bold text-text-muted border border-border bg-surface-secondary">
                                 Campaign {campaign.status}
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="relative z-10 px-4 sm:px-5 py-3 border-t border-border bg-surface-secondary flex items-start gap-2.5">
                        <Shield className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
                        <p className="text-[11px] text-text-muted leading-relaxed">
                           Payments held in escrow. Released after approval and view verification.
                        </p>
                     </div>
                  </div>

                  {/* Platforms */}
                  <Card>
                     <SectionLabel>Allowed Platforms</SectionLabel>
                     <div className="space-y-2">
                        {(campaign.allowed_platforms ?? []).map(p => {
                           const meta = PLATFORM_META[p] ?? {
                              icon: Globe, label: p,
                              bg: 'bg-surface-secondary',
                              text: 'text-text-muted', dot: 'bg-text-muted',
                           };
                           const Icon = meta.icon;
                           return (
                              <div
                                 key={p}
                                 className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-surface-secondary"
                              >
                                 <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', meta.bg)}>
                                    <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                                 </div>
                                 <span className="text-sm font-medium text-text-secondary flex-1">{meta.label}</span>
                                 <span className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)} />
                              </div>
                           );
                        })}
                     </div>

                     {campaign.requires_face && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-warning bg-warning-light mt-3">
                           <Users className="h-3.5 w-3.5 text-warning shrink-0" />
                           <p className="text-[12px] font-semibold text-warning">
                              Face required in content
                           </p>
                        </div>
                     )}
                  </Card>

                  {/* Timeline */}
                  {(campaign.starts_at || campaign.ends_at) && (
                     <Card>
                        <SectionLabel>Timeline</SectionLabel>
                        <div className="space-y-3">
                           {campaign.starts_at && (
                              <div className="flex items-center justify-between gap-4">
                                 <span className="text-xs text-text-muted">Starts</span>
                                 <span className="text-xs font-semibold text-text-secondary tabular-nums">
                                    {new Date(campaign.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </span>
                              </div>
                           )}
                           {campaign.ends_at && (
                              <>
                                 {campaign.starts_at && <div className="h-px bg-border" />}
                                 <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-text-muted">Ends</span>
                                    <span className="text-xs font-semibold text-text-secondary tabular-nums">
                                       {new Date(campaign.ends_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                 </div>
                              </>
                           )}

                           {daysLeft !== null && isActive && (
                              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold', urgencyClass)}>
                                 <Clock className="h-3.5 w-3.5 shrink-0" />
                                 {daysLeft === 0 ? 'Ends today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                              </div>
                           )}
                        </div>
                     </Card>
                  )}

                  {/* Share — desktop */}
                  <button
                     onClick={shareUrl}
                     className={cn(
                        'hidden lg:flex w-full items-center justify-center gap-2 h-10 rounded-md',
                        'border border-border bg-surface',
                        'text-sm font-semibold text-text-muted',
                        'hover:text-text-primary hover:border-border-strong transition-all',
                     )}
                  >
                     {shared ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
                     {shared ? 'Link copied!' : 'Share campaign'}
                  </button>
               </aside>
            </div>
         </div>

         {/* ── Mobile sticky CTA ── */}
         <MobileStickyCTA
            isActive={isActive}
            isJoined={isJoined}
            id={id}
            payRate={payRate}
            payLabel={payLabel}
         />

         {/* ── Video modal ── */}
         <Dialog open={!!activeVideo} onOpenChange={open => !open && setActiveVideo(null)}>
            {/* w-[calc(100vw-2rem)] ensures it never clips on narrow phones */}
            <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl p-0 bg-black border-0 overflow-hidden rounded-2xl shadow-2xl">
               <DialogHeader className="sr-only">
                  <DialogTitle>Video Preview</DialogTitle>
               </DialogHeader>
               <div className="relative w-full aspect-video bg-black">
                  {activeVideo && (
                     activeVideo.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                        <video src={activeVideo} controls autoPlay playsInline className="w-full h-full" />
                     ) : (
                        <iframe
                           src={getEmbedUrl(activeVideo)}
                           className="w-full h-full border-0"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                           allowFullScreen
                        />
                     )
                  )}
               </div>
            </DialogContent>
         </Dialog>
      </>
   );
}
