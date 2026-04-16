'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { UGCCampaign } from '@/types/ugc';
import {
  Search, Filter, TrendingUp, Zap,
  Youtube, Instagram, Share2, Play,
  ChevronRight, Sparkles, ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { SharedCampaignCard } from '@/components/ugc/campaign-card-shared';

const LIMIT = 12;

export default function UGCBrowserPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'clipping' | 'ugc'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      status: 'active',
    });
    if (filter !== 'all') params.set('type', filter);
    if (search) params.set('q', search);
    const res = await fetch(`/api/ugc/campaigns?${params}`);
    if (res.ok) {
      const json = await res.json();
      setCampaigns(json.data ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);
  const featuredCampaign = campaigns[0];

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ══════════════════════════════════
          STICKY TOP NAV
      ══════════════════════════════════ */}
      <div className="sticky top-0 z-30 border-b bg-surface/85 backdrop-blur-[20px] border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative w-full max-w-sm group flex-shrink-0">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 transition-colors"
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-9 pr-4 text-sm font-medium text-stone-900 dark:text-white outline-none transition-all bg-stone-50 dark:bg-zinc-900/60 border border-border rounded-xl focus:border-orange-500 focus:bg-surface placeholder:text-stone-400"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            {/* Type tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0 bg-stone-50 dark:bg-zinc-900/60 border border-border">
              {(['all', 'clipping', 'ugc'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", filter === f ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white")}
                >
                  {f === 'all' ? 'All' : f === 'clipping' ? 'Clipping' : 'UGC'}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 hidden md:block bg-stone-200 dark:bg-zinc-800" />

            {/* Platform buttons */}
            {[Youtube, Play, Instagram, Share2].map((Icon, i) => (
              <button
                key={i}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 bg-surface dark:bg-zinc-900 border border-border text-stone-400 shadow-sm hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/30"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}

            {/* Total badge */}
            <div className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-surface dark:bg-zinc-900 text-stone-500 dark:text-stone-400 border border-border shadow-sm">
              {total} campaigns
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10 space-y-14">

        {/* ══════════════════════════════════
            FEATURED HERO
        ══════════════════════════════════ */}
        {!loading && featuredCampaign && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-4 w-4" style={{ color: "#f97316" }} />
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                Featured Campaign
              </h2>
            </div>

            <Link href={`/ugc/${featuredCampaign.id}`} className="group block">
              <div className="relative w-full rounded-2xl md:rounded-[32px] overflow-hidden bg-surface dark:bg-zinc-900 border border-border shadow-xl group aspect-[4/4] sm:aspect-[16/9] md:aspect-[21/7]">
                {/* BG */}
                <div className="absolute inset-0 bg-gradient-to-br from-stone-100 to-stone-200 dark:from-zinc-800 dark:to-zinc-900/50 opacity-10" />
                {featuredCampaign.media?.find((m) => m.usage === "banner")?.url && (
                  <img
                    src={featuredCampaign.media.find((m) => m.usage === "banner")!.url}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:scale-[1.02] transition-transform opacity-70 group-hover:opacity-100"
                    alt=""
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white via-white/90 md:via-white/60 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 md:dark:via-zinc-900/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent hidden md:block" />

                {/* Content */}
                <div className="relative z-10 h-full p-6 md:p-12 flex flex-col justify-end md:justify-center max-w-xl gap-4">
                  {/* Vendor */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-border">
                      {featuredCampaign.vendor?.business_logo ? (
                        <img
                          src={featuredCampaign.vendor.business_logo}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-xs font-black text-white"
                          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
                        >
                          {featuredCampaign.vendor?.business_name?.[0] ?? "B"}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                      {featuredCampaign.vendor?.business_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-600">
                      <Zap className="h-2 w-2 inline mr-0.5" />
                      {featuredCampaign.campaign_type || "UGC"}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl md:text-5xl font-black text-orange-500 dark:text-white leading-[1.1] md:leading-none tracking-tight md:tracking-tighter">
                    {featuredCampaign.title}
                  </h2>

                  {/* Stats */}
                  <div className="flex flex-row flex-wrap items-center gap-4 md:gap-6 mt-2 mb-2">
                    <div>
                      <p className="text-[10px] md:text-[9px] font-bold uppercase tracking-widest mb-1 md:mb-0.5 text-stone-500 dark:text-stone-400">
                        Payout Rate
                      </p>
                      <p className="text-xl md:text-2xl font-black text-orange-500 dark:text-white">
                        {formatMoney(featuredCampaign.rate_per_1k_views, "USD")}
                        <span className="text-xs md:text-sm font-medium ml-1 text-orange-500 dark:text-stone-400">
                          / 1K views
                        </span>
                      </p>
                    </div>
                    <div className="w-px h-8 self-center bg-stone-200 dark:bg-zinc-800 hidden md:block" />
                    <div>
                      <p className="text-[10px] md:text-[9px] font-bold uppercase tracking-widest mb-1 md:mb-0.5 text-stone-500 dark:text-stone-400">
                        Total Budget
                      </p>
                      <p className="text-xl md:text-2xl font-black text-orange-900 dark:text-white">
                        {formatMoney(featuredCampaign.total_budget, "USD")}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div>
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all group-hover:gap-3 bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/40">
                      Join Campaign
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ══════════════════════════════════
            CAMPAIGNS GRID
        ══════════════════════════════════ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
              All Campaigns
            </h2>
          </div>

          {loading ? (
            /* Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl animate-pulse bg-surface dark:bg-zinc-900 border border-border h-[280px]"
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-32 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-surface dark:bg-zinc-900 border border-border">
                <Search className="h-6 w-6 text-stone-300 dark:text-stone-600" />
              </div>
              <div>
                <p className="text-lg font-black text-stone-900 dark:text-white">No campaigns found</p>
                <p className="text-sm mt-1 text-stone-500 dark:text-stone-400">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {campaigns.map((c) => (
                <SharedCampaignCard key={c.id} c={c as any} />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-12">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-10 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 bg-surface dark:bg-zinc-900 border border-border text-stone-600 dark:text-stone-300 shadow-sm hover:bg-stone-50 dark:hover:bg-zinc-800"
              >
                ← Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm",
                      page === i + 1
                        ? "bg-orange-500 text-white border-orange-500/50 shadow-orange-500/30"
                        : "bg-surface dark:bg-zinc-900 text-stone-600 dark:text-stone-400 border-border hover:bg-stone-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-10 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 bg-surface dark:bg-zinc-900 border border-border text-stone-600 dark:text-stone-300 shadow-sm hover:bg-stone-50 dark:hover:bg-zinc-800"
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}