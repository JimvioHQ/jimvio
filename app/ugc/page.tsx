'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import {
  Search, Youtube, Instagram, Play, Share2, ArrowUpRight,
  X, ChevronLeft, ChevronRight as ChevronR, Clapperboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { SharedCampaignCard } from '@/components/ugc/campaign-card-shared';

const SHELL = 'mx-auto w-full max-w-8xl px-4 sm:px-6';
const GRID = 'grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
const LIMIT = 15;

type FilterType = 'all' | 'clipping' | 'ugc';
type PlatformFilter = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'x';

const TYPE_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'clipping', label: 'Clipping' },
  { value: 'ugc', label: 'UGC' },
];

const PLATFORM_TABS: { value: PlatformFilter; icon: typeof Youtube; label: string }[] = [
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

  function resetAll() {
    setFilter('all');
    setPlatform('all');
    clearSearch();
  }

  const totalPages = Math.ceil(total / LIMIT);
  const showSpotlight = !loading && page === 1 && !search && filter === 'all' && platform === 'all' && campaigns.length > 0;
  const spotlight = showSpotlight ? campaigns[0] : null;
  const gridCampaigns = showSpotlight ? campaigns.slice(1) : campaigns;
  const hasFilter = filter !== 'all' || platform !== 'all' || !!search;

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
    <div className="min-h-screen bg-[var(--color-bg)] pb-24">
      {/* Header */}
      <div className={`${SHELL} pt-10 sm:pt-14`}>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-semibold leading-[1.06] tracking-tight text-[var(--color-text-primary)]">
              UGC &amp; clipping campaigns
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              Get paid to create content or clip videos for brands. Rates and budgets are listed upfront — join campaigns that match your platform.
            </p>
          </div>
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)]"
          >
            Launch a campaign
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Sticky filters */}
      <div className="sticky top-[var(--navbar-height,64px)] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className={`${SHELL} py-3`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xs shrink-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search campaigns…"
                value={inputVal}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-8 text-sm text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)]"
              />
              {inputVal && (
                <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex shrink-0 items-center rounded-lg border border-[var(--color-border)] p-0.5">
                {TYPE_TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setFilter(t.value); setPage(1); }}
                    className={cn(
                      'h-7 rounded-md px-3 text-[12px] font-medium transition-colors',
                      filter === t.value
                        ? 'bg-[var(--color-text-primary)] text-[var(--color-bg)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" />

              {PLATFORM_TABS.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => { setPlatform((p) => (p === value ? 'all' : value)); setPage(1); }}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                    platform === value
                      ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}

              <p className="ml-auto shrink-0 text-[12px] text-[var(--color-text-muted)]">
                <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{total}</span> campaigns
              </p>
            </div>
          </div>

          {hasFilter && (
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={resetAll} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`${SHELL} pt-8 space-y-10`}>
        {/* Spotlight */}
        {spotlight && (
          <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[220px] lg:min-h-[280px]">
                {spotlight.media?.find((m) => m.usage === 'banner')?.url ? (
                  <img
                    src={spotlight.media.find((m) => m.usage === 'banner')!.url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--color-accent)]/90" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)]/90 via-[var(--color-bg)]/50 to-transparent" />
              </div>

              <div className="flex flex-col justify-center gap-4 p-5 sm:p-7">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Top campaign right now
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  {spotlight.title}
                </h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {spotlight.vendor?.business_name} · {spotlight.campaign_type ?? 'UGC'}
                </p>

                <div className="flex flex-wrap gap-4 text-[13px]">
                  <div>
                    <p className="text-[var(--color-text-muted)]">Payout</p>
                    <p className="font-bold tabular-nums text-[var(--color-accent)]">
                      {formatMoney(spotlight.rate_per_1k_views, 'USD')}
                      <span className="ml-1 text-[11px] font-normal text-[var(--color-text-muted)]">/ 1K views</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)]">Budget</p>
                    <p className="font-bold tabular-nums text-[var(--color-text-primary)]">
                      {formatMoney(spotlight.total_budget, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)]">Creators</p>
                    <p className="font-bold tabular-nums text-[var(--color-text-primary)]">
                      {spotlight.submission_count ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ugc/${spotlight.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-text-primary)] px-4 text-[13px] font-medium text-[var(--color-bg)]"
                  >
                    View campaign
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/ugc/${spotlight.id}/join`}
                    className="inline-flex h-9 items-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)]"
                  >
                    Join now
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Grid */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--color-text-muted)]">
              {search ? `Results for “${search}”` : showSpotlight ? 'More campaigns' : 'All campaigns'}
            </p>
            {!loading && total > 0 && (
              <p className="text-[12px] tabular-nums text-[var(--color-text-muted)]">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
            )}
          </div>

          {loading ? (
            <div className={GRID}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-[260px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
              ))}
            </div>
          ) : gridCampaigns.length === 0 && !spotlight ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
              <Clapperboard className="mx-auto mb-3 h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="font-medium text-[var(--color-text-primary)]">No campaigns match</p>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">Try different filters or check back later.</p>
              {hasFilter && (
                <button type="button" onClick={resetAll} className="mt-4 text-[13px] font-medium text-[var(--color-accent)] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className={GRID}>
              {gridCampaigns.map((c) => (
                <SharedCampaignCard key={c.id} c={c} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-10">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPages().map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="flex h-9 w-9 items-center justify-center text-xs text-[var(--color-text-muted)]">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors',
                      page === p
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] disabled:opacity-30"
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
