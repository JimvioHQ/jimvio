"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ArrowLeft, ShoppingCart, ExternalLink, Zap, ArrowRight, ShieldCheck, TrendingUp, DollarSign, MousePointer, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

type ProductInfo = { id?: string; name?: string; slug?: string; price?: number; currency?: string | null; images?: string[] };

export default function AffiliatePromotedProductsPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<{ id: string } | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: aff } = await supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);
      if (aff) {
        const { data } = await supabase
          .from("affiliate_links")
          .select(`
            id, commission_rate, total_clicks, total_conversions, total_earnings,
            products ( id, name, slug, price, currency, images )
          `)
          .eq("affiliate_id", aff.id)
          .order("total_clicks", { ascending: false });
        setRows(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (!loading && !affiliate) {
    router.replace("/dashboard/roles");
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-black text-stone-400 uppercase tracking-widest">Redirecting to setup…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-sm scale-150 animate-pulse" />
          <div className="relative w-24 h-24 rounded-sm bg-white dark:bg-surface border border-white shadow-none flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
            <Package className="h-10 w-10 text-stone-900 dark:text-white" />
          </div>
        </div>
        <div className="text-center space-y-3">
           <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Affiliate Marketplace</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing Promoted Inventory</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-700 pb-24 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(251,146,60,0.05) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="orange" position="bottom-left" />

      <div className="max-w-[1440px] mx-auto space-y-12 px-8 pt-12 relative z-10">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none hover:bg-stone-50 dark:bg-surface/50 active:scale-95 transition-all text-stone-600 h-14 w-14">
                <Link href="/dashboard/affiliate/analytics"><ArrowLeft className="h-6 w-6" /></Link>
              </Button>
              <div className="space-y-2">
                 <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter">Promoted Products</h1>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em]">Performance and Attribution History</p>
              </div>
           </div>
           
           <Button asChild className="h-14 px-8 rounded-sm bg-orange-500 text-white shadow-none font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-orange-600 border-none">
              <Link href="/marketplace"><Zap className="h-4 w-4 mr-3" /> Find More Products</Link>
           </Button>
        </div>

        {/* Assets Registry Protocol */}
        <GlassCard className="rounded-sm border-white bg-white dark:bg-surface/60 shadow-none overflow-hidden">
           <div className="p-10 border-b border-stone-100 dark:border-border flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Inventory Performance</h3>
                 <p className="text-[11px] font-black uppercase tracking-widest text-stone-400">Detailed performance stats for your affiliate links</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-stone-100" />
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/40">
                    <th className="py-8 pl-10 pr-6 text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Product / Link</th>
                    <th className="py-8 px-6 text-center text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Commission</th>
                    <th className="py-8 px-6 text-right text-[11px) font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Clicks</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-stone-400 border-b border-stone-100 dark:border-border">Sales</th>
                    <th className="py-8 px-6 text-right text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 border-b border-stone-100 dark:border-border">Earnings</th>
                    <th className="py-8 pr-10 border-b border-stone-100 dark:border-border" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-24 text-center space-y-6">
                          <div className="w-24 h-24 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-6 border border-white shadow-none">
                             <Package className="h-10 w-10 text-stone-100" />
                          </div>
                          <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tighter">No Promoted Items Yet</p>
                          <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">System will start tracking performance once your affiliate links get clicks.</p>
                       </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const product = r.products as ProductInfo | null;
                      const price = Number(product?.price ?? 0);
                      const rate = Number(r.commission_rate ?? 0);
                      const perSale = price * (rate / 100);
                      const hasProduct = product?.name != null;
                      const imgSrc = product && Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
                      
                      return (
                        <tr key={r.id as string} className="hover:bg-white dark:bg-surface/80 transition-all duration-500 group">
                          <td className="py-10 pl-10 pr-6">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 shrink-0 rounded-sm bg-white dark:bg-surface border border-white shadow-none overflow-hidden flex items-center justify-center transition-transform group-hover:scale-110 duration-700">
                                {imgSrc ? (
                                  <img src={imgSrc} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                ) : (
                                  <ShoppingCart className="h-8 w-8 text-stone-100" />
                                )}
                              </div>
                              <div className="min-w-0 space-y-1.5">
                                {hasProduct ? (
                                  <>
                                    <Link
                                      href={`/marketplace/${product?.slug ?? ""}`}
                                      className="font-black text-xl text-stone-900 dark:text-white hover:text-orange-500 transition-colors truncate block tracking-tighter"
                                    >
                                      {product?.name}
                                    </Link>
                                    <div className="flex items-center gap-3">
                                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
                                          ID: {product?.slug}
                                       </span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-lg font-black text-stone-300 italic tracking-tighter">Custom Direct Link</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-10 px-6 text-center">
                            <div className="space-y-1">
                               <GlassPill color="orange" className="font-black text-[11px] px-4 py-2 border-white shadow-none">{rate}% Share</GlassPill>
                               <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-2">{formatMoney(perSale, "USD")} / Sale</p>
                            </div>
                          </td>
                          <td className="py-10 px-6 text-right">
                             <p className="text-2xl font-black text-stone-900 dark:text-white tabular-nums tracking-tighter">{(r.total_clicks as number) ?? 0}</p>
                             <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Total Clicks</p>
                          </td>
                          <td className="py-10 px-6 text-right">
                             <p className="text-2xl font-black text-stone-900 dark:text-white tabular-nums tracking-tighter">{(r.total_conversions as number) ?? 0}</p>
                             <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mt-1">Total Sales</p>
                          </td>
                          <td className="py-10 px-6 text-right">
                             <p className="text-3xl font-black text-emerald-500 tabular-nums tracking-tighter">{formatMoney(Number(r.total_earnings ?? 0), "USD")}</p>
                             <p className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest mt-1">Total Earned</p>
                          </td>
                          <td className="py-10 pr-10 text-right">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-sm bg-white dark:bg-surface border border-transparent shadow-none text-stone-400 hover:bg-stone-900 hover:text-white transition-all active:scale-90" asChild>
                              <Link href={`/marketplace/${product?.slug ?? ""}`} target="_blank">
                                <ArrowRight className="h-5 w-5" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
           </div>
        </GlassCard>

        {/* Performance Sidebar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
           <GlassCard className="p-10 rounded-sm bg-white dark:bg-surface/60 border-white shadow-none flex flex-col justify-between">
              <TrendingUp className="h-10 w-10 text-sky-500 mb-8" />
              <div>
                 <h4 className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">Sales Velocity</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Track how your shared links perform over time cycles.</p>
              </div>
           </GlassCard>
           <GlassCard className="p-10 rounded-sm bg-white dark:bg-surface/60 border-white shadow-none flex flex-col justify-between">
              <DollarSign className="h-10 w-10 text-emerald-500 mb-8" />
              <div>
                 <h4 className="text-xl font-black text-stone-900 dark:text-white tracking-tighter">Earn More</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Find products with higher commission rates to maximize income.</p>
              </div>
           </GlassCard>
           <GlassCard className="p-10 rounded-sm bg-stone-900 text-white shadow-none flex flex-col justify-between border-none">
              <Zap className="h-10 w-10 text-orange-400 mb-8" />
              <div>
                 <h4 className="text-xl font-black text-white tracking-tighter">Share Often</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">The more you share your customized links, the more you earn.</p>
              </div>
           </GlassCard>
        </div>
      </div>
    </div>
  );
}

