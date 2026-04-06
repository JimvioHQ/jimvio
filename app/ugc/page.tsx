'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { UGCCampaign } from '@/types/ugc';
import { 
  Search, Filter, TrendingUp, Users, 
  ChevronRight, Sparkles, Youtube, 
  Instagram, Share2, Play, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, timeAgo as formatTimeAgo } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';

const PLATFORM_ICONS: Record<string, any> = {
  tiktok: Play,
  instagram: Instagram,
  youtube: Youtube,
  x: Share2,
};

function CampaignCard({ c }: { c: UGCCampaign }) {
  const { formatMoney } = useCurrency();
  const budgetPct = Math.min(100, ((c.spent_budget ?? 0) / (c.total_budget || 1)) * 100);
  const timeStr = formatTimeAgo(c.created_at);

  return (
    <Link
      href={`/ugc/${c.id}`}
      className="group flex flex-col rounded-3xl bg-white border border-zinc-100/80 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-500 overflow-hidden"
    >
      {/* Visual Header */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* Fallback pattern / background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
        {c.media?.[0]?.url && (
          <img 
            src={c.media[0].url} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            alt={c.title}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Brand Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {c.vendor?.business_logo ? (
              <img src={c.vendor.business_logo} className="w-5 h-5 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-black text-white">
                {c.vendor?.business_name?.[0] ?? 'B'}
              </div>
            )}
            <span className="text-[10px] font-black text-white truncate max-w-[80px]">
              {c.vendor?.business_name ?? 'Brand'}
            </span>
            <CheckCircle className="h-2.5 w-2.5 text-blue-400 fill-blue-400" />
            <span className="text-[9px] font-bold text-white/60 ml-0.5">{timeStr}</span>
          </div>
          
          <div className="flex gap-1">
            {(c.allowed_platforms ?? []).map((p) => {
              const Icon = PLATFORM_ICONS[p] || Share2;
              return (
                <div key={p} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
                  <Icon className="h-3.5 w-3.5" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-black text-lg leading-tight tracking-tight drop-shadow-md">
            {c.title}
          </h3>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Earnings / Goal</p>
            <p className="text-[13px] font-black text-zinc-900">
              {formatMoney(c.spent_budget || 0, "RWF")} / {formatMoney(c.total_budget, "RWF")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 border border-orange-100">
            <TrendingUp className="h-3 w-3 text-orange-600" />
            <span className="text-[11px] font-black text-orange-700">{c.submission_count}</span>
            <span className="text-[11px] font-bold text-orange-500">creators</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progress</span>
              <span className="text-[10px] font-black text-zinc-900">{Math.round(budgetPct)}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out" 
                style={{ width: `${budgetPct}%` }} 
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
             <span className="block text-[13px] font-black text-zinc-900 leading-none">
               {formatMoney(c.rate_per_1k_views, "RWF")}
             </span>
             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">/ 1K views</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function UGCBrowserPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<UGCCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'clipping' | 'ugc'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const LIMIT = 12;

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
    <div className="min-h-screen bg-zinc-50/30 pb-20">
      {/* ── TOP NAV / SEARCH ── */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-full max-w-lg group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
             <input 
               type="text" 
               placeholder="Search campaigns and creators..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full h-12 pl-11 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-200 transition-all font-medium text-sm text-zinc-900 outline-none"
             />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all text-sm font-black">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <div className="h-6 w-px bg-zinc-200 mx-2 hidden md:block" />
            
            {(['all', 'clipping', 'ugc'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-black transition-all border shrink-0",
                  filter === f 
                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                    : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                {f === 'all' ? 'All' : f === 'clipping' ? 'Clipping' : 'UGC'}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-2">
              {[Youtube, Play, Instagram, Share2].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-orange-500 hover:border-orange-200 transition-all flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10 space-y-12">
        {/* ── FEATURED SECTION ── */}
        {!loading && featuredCampaign && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500 fill-orange-500" /> Featured Rewards
              </h2>
            </div>
            
            <div className="relative w-full aspect-[21/9] rounded-[40px] overflow-hidden group border border-zinc-100 shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 to-zinc-900/10 z-10" />
               <img 
                 src={featuredCampaign.media?.[0]?.url || "/hero-bg.png"} 
                 className="absolute inset-0 w-full h-full object-cover" 
                 alt=""
               />
               
               <div className="relative z-20 h-full p-8 md:p-16 flex flex-col justify-end gap-6 max-w-2xl">
                 <div className="flex items-center gap-3">
                    <img src={featuredCampaign.vendor?.business_logo || "/hero-bg.png"} className="w-12 h-12 rounded-2xl border-2 border-white/20 object-cover" alt="" />
                    <p className="text-white/80 font-black uppercase tracking-[0.2em] text-[10px] drop-shadow-sm">Powered by {featuredCampaign.vendor?.business_name}</p>
                 </div>
                 
                 <h2 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight drop-shadow-xl">
                   {featuredCampaign.title}
                 </h2>
                 
                 <div className="flex flex-wrap items-center gap-6">
                    <div className="text-white">
                       <span className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Payout Rate</span>
                       <span className="text-2xl font-black">{formatMoney(featuredCampaign.rate_per_1k_views, "RWF")} / 1K views</span>
                    </div>
                    <div className="text-white">
                       <span className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Campaign Budget</span>
                       <span className="text-2xl font-black">{formatMoney(featuredCampaign.total_budget, "RWF")}</span>
                    </div>
                 </div>

                 <Button asChild size="lg" className="w-fit h-14 px-10 rounded-2xl bg-white text-zinc-900 hover:bg-zinc-50 border-none font-black text-base shadow-2xl active:scale-95 transition-all">
                   <Link href={`/ugc/${featuredCampaign.id}`}>Join Campaign →</Link>
                 </Button>
               </div>
            </div>
          </section>
        )}

        {/* ── CAMPAIGNS GRID ── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
              All Campaigns <span className="text-zinc-300 font-bold ml-1">{total}</span>
            </h2>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="aspect-[16/20] rounded-3xl bg-white animate-pulse" />
               ))}
             </div>
          ) : campaigns.length === 0 ? (
             <div className="py-32 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                   <Search className="h-8 w-8 text-zinc-300" />
                </div>
                <div>
                   <p className="text-xl font-black text-zinc-900">No campaigns found</p>
                   <p className="text-sm font-medium text-zinc-500">Try adjusting your filters or search terms.</p>
                </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-10">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-12 px-6 rounded-2xl font-black border-zinc-100 hover:bg-white"
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "w-10 h-10 rounded-xl font-black text-sm transition-all",
                      page === i + 1 
                        ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/10" 
                        : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-12 px-6 rounded-2xl font-black border-zinc-100 hover:bg-white"
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
