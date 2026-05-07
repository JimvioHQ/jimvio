'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import {
  Search, TrendingUp, Zap, Youtube, Instagram,
  Play, Share2, ArrowUpRight, Sparkles, X,
  SlidersHorizontal, ChevronLeft, ChevronRight as ChevronR,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { SharedCampaignCard } from '@/components/ugc/campaign-card-shared';

const LIMIT = 12;

type FilterType = 'all' | 'clipping' | 'ugc';
type PlatformFilter = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'x';

const TYPE_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'clipping', label: 'Clipping' },
  { value: 'ugc', label: 'UGC' },
];

const PLATFORM_TABS: { value: PlatformFilter; icon: any; label: string }[] = [
  { value: 'youtube', icon: Youtube, label: 'YouTube' },
  { value: 'tiktok', icon: Play, label: 'TikTok' },
  { value: 'instagram', icon: Instagram, label: 'Instagram' },
  { value: 'x', icon: Share2, label: 'X' },
];

export default function UGCBrowserPage() {
  const { formatMoney } = useCurrency();

  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), status: 'active' });
    if (filter !== 'all') params.set('type', filter);
    if (platform !== 'all') params.set('platform', platform);
    if (search) params.set('q', search);
    const res = await fetch(`/api/ugc/campaigns?${params}`);
    if (res.ok) {
      const json = await res.json();
      setCampaigns(json.data ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, filter, platform, search]);

  useEffect(() => { load(); }, [load]);

  /* Debounced search */
  function handleSearchInput(val: string) {
    setInputVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  }

  function clearSearch() {
    setInputVal('');
    setSearch('');
    setPage(1);
    searchRef.current?.focus();
  }

  const totalPages = Math.ceil(total / LIMIT);
  const featuredCampaign = campaigns[0];
  const gridCampaigns = campaigns.slice(1); // skip featured from grid when on page 1
  const showFeatured = !loading && page === 1 && !search && filter === 'all' && platform === 'all' && !!featuredCampaign;
  
  function getPages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* ── Sticky nav ── */}
      <div className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center gap-3">

          {/* Search */}
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search campaigns…"
              value={inputVal}
              onChange={e => handleSearchInput(e.target.value)}
              className={cn(
                'w-full h-10 pl-9 pr-8 rounded-xl border text-sm font-medium',
                'bg-[var(--color-surface)] border-[var(--color-border)]',
                'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                'outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-150'
              )}
            />
            {inputVal && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full">

            {/* Type tabs */}
            <div className="flex items-center gap-0.5 p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
              {TYPE_TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setFilter(t.value); setPage(1); }}
                  className={cn(
                    'px-3.5 h-7 rounded-lg text-xs font-semibold transition-all duration-150',
                    filter === t.value
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)] shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-[var(--color-border)] shrink-0 hidden sm:block" />

            {/* Platform tabs */}
            <div className="flex items-center gap-1 shrink-0">
              {PLATFORM_TABS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => { setPlatform(p => p === value ? 'all' : value); setPage(1); }}
                  title={label}
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-150',
                    platform === value
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Result count */}
            <div className="ml-auto shrink-0 flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{total}</span>
              campaign{total !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Active filter pills strip */}
        {(filter !== 'all' || platform !== 'all' || search) && (
          <div className="max-w-8xl mx-auto px-4 sm:px-6 pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0">
              Filters:
            </span>
            {filter !== 'all' && (
              <button
                onClick={() => { setFilter('all'); setPage(1); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors shrink-0"
              >
                {filter} <X className="h-3 w-3" />
              </button>
            )}
            {platform !== 'all' && (
              <button
                onClick={() => { setPlatform('all'); setPage(1); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors shrink-0"
              >
                {platform} <X className="h-3 w-3" />
              </button>
            )}
            {search && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] transition-colors shrink-0"
              >
                "{search}" <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => { setFilter('all'); setPlatform('all'); clearSearch(); }}
              className="text-[10px] font-semibold text-[var(--color-text-muted)] hover:text-rose-500 transition-colors shrink-0 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-12">

        {/* ── Featured ── */}
        {showFeatured && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Featured Campaign
              </p>
            </div>

            <Link href={`/ugc/${featuredCampaign.id}`} className="group block">
              <div className={cn(
                'relative w-full rounded-2xl overflow-hidden border border-[var(--color-border)]',
                'aspect-[4/3] sm:aspect-[16/8] transition-all duration-300',
                'hover:border-[var(--color-border-strong)] hover:shadow-lg'
              )}>
                {/* Background */}
                <div className="absolute inset-0 bg-[var(--color-surface)]" />
                {featuredCampaign.media?.find(m => m.usage === 'banner')?.url && (
                  <img
                    src={featuredCampaign.media.find(m => m.usage === 'banner')!.url}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-[1.02] transition-all duration-500"
                    alt=""
                  />
                )}
                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/60 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative z-10 h-full p-6 sm:p-10 flex flex-col justify-end sm:justify-center max-w-lg gap-4">

                  {/* Vendor + type */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg overflow-hidden border border-[var(--color-border)] shrink-0">
                      {featuredCampaign.vendor?.business_logo ? (
                        <img src={featuredCampaign.vendor.business_logo} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-orange-500">
                          {featuredCampaign.vendor?.business_name?.[0] ?? 'B'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                      {featuredCampaign.vendor?.business_name}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide bg-orange-500/10 border border-orange-500/20 text-orange-500">
                      <Zap className="h-2.5 w-2.5" />
                      {featuredCampaign.campaign_type ?? 'UGC'}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-bold text-[var(--color-text-primary)] leading-tight tracking-tight">
                    {featuredCampaign.title}
                  </h2>

                  {/* Stats */}
                  <div className="flex items-center gap-5">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                        Payout
                      </p>
                      <p className="text-xl font-bold text-orange-500 tabular-nums">
                        {formatMoney(featuredCampaign.rate_per_1k_views, 'USD')}
                        <span className="text-xs font-medium text-[var(--color-text-muted)] ml-1">/ 1K</span>
                      </p>
                    </div>
                    <div className="h-8 w-px bg-[var(--color-border)]" />
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                        Budget
                      </p>
                      <p className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
                        {formatMoney(featuredCampaign.total_budget, 'USD')}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-[var(--color-border)]" />
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-0.5">
                        Joined
                      </p>
                      <p className="text-xl font-bold text-[var(--color-text-primary)] tabular-nums">
                        {featuredCampaign.submission_count ?? 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                      'bg-orange-500 shadow-[0_4px_16px_rgba(249,115,22,0.3)]',
                      'group-hover:bg-orange-600 group-hover:gap-3'
                    )}>
                      Join Campaign
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                {/* Top-right budget bar */}
                <div className="absolute top-5 right-5 z-10 hidden sm:block">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm px-4 py-3 text-right min-w-[120px]">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                      Budget Used
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{
                          width: `${Math.min(100, ((featuredCampaign.spent_budget ?? 0) / (featuredCampaign.total_budget || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)] tabular-nums">
                      {Math.round(((featuredCampaign.spent_budget ?? 0) / (featuredCampaign.total_budget || 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── All campaigns ── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {search
                ? `Results for "${search}"`
                : filter !== 'all' || platform !== 'all'
                  ? 'Filtered Results'
                  : showFeatured ? 'More Campaigns' : 'All Campaigns'}
            </p>
            {!loading && (
              <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                {total > 0 ? `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} of ${total}` : '0 results'}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] h-[280px] animate-pulse"
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          ) : (showFeatured ? gridCampaigns : campaigns).length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center mx-auto">
                <Search className="h-6 w-6 text-[var(--color-border)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">No campaigns found</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {search ? `No results for "${search}" — try different keywords.` : 'Try changing your filters.'}
                </p>
              </div>
              {(search || filter !== 'all' || platform !== 'all') && (
                <button
                  onClick={() => { setFilter('all'); setPlatform('all'); clearSearch(); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(showFeatured ? gridCampaigns : campaigns).map((c, i) => (
                <div
                  key={c.id}
                  className="animate-in fade-in duration-300"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <SharedCampaignCard c={c as any} />
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-10">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className={cn(
                  'h-9 w-9 rounded-xl border flex items-center justify-center transition-all',
                  'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
                  'hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPages().map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      'h-9 w-9 rounded-xl border text-xs font-semibold transition-all tabular-nums',
                      page === p
                        ? 'bg-orange-500 border-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.25)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className={cn(
                  'h-9 w-9 rounded-xl border flex items-center justify-center transition-all',
                  'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]',
                  'hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
              >
                <ChevronR className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}