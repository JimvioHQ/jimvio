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
      style={{ background: "#f8f7f5" }}
    >
      {/* ══════════════════════════════════
          STICKY TOP NAV
      ══════════════════════════════════ */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(0,0,0,0.05)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative w-full max-w-sm group flex-shrink-0">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors"
              style={{ color: "rgba(0,0,0,0.3)" }}
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 pl-9 pr-4 text-sm font-medium text-stone-900 outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                color: "rgba(0,0,0,0.9)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = "1px solid rgba(249,115,22,0.4)";
                e.currentTarget.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid rgba(0,0,0,0.08)";
                e.currentTarget.style.background = "rgba(0,0,0,0.03)";
              }}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
            {/* Type tabs */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              {(['all', 'clipping', 'ugc'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1); }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: filter === f ? "rgba(249,115,22,1)" : "transparent",
                    color: filter === f ? "#fff" : "rgba(0,0,0,0.45)",
                    boxShadow: filter === f ? "0 2px 10px rgba(249,115,22,0.3)" : "none",
                  }}
                >
                  {f === 'all' ? 'All' : f === 'clipping' ? 'Clipping' : 'UGC'}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 hidden md:block" style={{ background: "rgba(0,0,0,0.08)" }} />

            {/* Platform buttons */}
            {[Youtube, Play, Instagram, Share2].map((Icon, i) => (
              <button
                key={i}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  color: "rgba(0,0,0,0.4)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(249,115,22,0.07)";
                  e.currentTarget.style.color = "#f97316";
                  e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.color = "rgba(0,0,0,0.4)";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}

            {/* Total badge */}
            <div
              className="ml-auto flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{
                background: "#fff",
                color: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
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
              <h2
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                Featured Campaign
              </h2>
            </div>

            <Link href={`/ugc/${featuredCampaign.id}`} className="group block">
              <div
                className="relative w-full rounded-3xl overflow-hidden bg-white"
                style={{
                  aspectRatio: "21/7",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
                }}
              >
                {/* BG */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)",
                    opacity: 0.1,
                  }}
                />
                {featuredCampaign.media?.find((m) => m.usage === "banner")?.url && (
                  <img
                    src={featuredCampaign.media.find((m) => m.usage === "banner")!.url}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 group-hover:scale-[1.02] transition-transform opacity-70 group-hover:opacity-100"
                    alt=""
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-center max-w-xl gap-4">
                  {/* Vendor */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm"
                      style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                    >
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
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "rgba(0,0,0,0.45)" }}
                    >
                      {featuredCampaign.vendor?.business_name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        background: "rgba(249,115,22,0.1)",
                        border: "1px solid rgba(249,115,22,0.2)",
                        color: "#ea580c",
                      }}
                    >
                      <Zap className="h-2 w-2 inline mr-0.5" />
                      {featuredCampaign.campaign_type || "UGC"}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    className="text-3xl md:text-5xl font-black text-stone-900 leading-none"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {featuredCampaign.title}
                  </h2>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p
                        className="text-[9px] font-bold uppercase tracking-widest mb-0.5"
                        style={{ color: "rgba(0,0,0,0.35)" }}
                      >
                        Payout Rate
                      </p>
                      <p className="text-xl font-black text-stone-900">
                        {formatMoney(featuredCampaign.rate_per_1k_views, "USD")}
                        <span
                          className="text-sm font-medium ml-1"
                          style={{ color: "rgba(0,0,0,0.4)" }}
                        >
                          / 1K views
                        </span>
                      </p>
                    </div>
                    <div
                      className="w-px h-8 self-center"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                    />
                    <div>
                      <p
                        className="text-[9px] font-bold uppercase tracking-widest mb-0.5"
                        style={{ color: "rgba(0,0,0,0.35)" }}
                      >
                        Total Budget
                      </p>
                      <p className="text-xl font-black text-stone-900">
                        {formatMoney(featuredCampaign.total_budget, "USD")}
                      </p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div>
                    <span
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all group-hover:gap-3"
                      style={{
                        background: "linear-gradient(135deg,#f97316,#ea580c)",
                        boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
                      }}
                    >
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
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "rgba(0,0,0,0.4)" }}
            >
              All Campaigns
            </h2>
          </div>

          {loading ? (
            /* Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl animate-pulse"
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.05)",
                    height: 280,
                  }}
                />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-32 text-center space-y-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}
              >
                <Search className="h-6 w-6" style={{ color: "rgba(0,0,0,0.2)" }} />
              </div>
              <div>
                <p className="text-lg font-black text-stone-900">No campaigns found</p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "rgba(0,0,0,0.4)" }}
                >
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
                className="h-10 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "rgba(0,0,0,0.6)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                ← Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background:
                        page === i + 1
                          ? "rgba(249,115,22,1)"
                          : "#fff",
                      color:
                        page === i + 1
                          ? "#fff"
                          : "rgba(0,0,0,0.4)",
                      border:
                        page === i + 1
                          ? "1px solid rgba(249,115,22,0.5)"
                          : "1px solid rgba(0,0,0,0.07)",
                      boxShadow:
                        page === i + 1
                          ? "0 4px 12px rgba(249,115,22,0.3)"
                          : "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-10 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "rgba(0,0,0,0.6)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
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