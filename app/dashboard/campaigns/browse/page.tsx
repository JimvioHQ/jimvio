"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Zap, Eye, DollarSign, Loader2, TrendingUp, Search, 
  Filter, Play, ShoppingBag, ArrowRight, ShieldCheck,
  Video, Star, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

export default function InfluencerBrowseCampaignsPage() {
  const { formatMoney } = useCurrency();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("influencer_campaigns")
        .select(`
          *, 
          vendors ( business_name, business_slug, rating ),
          products ( name, slug, images, price, currency, affiliate_commission_rate )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      setCampaigns(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = campaigns.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.vendors?.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.products?.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-12"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.07) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.07) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6 pt-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-3">
             <div className="p-2 rounded-sm bg-white dark:bg-surface/60 border border-white/80 shadow-none shrink-0">
               <Zap className="h-6 w-6 text-orange-500" />
             </div>
             Campaign Marketplace
          </h1>
          <p className="text-[12px] font-semibold text-stone-500 mt-1 uppercase tracking-widest pl-14">Discover high-paying campaigns from verified vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input 
              placeholder="Search campaigns..." 
              className="pl-11 pr-4 h-11 w-64 rounded-sm bg-white dark:bg-surface/60 border border-white/80 text-[13px] font-semibold text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-300 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] transition-colors" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-sm bg-white dark:bg-surface border border-stone-200 dark:border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] active:scale-95 transition-all outline-none">
            <Filter className="h-4 w-4 text-stone-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((c) => {
          const product = c.products;
          const vendor = c.vendors;
          const commissionRate = c.commission_rate || product?.affiliate_commission_rate || 5;

          return (
            <GlassCard key={c.id} className="overflow-hidden group p-0 hover:shadow-none transition-shadow duration-300">
              <div className="relative aspect-video">
                <img 
                  src={product?.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60"} 
                  alt={product?.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-white dark:bg-surface/90 backdrop-blur-md px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest text-stone-900 dark:text-white shadow-none border border-white/20">
                    {c.campaign_type === "promotion" ? "Affiliate" : "Sponsorship"}
                  </div>
                  {c.is_featured && (
                    <div className="bg-amber-400 text-amber-950 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest flex items-center shadow-none">
                      <Zap className="h-3 w-3 mr-1 fill-current" /> Featured
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1 flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {vendor?.business_name}</p>
                  <h3 className="text-[16px] font-black leading-tight line-clamp-1 tracking-tight text-white drop-shadow-none">{c.title}</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-5 bg-white dark:bg-surface/40 border border-white/60 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] rounded-sm p-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3 text-emerald-500" /> Commission</p>
                    <p className="text-[20px] font-black text-emerald-600 leading-none">{commissionRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1 flex items-center gap-1 justify-end"><ShoppingBag className="h-3 w-3 text-orange-500" /> Price</p>
                    <p className="text-[18px] font-black text-stone-900 dark:text-white leading-none tabular-nums">{formatMoney(Number(product?.price || 0), product?.currency)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white dark:bg-surface/40 border border-white/80 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] rounded-sm p-4">
                    <div className="flex items-center gap-1.5 text-stone-500 mb-1.5 text-[9px] font-bold uppercase tracking-widest">
                      <Eye className="h-3 w-3 text-sky-500" /> Total Views
                    </div>
                    <p className="text-[16px] font-black text-stone-900 dark:text-white leading-none">{(c.total_views || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white dark:bg-surface/40 border border-white/80 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] rounded-sm p-4">
                    <div className="flex items-center gap-1.5 text-stone-500 mb-1.5 text-[9px] font-bold uppercase tracking-widest">
                      <TrendingUp className="h-3 w-3 text-purple-500" /> Conv. (All)
                    </div>
                    <p className="text-[16px] font-black text-stone-900 dark:text-white leading-none">{c.total_conversions || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 h-12 rounded-sm bg-stone-900 text-white font-bold text-[12px] uppercase tracking-widest shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-95 transition-all hover:bg-stone-800">
                    Apply Now
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-sm bg-white dark:bg-surface border border-stone-200 dark:border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-stone-600 hover:bg-stone-50 dark:bg-surface/50" asChild>
                    <Link href={`/marketplace/${product?.slug}`}>
                      <ExternalLink className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <GlassCard className="text-center py-24 mb-6 border-dashed flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-sm bg-white dark:bg-surface/60 border border-white/80 shadow-[inset_0_1px_4px_rgba(255,255,255,1)] flex items-center justify-center mb-5">
            <Zap className="h-10 w-10 text-stone-300" />
          </div>
          <h3 className="text-[20px] font-black text-stone-900 dark:text-white tracking-tight">No campaigns found</h3>
          <p className="text-[12px] font-semibold text-stone-500 uppercase tracking-widest mt-2">Try adjusting your search or check back later.</p>
        </GlassCard>
      )}
      </div>
    </div>
  );
}

