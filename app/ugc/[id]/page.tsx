// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams } from 'next/navigation';
// import Link from 'next/link';
// import Image from 'next/image';
// import type { UGCCampaign } from '@/types/ugc';
// import {
//    ArrowLeft, CheckCircle, Globe, Calendar, Info, Play,
//    MessageSquare, DollarSign, Camera, ChevronRight,
//    Users, Music, Target, Zap, Shield, ArrowUpRight,
//    Share2, Instagram, Youtube, X, Clock, TrendingUp,
//    AlertCircle, Copy, Check,
// } from 'lucide-react';
// import {
//    Dialog, DialogContent, DialogHeader, DialogTitle,
// } from '@/components/ui/dialog';
// import { cn } from '@/lib/utils';
// import { useCurrency } from '@/context/CurrencyContext';

// /* ── Platform meta ─────────────────────────────────────────────────────────── */
// const PLATFORM_META: Record<string, { icon: any; label: string; color: string }> = {
//    tiktok: { icon: Play, label: 'TikTok', color: 'text-pink-500   bg-pink-500/10   border-pink-500/20' },
//    instagram: { icon: Instagram, label: 'Instagram', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
//    youtube: { icon: Youtube, label: 'YouTube', color: 'text-rose-500   bg-rose-500/10   border-rose-500/20' },
//    x: { icon: MessageSquare, label: 'X / Twitter', color: 'text-sky-500    bg-sky-500/10    border-sky-500/20' },
// };

// /* ── Section label ─────────────────────────────────────────────────────────── */
// function SectionLabel({ children }: { children: React.ReactNode }) {
//    return (
//       <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
//          {children}
//       </p>
//    );
// }

// /* ── Card ──────────────────────────────────────────────────────────────────── */
// function Card({ children, className }: { children: React.ReactNode; className?: string }) {
//    return (
//       <div className={cn(
//          'rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6',
//          className
//       )}>
//          {children}
//       </div>
//    );
// }

// /* ── Tag chip ──────────────────────────────────────────────────────────────── */
// function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
//    return (
//       <span className={cn(
//          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border',
//          className
//       )}>
//          {children}
//       </span>
//    );
// }

// /* ── Copy chip ─────────────────────────────────────────────────────────────── */
// function CopyChip({ text, display }: { text: string; display: string }) {
//    const [copied, setCopied] = useState(false);
//    function copy() {
//       navigator.clipboard.writeText(text);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//    }
//    return (
//       <button
//          onClick={copy}
//          className={cn(
//             'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
//             'border-orange-500/20 bg-orange-500/8 text-orange-600 dark:text-orange-400',
//             'hover:bg-orange-500/15 active:scale-95'
//          )}
//       >
//          {display}
//          {copied
//             ? <Check className="h-3 w-3 text-emerald-500" />
//             : <Copy className="h-3 w-3 opacity-50" />}
//       </button>
//    );
// }

// /* ── Stat mini card ────────────────────────────────────────────────────────── */
// function StatCard({ label, value, sub, accent }: {
//    label: string; value: string; sub: string; accent: string;
// }) {
//    return (
//       <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-1">
//          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
//          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', accent)}>{value}</p>
//          <p className="text-[10px] text-[var(--color-text-muted)]">{sub}</p>
//       </div>
//    );
// }

// /* ── Page ──────────────────────────────────────────────────────────────────── */
// export default function CampaignDetailPage() {
//    const { formatMoney } = useCurrency();
//    const { id } = useParams<{ id: string }>();

//    const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
//    const [isJoined, setIsJoined] = useState(false);
//    const [loading, setLoading] = useState(true);
//    const [activeVideo, setActiveVideo] = useState<string | null>(null);
//    const [shared, setShared] = useState(false);

//    useEffect(() => {
//       async function init() {
//          try {
//             const [cRes, pRes] = await Promise.all([
//                fetch(`/api/ugc/campaigns/${id}`),
//                fetch(`/api/ugc/campaigns/${id}/participant`),
//             ]);
//             if (cRes.ok) setCampaign((await cRes.json()).campaign);
//             if (pRes.ok) {
//                const { status } = await pRes.json();
//                if (status === 'accepted') setIsJoined(true);
//             }
//          } catch (err) {
//             console.error(err);
//          } finally {
//             setLoading(false);
//          }
//       }
//       init();
//    }, [id]);

//    /* ── Loading ── */
//    if (loading) return (
//       <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
//          <div className="flex flex-col items-center gap-4">
//             <div className="h-5 w-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
//             <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Loading…</p>
//          </div>
//       </div>
//    );

//    /* ── Not found ── */
//    if (!campaign) return (
//       <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--color-bg)' }}>
//          <AlertCircle className="h-8 w-8 text-[var(--color-border)]" />
//          <p className="text-sm font-semibold text-[var(--color-text-muted)]">Campaign not found</p>
//          <Link href="/ugc" className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">
//             <ArrowLeft className="h-3 w-3" /> Back to campaigns
//          </Link>
//       </div>
//    );

//    /* ── Derived ── */
//    const budgetPct = Math.min(100, ((campaign.spent_budget ?? 0) / (campaign.total_budget || 1)) * 100);
//    const banner = campaign.media?.find(m => m.usage === 'banner')?.url;
//    const examples = campaign.media?.filter(m => m.usage === 'example') ?? [];
//    const isUGC = campaign.campaign_type === 'ugc';
//    const isActive = campaign.status === 'active';
//    const payRate = campaign.payment_model === 'fixed_per_content'
//       ? formatMoney(campaign.fixed_rate ?? 0, 'USD')
//       : formatMoney(campaign.rate_per_1k_views, 'USD');
//    const payLabel = campaign.payment_model === 'fixed_per_content' ? '/ submission' : '/ 1K views';

//    function getEmbedUrl(url: string) {
//       if (url.includes('youtube.com') || url.includes('youtu.be')) {
//          const vid = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
//          return `https://www.youtube.com/embed/${vid}?autoplay=1`;
//       }
//       if (url.includes('instagram.com')) return `${url.split('?')[0]}embed`;
//       return url;
//    }

//    function shareUrl() {
//       navigator.clipboard.writeText(window.location.href);
//       setShared(true);
//       setTimeout(() => setShared(false), 2000);
//    }

//    /* ── Render ── */
//    return (
//       <>
//          <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

//             {/* ── Hero ── */}
//             <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden">
//                <div className="absolute inset-0 bg-[var(--color-surface)]" />
//                {banner && (
//                   <Image src={banner} alt={campaign.title} fill className="object-cover opacity-[0.12]" priority />
//                )}
//                {/* Gradient fade to page bg */}
//                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/30 to-transparent" />
//                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-transparent to-transparent" />

//                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-between py-6">
//                   {/* Back */}
//                   <Link
//                      href="/ugc"
//                      className="flex items-center gap-2 w-fit text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
//                   >
//                      <div className={cn(
//                         'h-8 w-8 rounded-md flex items-center justify-center transition-all',
//                         'border border-[var(--color-border)] bg-[var(--color-surface)]',
//                         'hover:border-[var(--color-border-strong)]'
//                      )}>
//                         <ArrowLeft className="h-3.5 w-3.5" />
//                      </div>
//                      Campaigns
//                   </Link>

//                   {/* Hero bottom */}
//                   <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
//                      <div className="flex items-end gap-4">
//                         {/* Logo */}
//                         <div className="relative shrink-0">
//                            <div className="absolute inset-0 rounded-2xl bg-orange-500/20 blur-[16px] scale-110" />
//                            {campaign.vendor?.business_logo ? (
//                               <img
//                                  src={campaign.vendor.business_logo}
//                                  className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-[var(--color-border)] shadow-xl"
//                                  alt=""
//                               />
//                            ) : (
//                               <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-orange-400 to-orange-600 shadow-xl">
//                                  {campaign.vendor?.business_name?.[0] ?? 'B'}
//                               </div>
//                            )}
//                         </div>

//                         {/* Title */}
//                         <div className="space-y-2 min-w-0">
//                            <div className="flex items-center gap-2 flex-wrap">
//                               <span className={cn(
//                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border',
//                                  isActive
//                                     ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
//                                     : 'bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]'
//                               )}>
//                                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
//                                  {campaign.status}
//                               </span>
//                               <span className={cn(
//                                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border',
//                                  isUGC
//                                     ? 'bg-orange-500/10 border-orange-500/20 text-orange-600'
//                                     : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
//                               )}>
//                                  <Zap className="h-2.5 w-2.5" />
//                                  {campaign.campaign_type}
//                               </span>
//                            </div>

//                            <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight">
//                               {campaign.title}
//                            </h1>

//                            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
//                               by <span className="font-semibold text-[var(--color-text-primary)]">
//                                  {campaign.vendor?.business_name}
//                               </span>
//                               <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-500/30" />
//                            </p>
//                         </div>
//                      </div>

//                      {/* Actions */}
//                      <div className="flex items-center gap-2 shrink-0">
//                         <button
//                            onClick={shareUrl}
//                            className={cn(
//                               'h-10 w-10 rounded-md flex items-center justify-center transition-all border',
//                               'border-[var(--color-border)] bg-[var(--color-surface)]',
//                               'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
//                            )}
//                         >
//                            {shared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
//                         </button>
//                         <Link
//                            href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
//                            className={cn(
//                               'inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98]',
//                               isActive
//                                  ? 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_16px_rgba(249,115,22,0.35)]'
//                                  : 'bg-[var(--color-text-muted)] cursor-not-allowed opacity-60'
//                            )}
//                         >
//                            {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
//                            <ArrowUpRight className="h-4 w-4" />
//                         </Link>
//                      </div>
//                   </div>
//                </div>
//             </div>

//             {/* ── Content ── */}
//             <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

//                {/* ── LEFT ── */}
//                <div className="space-y-6 min-w-0">

//                   {/* Description */}
//                   <Card>
//                      <SectionLabel>About this Campaign</SectionLabel>
//                      <p className="text-sm leading-relaxed text-[var(--color-text-muted)] whitespace-pre-line">
//                         {campaign.description}
//                      </p>
//                   </Card>

//                   {/* Stats */}
//                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                      <StatCard
//                         label="Payout Rate" accent="text-orange-500"
//                         value={payRate} sub={payLabel}
//                      />
//                      <StatCard
//                         label="Total Budget" accent="text-violet-500"
//                         value={formatMoney(campaign.total_budget, 'USD')} sub="campaign cap"
//                      />
//                      <StatCard
//                         label="Submissions" accent="text-emerald-500"
//                         value={String(campaign.submission_count ?? 0)} sub="total joined"
//                      />
//                      <StatCard
//                         label="Approved" accent="text-sky-500"
//                         value={String(campaign.approved_count ?? 0)} sub="content pieces"
//                      />
//                   </div>

//                   {/* Budget bar */}
//                   <Card>
//                      <div className="flex items-center justify-between mb-3">
//                         <SectionLabel>Budget Usage</SectionLabel>
//                         <span className="text-xs font-semibold text-[var(--color-text-muted)] tabular-nums">
//                            {formatMoney(campaign.spent_budget ?? 0, 'USD')} / {formatMoney(campaign.total_budget, 'USD')}
//                         </span>
//                      </div>
//                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-[var(--color-border)]">
//                         <div
//                            className="h-full rounded-full bg-orange-500 transition-all duration-700"
//                            style={{ width: `${budgetPct}%` }}
//                         />
//                      </div>
//                      <div className="flex items-center justify-between mt-2">
//                         <p className="text-[10px] text-[var(--color-text-muted)]">
//                            {Math.round(budgetPct)}% allocated
//                         </p>
//                         <p className="text-[10px] text-[var(--color-text-muted)]">
//                            {formatMoney(campaign.total_budget - (campaign.spent_budget ?? 0), 'USD')} remaining
//                         </p>
//                      </div>
//                   </Card>

//                   {/* Requirements */}
//                   {(campaign.min_duration || campaign.max_duration ||
//                      (campaign.required_hashtags?.length ?? 0) > 0 ||
//                      (campaign.required_mentions?.length ?? 0) > 0 ||
//                      (campaign.required_keywords?.length ?? 0) > 0 ||
//                      campaign.content_guidelines) && (
//                         <Card>
//                            <SectionLabel>Content Requirements</SectionLabel>
//                            <div className="space-y-5">

//                               {/* Duration */}
//                               {(campaign.min_duration || campaign.max_duration) && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Duration
//                                     </p>
//                                     <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm font-semibold text-[var(--color-text-primary)]">
//                                        <Calendar className="h-3.5 w-3.5 text-orange-500" />
//                                        {campaign.min_duration ?? 0}s – {campaign.max_duration ?? '∞'}s
//                                     </div>
//                                  </div>
//                               )}

//                               {/* Music track */}
//                               {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Required Audio
//                                     </p>

//                                     <a href={campaign.music_track_url}
//                                        target="_blank"
//                                        className="flex items-center gap-3 p-3 rounded-md border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors"
//                                     >
//                                        <div className="h-9 w-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
//                                           <Music className="h-4 w-4 text-orange-500" />
//                                        </div>
//                                        <div>
//                                           <p className="text-sm font-semibold text-[var(--color-text-primary)]">Listen to Track</p>
//                                           <p className="text-xs text-orange-500 mt-0.5">{campaign.music_artist_name || 'Original Audio'}</p>
//                                        </div>
//                                        <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)] ml-auto" />
//                                     </a>
//                                  </div>
//                               )}

//                               {/* Promotion target */}
//                               {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Promotion Target
//                                     </p>

//                                     <a href={campaign.promotion_target_url || '#'}
//                                        target="_blank"
//                                        className="flex items-center gap-3 p-3 rounded-md border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
//                                     >
//                                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
//                                           <Target className="h-4 w-4 text-indigo-500" />
//                                        </div>
//                                        <div className="min-w-0 flex-1">
//                                           <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{campaign.promotion_target}</p>
//                                           <p className="text-xs text-indigo-500 mt-0.5">View target link</p>
//                                        </div>
//                                        <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
//                                     </a>
//                                  </div>
//                               )}

//                               {/* Hashtags */}
//                               {(campaign.required_hashtags?.length ?? 0) > 0 && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Required Hashtags <span className="normal-case font-normal">(click to copy)</span>
//                                     </p>
//                                     <div className="flex flex-wrap gap-2">
//                                        {campaign.required_hashtags.map((tag, i) => (
//                                           <CopyChip key={i} text={`#${tag.replace(/^#/, '')}`} display={`#${tag.replace(/^#/, '')}`} />
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* Mentions */}
//                               {(campaign.required_mentions?.length ?? 0) > 0 && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Tag These Accounts
//                                     </p>
//                                     <div className="flex flex-wrap gap-2">
//                                        {campaign.required_mentions.map((m, i) => (
//                                           <CopyChip key={i} text={`@${m.replace(/^@/, '')}`} display={`@${m.replace(/^@/, '')}`} />
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* Keywords */}
//                               {(campaign.required_keywords?.length ?? 0) > 0 && (
//                                  <div>
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Keywords to Include
//                                     </p>
//                                     <div className="flex flex-wrap gap-2">
//                                        {campaign.required_keywords.map((k, i) => (
//                                           <Chip key={i} className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
//                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//                                              {k}
//                                           </Chip>
//                                        ))}
//                                     </div>
//                                  </div>
//                               )}

//                               {/* Guidelines */}
//                               {campaign.content_guidelines && (
//                                  <div className="pt-4 border-t border-[var(--color-border)]">
//                                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
//                                        Additional Guidelines
//                                     </p>
//                                     <p className="text-sm leading-relaxed text-[var(--color-text-muted)] whitespace-pre-line">
//                                        {campaign.content_guidelines}
//                                     </p>
//                                  </div>
//                               )}
//                            </div>
//                         </Card>
//                      )}

//                   {/* Example content */}
//                   {examples.length > 0 && (
//                      <div>
//                         <SectionLabel>Reference Content</SectionLabel>
//                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                            {examples.map((m, i) => (
//                               <button
//                                  key={i}
//                                  onClick={() => setActiveVideo(m.url)}
//                                  className="group relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] w-full text-left hover:border-[var(--color-border-strong)] transition-all"
//                                  style={{ aspectRatio: '16/9' }}
//                               >
//                                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10" />
//                                  <div className="absolute inset-0 flex items-center justify-center z-20">
//                                     <div className="h-12 w-12 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-200">
//                                        <Play className="h-5 w-5 text-stone-900 fill-stone-900 ml-0.5" />
//                                     </div>
//                                  </div>
//                                  <p className="absolute bottom-3 left-3 z-20 text-[10px] font-medium text-white/70 truncate right-3">
//                                     Example {i + 1}
//                                  </p>
//                               </button>
//                            ))}
//                         </div>
//                      </div>
//                   )}
//                </div>

//                {/* ── RIGHT sidebar ── */}
//                <div className="space-y-4 lg:sticky lg:top-[calc(var(--navbar-height,64px)+24px)]">

//                   {/* Payout card */}
//                   <div className="rounded-md border border-orange-500/20 bg-[var(--color-surface)] overflow-hidden">
//                      <div className="p-5 sm:p-6">
//                         <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
//                            {campaign.payment_model === 'fixed_per_content' ? 'Fixed Reward' : 'Earn per 1K views'}
//                         </p>
//                         <div className="flex items-baseline gap-2 mb-4">
//                            <span className="text-4xl font-bold text-orange-500 tabular-nums tracking-tight">
//                               {payRate}
//                            </span>
//                            <span className="text-sm text-[var(--color-text-muted)]">{payLabel}</span>
//                         </div>

//                         {campaign.max_payout_per_sub && (
//                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] mb-4">
//                               <Info className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
//                               <p className="text-xs text-[var(--color-text-muted)]">
//                                  Cap: <span className="font-semibold text-[var(--color-text-primary)]">
//                                     {formatMoney(campaign.max_payout_per_sub, 'USD')}
//                                  </span> per submission
//                               </p>
//                            </div>
//                         )}

//                         {isActive ? (
//                            <Link
//                               href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
//                               className="flex items-center justify-center gap-2 w-full py-3 rounded-md text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all active:scale-[0.98]"
//                            >
//                               {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
//                               <ArrowUpRight className="h-4 w-4" />
//                            </Link>
//                         ) : (
//                            <div className="w-full py-3 rounded-md text-sm font-semibold text-center uppercase tracking-wider border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
//                               Campaign {campaign.status}
//                            </div>
//                         )}
//                      </div>

//                      {/* Security note */}
//                      <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex items-start gap-2.5">
//                         <Shield className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
//                         <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
//                            Payments held in escrow. Released after content approval and view verification.
//                         </p>
//                      </div>
//                   </div>

//                   {/* Platforms */}
//                   <Card>
//                      <SectionLabel>Allowed Platforms</SectionLabel>
//                      <div className="space-y-2">
//                         {(campaign.allowed_platforms ?? []).map(p => {
//                            const meta = PLATFORM_META[p] ?? { icon: Globe, label: p, color: 'text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] border-[var(--color-border)]' };
//                            const Icon = meta.icon;
//                            return (
//                               <div key={p} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
//                                  <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center border', meta.color.split(' ').slice(1).join(' '))}>
//                                     <Icon className={cn('h-3.5 w-3.5', meta.color.split(' ')[0])} />
//                                  </div>
//                                  <span className="text-sm font-medium text-[var(--color-text-primary)] flex-1">{meta.label}</span>
//                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
//                               </div>
//                            );
//                         })}
//                      </div>

//                      {campaign.requires_face && (
//                         <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/8 mt-3">
//                            <Users className="h-3.5 w-3.5 text-amber-500 shrink-0" />
//                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
//                               Face required in content
//                            </p>
//                         </div>
//                      )}
//                   </Card>

//                   {/* Timeline */}
//                   {(campaign.starts_at || campaign.ends_at) && (
//                      <Card>
//                         <SectionLabel>Timeline</SectionLabel>
//                         <div className="space-y-3">
//                            {campaign.starts_at && (
//                               <div className="flex items-center justify-between">
//                                  <span className="text-xs text-[var(--color-text-muted)]">Starts</span>
//                                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
//                                     {new Date(campaign.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
//                                  </span>
//                               </div>
//                            )}
//                            {campaign.ends_at && (
//                               <>
//                                  <div className="h-px bg-[var(--color-border)]" />
//                                  <div className="flex items-center justify-between">
//                                     <span className="text-xs text-[var(--color-text-muted)]">Ends</span>
//                                     <span className="text-xs font-semibold text-[var(--color-text-primary)]">
//                                        {new Date(campaign.ends_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
//                                     </span>
//                                  </div>
//                               </>
//                            )}

//                            {/* Days remaining */}
//                            {campaign.ends_at && isActive && (() => {
//                               const daysLeft = Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000));
//                               return (
//                                  <div className={cn(
//                                     'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold mt-1',
//                                     daysLeft <= 3
//                                        ? 'border-rose-500/20 bg-rose-500/8 text-rose-500'
//                                        : daysLeft <= 7
//                                           ? 'border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400'
//                                           : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]'
//                                  )}>
//                                     <Clock className="h-3.5 w-3.5 shrink-0" />
//                                     {daysLeft === 0 ? 'Ends today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
//                                  </div>
//                               );
//                            })()}
//                         </div>
//                      </Card>
//                   )}
//                </div>
//             </div >
//          </div >

//          {/* ── Video Modal ── */}
//          < Dialog open={!!activeVideo
//          } onOpenChange={open => !open && setActiveVideo(null)}>
//             <DialogContent className="max-w-4xl p-0 bg-black border-0 overflow-hidden rounded-2xl">
//                <DialogHeader className="sr-only">
//                   <DialogTitle>Video Preview</DialogTitle>
//                </DialogHeader>
//                <div className="relative w-full aspect-video bg-black">
//                   {activeVideo && (
//                      activeVideo.match(/\.(mp4|webm|ogg|mov)$/i) ? (
//                         <video src={activeVideo} controls autoPlay className="w-full h-full" />
//                      ) : (
//                         <iframe
//                            src={getEmbedUrl(activeVideo)}
//                            className="w-full h-full border-0"
//                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                            allowFullScreen
//                         />
//                      )
//                   )}
//                </div>
//             </DialogContent>
//          </Dialog >
//       </>
//    );
// }
'use client';

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
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 mb-3">
         {children}
      </p>
   );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
   return (
      <div className={cn(
         'rounded-2xl border border-zinc-200/80 dark:border-zinc-800',
         'bg-white dark:bg-zinc-900 p-4 sm:p-5',
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
            'border-orange-200 dark:border-orange-500/25',
            'bg-orange-50 dark:bg-orange-500/10',
            'text-orange-700 dark:text-orange-400',
            'hover:bg-orange-100 dark:hover:bg-orange-500/20 active:scale-95',
         )}
      >
         {display}
         {copied
            ? <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            : <Copy className="h-3 w-3 opacity-40 shrink-0" />}
      </button>
   );
}

function KeywordChip({ children }: { children: React.ReactNode }) {
   return (
      <span className={cn(
         'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
         'text-[11px] font-semibold border',
         'border-emerald-200 dark:border-emerald-500/25',
         'bg-emerald-50 dark:bg-emerald-500/10',
         'text-emerald-700 dark:text-emerald-400',
      )}>
         <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
         {children}
      </span>
   );
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, colorClass }: {
   label: string; value: string; sub: string; colorClass: string;
}) {
   return (
      <div className="rounded-md border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 sm:p-4 flex flex-col gap-1.5">
         <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 leading-none">
            {label}
         </p>
         <p className={cn('text-[19px] sm:text-[22px] font-bold tabular-nums leading-none tracking-tight', colorClass)}>
            {value}
         </p>
         <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed">{sub}</p>
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
         <circle cx="320" cy="0" r="200" stroke="#fd5000" strokeWidth="0.75" />
         <circle cx="320" cy="0" r="140" stroke="#fd5000" strokeWidth="0.75" />
         <circle cx="320" cy="0" r="80" stroke="#fd5000" strokeWidth="0.75" />
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
      /* lg:hidden keeps it off desktop; safe-area handles iPhone home bar */
      <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
         <div className={cn(
            'bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl',
            'border-t border-zinc-200 dark:border-zinc-800',
            'px-4 pt-3',
            /* respect iOS home indicator */
            'pb-[max(12px,env(safe-area-inset-bottom))]',
            'flex items-center gap-3',
         )}>
            {/* Compact payout hint */}
            <div className="flex flex-col shrink-0">
               <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 leading-none mb-0.5">Earn</span>
               <span className="text-[17px] font-bold text-orange-500 tabular-nums leading-none">{payRate}</span>
               <span className="text-[9px] text-zinc-400 leading-none mt-0.5">{payLabel}</span>
            </div>

            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

            {isActive ? (
               <Link
                  href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                  className={cn(
                     'flex-1 flex items-center justify-center gap-2',
                     'h-12 rounded-2xl text-sm font-bold text-white',
                     'bg-orange-500 active:bg-orange-600',
                     'shadow-[0_4px_20px_rgba(249,115,22,0.35)]',
                     'active:scale-[0.98] transition-transform touch-manipulation',
                  )}
               >
                  {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
               </Link>
            ) : (
               <div className={cn(
                  'flex-1 flex items-center justify-center h-12 rounded-2xl',
                  'text-sm font-bold text-zinc-400',
                  'border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800',
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
         <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-[2.5px] border-orange-500 border-t-transparent animate-spin" />
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Loading</p>
         </div>
      </div>
   );

   /* ── Not found ── */
   if (!campaign) return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-zinc-50 dark:bg-zinc-950 px-4 text-center">
         <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-zinc-400" />
         </div>
         <div>
            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">Campaign not found</p>
            <p className="text-sm text-zinc-400">This campaign may have ended or been removed.</p>
         </div>
         <Link
            href="/ugc"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
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
         ? 'border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
         : daysLeft <= 7
            ? 'border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'
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
         <div className="min-h-screen pb-28 lg:pb-14 bg-zinc-50 dark:bg-zinc-950">

            {/* ════════════ HERO ════════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-white dark:bg-zinc-900">

               {/* Low-opacity banner texture */}
               {banner && (
                  <div className="absolute inset-0">
                     <Image
                        src={banner} alt="" fill priority
                        className="object-cover opacity-[0.07] dark:opacity-[0.05]"
                     />
                  </div>
               )}

               {/* Gradient wash */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white dark:via-zinc-900/70 dark:to-zinc-900 pointer-events-none" />
               <div className="absolute inset-0 bg-gradient-to-r from-white/90 dark:from-zinc-900/90 via-transparent to-transparent pointer-events-none" />

               {/* ── Concentric rings — top-right corner of hero ── */}
               <RingDecoration className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 opacity-[0.09] dark:opacity-[0.06]" />

               <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">

                  {/* Back nav */}
                  <div className="pt-4 sm:pt-5 pb-5 sm:pb-7">
                     <Link
                        href="/ugc"
                        className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors group w-fit"
                     >
                        <span className={cn(
                           'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
                           'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
                           'group-hover:border-zinc-300 dark:group-hover:border-zinc-700',
                        )}>
                           <ArrowLeft className="h-3.5 w-3.5" />
                        </span>
                        Campaigns
                     </Link>
                  </div>

                  {/* Hero content */}
                  <div className="pb-7 sm:pb-9 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">

                     {/* Logo + title */}
                     <div className="flex items-end gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Brand logo */}
                        <div className="relative shrink-0">
                           <div className="absolute -inset-2 rounded-[18px] bg-orange-500/20 blur-xl" />
                           {campaign.vendor?.business_logo ? (
                              <img
                                 src={campaign.vendor.business_logo}
                                 alt={campaign.vendor?.business_name ?? ''}
                                 className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-lg"
                              />
                           ) : (
                              <div className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                                 {campaign.vendor?.business_name?.[0] ?? 'B'}
                              </div>
                           )}
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                           {/* Badges */}
                           <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className={cn(
                                 'inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border',
                                 isActive
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500',
                              )}>
                                 {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                 {campaign.status}
                              </span>
                              <span className={cn(
                                 'inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border',
                                 isUGC
                                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/25 text-orange-700 dark:text-orange-400'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400',
                              )}>
                                 <Zap className="h-2.5 w-2.5" />
                                 {campaign.campaign_type}
                              </span>
                           </div>

                           <h1 className="text-[19px] sm:text-[28px] lg:text-[32px] font-bold text-zinc-900 dark:text-white leading-tight tracking-tight line-clamp-2">
                              {campaign.title}
                           </h1>

                           <p className="text-[11px] sm:text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
                              by{' '}
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                 {campaign.vendor?.business_name}
                              </span>
                              <CheckCircle className="h-3 w-3 text-blue-500 fill-blue-100 dark:fill-blue-500/20 shrink-0" />
                           </p>
                        </div>
                     </div>

                     {/* Desktop action row */}
                     <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <button
                           onClick={shareUrl}
                           title="Share"
                           className={cn(
                              'h-10 w-10 rounded-md flex items-center justify-center transition-all',
                              'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
                              'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
                              'hover:border-zinc-300 dark:hover:border-zinc-700',
                           )}
                        >
                           {shared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                        </button>

                        {isActive ? (
                           <Link
                              href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}

                              className={cn(
                                 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                 'bg-orange-500 shadow-[0_4px_16px_rgba(249,115,22,0.3)]',
                                 'group-hover:bg-orange-600 group-hover:gap-3'
                              )}
                           >
                              {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                              <ArrowUpRight className="h-4 w-4" />
                           </Link>
                        ) : (
                           <div className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
                              Unavailable
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* ════════════ BODY ════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5 sm:gap-6 items-start">

               {/* ── LEFT column ── */}
               <div className="space-y-4 sm:space-y-5 min-w-0">

                  {/* Stats grid — 2×2 on mobile, single row on sm+ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                     <StatCard label="Payout" colorClass="text-orange-500" value={payRate} sub={payLabel} />
                     <StatCard label="Total Budget" colorClass="text-violet-500" value={formatMoney(campaign.total_budget, 'USD')} sub="campaign cap" />
                     <StatCard label="Submissions" colorClass="text-emerald-500" value={String(campaign.submission_count ?? 0)} sub="total joined" />
                     <StatCard label="Approved" colorClass="text-sky-500" value={String(campaign.approved_count ?? 0)} sub="content pieces" />
                  </div>

                  {/* About */}
                  <Card>
                     <SectionLabel>About this Campaign</SectionLabel>
                     <p className="text-sm leading-[1.8] text-zinc-500 dark:text-zinc-400 whitespace-pre-line">
                        {campaign.description}
                     </p>
                  </Card>

                  {/* Budget progress */}
                  <Card>
                     <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                           <SectionLabel>Budget Usage</SectionLabel>
                           <p className="text-[20px] sm:text-[22px] font-bold text-zinc-900 dark:text-white tabular-nums leading-none">
                              {Math.round(budgetPct)}%
                              <span className="text-sm font-semibold text-zinc-400 ml-2">allocated</span>
                           </p>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">Remaining</p>
                           <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
                              {formatMoney(campaign.total_budget - (campaign.spent_budget ?? 0), 'USD')}
                           </p>
                        </div>
                     </div>
                     <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                           className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700"
                           style={{ width: `${budgetPct}%` }}
                        />
                     </div>
                     <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-zinc-400 tabular-nums">
                           {formatMoney(campaign.spent_budget ?? 0, 'USD')} spent
                        </p>
                        <p className="text-[10px] text-zinc-400 tabular-nums">
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
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Duration</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                       <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                       {campaign.min_duration ?? 0}s – {campaign.max_duration ?? '∞'}s
                                    </div>
                                 </div>
                              )}

                              {campaign.campaign_type === 'music_clipping' && campaign.music_track_url && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Required Audio</p>
                                    <a
                                       href={campaign.music_track_url}
                                       target="_blank" rel="noreferrer"
                                       className="flex items-center gap-3 p-3 sm:p-3.5 rounded-md border border-orange-200 dark:border-orange-500/25 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15 transition-colors group"
                                    >
                                       <div className="h-9 w-9 rounded-md bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                                          <Music className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Listen to Track</p>
                                          <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                                             {campaign.music_artist_name || 'Original Audio'}
                                          </p>
                                       </div>
                                       <ArrowUpRight className="h-4 w-4 text-zinc-400 shrink-0 group-hover:text-orange-500 transition-colors" />
                                    </a>
                                 </div>
                              )}

                              {campaign.campaign_type === 'promotion' && campaign.promotion_target && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Promotion Target</p>
                                    <a
                                       href={campaign.promotion_target_url || '#'}
                                       target="_blank" rel="noreferrer"
                                       className="flex items-center gap-3 p-3 sm:p-3.5 rounded-md border border-indigo-200 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-colors group"
                                    >
                                       <div className="h-9 w-9 rounded-md bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                                          <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{campaign.promotion_target}</p>
                                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">View target</p>
                                       </div>
                                       <ArrowUpRight className="h-4 w-4 text-zinc-400 shrink-0 group-hover:text-indigo-500 transition-colors" />
                                    </a>
                                 </div>
                              )}

                              {(campaign.required_hashtags?.length ?? 0) > 0 && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">
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
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Tag These Accounts</p>
                                    <div className="flex flex-wrap gap-2">
                                       {campaign.required_mentions.map((m, i) => (
                                          <CopyChip key={i} text={`@${m.replace(/^@/, '')}`} display={`@${m.replace(/^@/, '')}`} />
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {(campaign.required_keywords?.length ?? 0) > 0 && (
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Keywords to Include</p>
                                    <div className="flex flex-wrap gap-2">
                                       {campaign.required_keywords.map((k, i) => (
                                          <KeywordChip key={i}>{k}</KeywordChip>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {campaign.content_guidelines && (
                                 <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2">Additional Guidelines</p>
                                    <p className="text-sm leading-[1.8] text-zinc-500 dark:text-zinc-400 whitespace-pre-line">
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
                                 className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 w-full text-left hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all touch-manipulation"
                                 style={{ aspectRatio: '16/9' }}
                                 aria-label={`Play example video ${i + 1}`}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                                 <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform duration-200">
                                       <Play className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-900 fill-zinc-900 ml-0.5" />
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
                  <div className="relative rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-white dark:bg-zinc-900 overflow-hidden">
                     {/* Rings inside payout card */}
                     <RingDecoration className="absolute top-0 right-0 w-40 h-40 sm:w-44 sm:h-44 opacity-[0.08] dark:opacity-[0.05]" />

                     <div className="relative z-10 p-4 sm:p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-1.5">
                           {campaign.payment_model === 'fixed_per_content' ? 'Fixed Reward' : 'Performance Pay'}
                        </p>
                        <div className="flex items-baseline gap-2 mb-0.5">
                           <span className="text-[32px] sm:text-[38px] font-bold text-orange-500 tabular-nums tracking-tight leading-none">
                              {payRate}
                           </span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-4 sm:mb-5">{payLabel}</p>

                        {campaign.max_payout_per_sub && (
                           <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 mb-4">
                              <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-zinc-500">
                                 Capped at{' '}
                                 <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                                    {formatMoney(campaign.max_payout_per_sub, 'USD')}
                                 </span>
                                 {' '}per submission
                              </p>
                           </div>
                        )}

                        {/* Sidebar CTA — only rendered on lg (sidebar layout); sm uses the sticky bar */}
                        <div className="hidden lg:block">
                           {isActive ? (
                              <Link
                                 href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                                 className={cn(
                                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                    'bg-orange-500 shadow-[0_4px_16px_rgba(249,115,22,0.3)]',
                                    'group-hover:bg-orange-600 group-hover:gap-3'
                                 )}
                              >
                                 {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                                 <ArrowUpRight className="h-4 w-4" />
                              </Link>
                           ) : (
                              <div className="flex items-center justify-center w-full h-12 rounded-2xl text-sm font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                                 Campaign {campaign.status}
                              </div>
                           )}
                        </div>

                        {/* Tablet CTA (sm..lg): sidebar renders but sticky bar is also present — show CTA here too */}
                        <div className="sm:block lg:hidden">
                           {isActive ? (
                              <Link
                                 href={isJoined ? `/dashboard/ugc/${id}` : `/dashboard/ugc/${id}/join`}
                                 className={cn(
                                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                                    'bg-orange-500 shadow-[0_4px_16px_rgba(249,115,22,0.3)]',
                                    'group-hover:bg-orange-600 group-hover:gap-3'
                                 )}
                              >
                                 {isJoined ? 'Go to Dashboard' : 'Join Campaign'}
                                 <ArrowUpRight className="h-4 w-4" />
                              </Link>
                           ) : (
                              <div className="flex items-center justify-center w-full h-12 rounded-2xl text-sm font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
                                 Campaign {campaign.status}
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Escrow strip */}
                     <div className="relative z-10 px-4 sm:px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex items-start gap-2.5">
                        <Shield className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
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
                              bg: 'bg-zinc-100 dark:bg-zinc-800',
                              text: 'text-zinc-500', dot: 'bg-zinc-400',
                           };
                           const Icon = meta.icon;
                           return (
                              <div
                                 key={p}
                                 className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40"
                              >
                                 <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', meta.bg)}>
                                    <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                                 </div>
                                 <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-1">{meta.label}</span>
                                 <span className={cn('h-2 w-2 rounded-full shrink-0', meta.dot)} />
                              </div>
                           );
                        })}
                     </div>

                     {campaign.requires_face && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 mt-3">
                           <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                           <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
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
                                 <span className="text-xs text-zinc-400">Starts</span>
                                 <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                                    {new Date(campaign.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </span>
                              </div>
                           )}
                           {campaign.ends_at && (
                              <>
                                 {campaign.starts_at && <div className="h-px bg-zinc-100 dark:bg-zinc-800" />}
                                 <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-zinc-400">Ends</span>
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
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
                        'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
                        'text-sm font-semibold text-zinc-500',
                        'hover:text-zinc-700 dark:hover:text-zinc-300',
                        'hover:border-zinc-300 dark:hover:border-zinc-700 transition-all',
                     )}
                  >
                     {shared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
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