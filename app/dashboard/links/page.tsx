"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Plus, Copy, TrendingUp, DollarSign, MousePointer, ShoppingCart, ExternalLink, CheckCircle, Search, Trash2, Zap, Target, Activity, Globe, ShieldCheck, ArrowRight, ArrowLeft, Loader2, Layers, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";

type ProductRow = { id: string; name: string; slug: string; price: number; currency?: string | null; affiliate_commission_rate?: number; images?: string[] };

export default function AffiliateLinksPage() {
  const { formatMoney } = useCurrency();
  const router = useRouter();
  const [affiliate, setAffiliate]   = useState<Record<string, unknown> | null>(null);
  const [links, setLinks]           = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newUrl, setNewUrl]         = useState("");
  const [newRate, setNewRate]       = useState("10");
  const [creating, setCreating]     = useState(false);
  const [products, setProducts]     = useState<ProductRow[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      setAffiliate(aff ?? null);

      if (aff) {
        const { data: lnks } = await supabase
          .from("affiliate_links")
          .select(`
            id, link_code, destination_url, full_url, commission_rate, is_active,
            total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
            products ( id, name, slug, price, images )
          `)
          .eq("affiliate_id", aff.id)
          .order("created_at", { ascending: false });
        setLinks(lnks ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!affiliate) return;
    const supabase = createClient();
    const q = supabase
      .from("products")
      .select("id, name, slug, price, currency, affiliate_commission_rate, images")
      .eq("status", "active")
      .eq("is_active", true)
      .eq("affiliate_enabled", true)
      .limit(50);
    q.then(({ data }: { data: ProductRow[] | null }) => setProducts(data ?? []));
  }, [affiliate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Loading Affiliate Hub...</p>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-md w-full p-8 text-center rounded-sm border-white shadow-none bg-white dark:bg-surface/60">
          <div className="w-16 h-16 bg-white dark:bg-surface rounded-sm flex items-center justify-center mx-auto mb-6 border border-stone-100 dark:border-border shadow-none">
             <ShieldCheck className="h-7 w-7 text-stone-300" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-3 tracking-tight">Access Restricted</h2>
          <p className="text-stone-500 text-sm mb-8 leading-relaxed font-medium">Please activate your affiliate account to generate and manage links.</p>
          <Button asChild className="w-full h-12 rounded-sm bg-stone-900 text-white font-bold hover:bg-black active:scale-95 transition-all text-sm shadow-none">
             <Link href="/dashboard/roles">Activate Now</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  async function createLinkFromProduct() {
    if (!affiliate || !selectedProduct) return;
    setCreating(true);
    const supabase = createClient();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const dest = `${base}/marketplace/${selectedProduct.slug}`;
    const refUrl = `${dest}?ref=${affiliate.affiliate_code}`;
    const { data, error } = await supabase.from("affiliate_links").insert({
      affiliate_id:    affiliate.id,
      product_id:      selectedProduct.id,
      destination_url: dest,
      full_url:        refUrl,
      commission_rate: selectedProduct.affiliate_commission_rate ?? (parseFloat(newRate) || 10),
    }).select(`
      id, link_code, destination_url, full_url, commission_rate, is_active,
      total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
      products ( id, name, slug, price, images )
    `).maybeSingle();

    if (!error && data) {
      setLinks(prev => [data, ...prev]);
      setGeneratedUrl((data as { full_url?: string }).full_url ?? refUrl);
      setSelectedProduct(null);
      setProductSearch("");
    }
    setCreating(false);
  }

  async function createLink() {
    if (!affiliate || !newUrl) return;
    setCreating(true);
    const supabase = createClient();
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const refUrl = newUrl.includes("?") ? `${newUrl}&ref=${affiliate.affiliate_code}` : `${newUrl}?ref=${affiliate.affiliate_code}`;
    const { data, error } = await supabase.from("affiliate_links").insert({
      affiliate_id:    affiliate.id,
      destination_url: newUrl,
      full_url:        refUrl,
      commission_rate: parseFloat(newRate) || 10,
    }).select(`
      id, link_code, destination_url, full_url, commission_rate, is_active,
      total_clicks, unique_clicks, total_conversions, total_earnings, created_at,
      products ( id, name, slug, price, images )
    `).maybeSingle();

    if (!error && data) {
      setLinks(prev => [data, ...prev]);
      setNewUrl("");
      setShowNewForm(false);
      setGeneratedUrl(refUrl);
    }
    setCreating(false);
  }

  function copyLink(codeOrUrl: string) {
    const url = codeOrUrl.startsWith("http") ? codeOrUrl : `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${codeOrUrl}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(codeOrUrl);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function deleteLink(id: string) {
    if (!window.confirm("Are you sure you want to delete this link? All tracking data for this link will be lost.")) return;
    
    const supabase = createClient();
    const { error } = await supabase.from("affiliate_links").delete().eq("id", id);
    if (!error) {
      setLinks(prev => prev.filter(l => l.id !== id));
    } else {
      alert("Error deleting link: " + error.message);
    }
  }

  const totalClicks   = links.reduce((s, l) => s + (l.total_clicks as number ?? 0), 0);
  const totalConvs    = links.reduce((s, l) => s + (l.total_conversions as number ?? 0), 0);
  const totalEarnings = links.reduce((s, l) => s + Number(l.total_earnings ?? 0), 0);
  const activeLinks   = links.filter(l => l.is_active !== false).length;
  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.slug.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.04) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.04) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none hover:bg-white dark:bg-surface active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="space-y-1">
                 <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Affiliate Program</h1>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Share links and earn commissions</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4 px-5 py-2.5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">My Code:</span>
              <code className="text-[13px] font-black text-orange-600 tracking-wider uppercase">{String(affiliate?.affiliate_code ?? "NONE")}</code>
              <button 
               onClick={() => copyLink(String(affiliate?.affiliate_code ?? ""))}
               className="p-1 rounded-sm hover:bg-stone-50 dark:bg-surface/50 transition-all text-stone-300 hover:text-orange-500"
              >
                 {copied === affiliate?.affiliate_code ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
           </div>
        </div>

        {/* Stats Grid - Smaller */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="p-5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none flex flex-col justify-between h-32 transition-all hover:shadow-none group">
              <div className="h-9 w-9 rounded-sm bg-sky-50 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                 <MousePointer className="h-5 w-5" />
              </div>
              <div className="mt-4">
                 <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{totalClicks.toLocaleString()}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Clicks</p>
              </div>
           </div>
           <div className="p-5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none flex flex-col justify-between h-32 transition-all hover:shadow-none group">
              <div className="h-9 w-9 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                 <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="mt-4">
                 <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{totalConvs.toLocaleString()}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sales</p>
              </div>
           </div>
           <div className="p-5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none flex flex-col justify-between h-32 transition-all hover:shadow-none group">
              <div className="h-9 w-9 rounded-sm bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                 <DollarSign className="h-5 w-5" />
              </div>
              <div className="mt-4">
                 <p className="text-2xl font-black text-emerald-600 tracking-tight tabular-nums">{formatMoney(totalEarnings, "USD")}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Profits</p>
              </div>
           </div>
           <div className="p-5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none flex flex-col justify-between h-32 transition-all hover:shadow-none group">
              <div className="h-9 w-9 rounded-sm bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                 <Link2 className="h-5 w-5" />
              </div>
              <div className="mt-4">
                 <p className="text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{activeLinks}</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Active Links</p>
              </div>
           </div>
        </div>

        {/* Create Link Section - Compact */}
        <section className="space-y-4">
           <div className="flex items-center gap-2 px-1">
              <div className="p-2 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border text-stone-400"><Plus className="h-4 w-4" /></div>
              <h3 className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight">Create New Link</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-12">
                 <GlassCard className="p-6 rounded-sm border-white/80 bg-white dark:bg-surface/60 shadow-none">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       <div className="lg:col-span-7 space-y-6">
                          <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none" />
                            <Input
                              value={productSearch}
                              onChange={e => setProductSearch(e.target.value)}
                              placeholder="Search products to promote..."
                              className="h-12 rounded-sm bg-white dark:bg-surface border-stone-100 dark:border-border shadow-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-sm font-bold tracking-tight px-12 transition-all"
                            />
                          </div>
                          
                          <div className="rounded-sm border border-stone-100 dark:border-border bg-white dark:bg-surface/40 overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar">
                            {filteredProducts.slice(0, 15).map((p) => {
                              const rate = p.affiliate_commission_rate ?? 0;
                              const selected = selectedProduct?.id === p.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedProduct(p)}
                                  className={cn(
                                    "w-full flex items-center gap-4 p-3 text-left transition-all border-b border-stone-50 last:border-b-0",
                                    selected ? "bg-orange-50 text-orange-900" : "hover:bg-white dark:bg-surface/60"
                                  )}
                                >
                                  <div className="w-10 h-10 shrink-0 rounded-sm bg-white dark:bg-surface border border-stone-50 shadow-none overflow-hidden flex items-center justify-center p-0.5">
                                    {Array.isArray(p.images) && p.images[0] ? (
                                      <img src={p.images[0]} alt="" className="w-full h-full object-cover rounded-sm" />
                                    ) : (
                                      <Package className="h-4 w-4 text-stone-100" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="font-bold text-[13px] truncate tracking-tight">{p.name}</p>
                                     <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{formatMoney(Number(p.price), p.currency)} • {rate}% Comm.</p>
                                  </div>
                                  {selected && <CheckCircle className="h-4 w-4 text-orange-500 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                       </div>

                       <div className="lg:col-span-5">
                          <div className="h-full rounded-sm bg-stone-900/5 p-6 flex flex-col justify-center space-y-6">
                             {selectedProduct ? (
                               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border flex items-center justify-center overflow-hidden p-0.5 shadow-none">
                                        {Array.isArray(selectedProduct.images) && selectedProduct.images[0] ? (
                                          <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover rounded-sm" />
                                        ) : (
                                          <Package className="h-5 w-5 text-stone-100" />
                                        )}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <h4 className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight truncate">{selectedProduct.name}</h4>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">You earn {Math.round(selectedProduct.affiliate_commission_rate ?? 10)}% per sale</p>
                                     </div>
                                  </div>
                                  <Button onClick={createLinkFromProduct} disabled={creating} className="h-12 w-full rounded-sm bg-stone-900 text-white font-bold text-xs uppercase tracking-widest shadow-none active:scale-95 transition-all border-none group">
                                     {creating ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : "Create Affiliate Link"}
                                  </Button>
                               </div>
                             ) : (
                               <div className="text-center py-10 space-y-4">
                                  <div className="w-12 h-12 rounded-sm bg-white dark:bg-surface border border-stone-50 flex items-center justify-center mx-auto text-stone-100">
                                     <Target className="h-5 w-5" />
                                  </div>
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Select a product above</p>
                               </div>
                             )}

                             {generatedUrl && (
                                <div className="mt-4 p-5 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Your Personal Link:</p>
                                   <div className="flex gap-2">
                                      <Input readOnly value={generatedUrl} className="h-10 rounded-sm bg-stone-50 dark:bg-surface/50 border-stone-50 text-[12px] font-bold text-stone-900 dark:text-white tracking-tight px-4 focus:ring-0" />
                                      <Button size="icon" onClick={() => copyLink(generatedUrl)} className="h-10 w-10 shrink-0 rounded-sm bg-stone-900 text-white shadow-none hover:bg-black border-none active:scale-95 transition-all">
                                         {copied === generatedUrl ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                      </Button>
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-stone-50 flex items-center justify-between gap-4">
                       <button 
                         onClick={() => setShowNewForm(!showNewForm)}
                         className="text-[11px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-900 dark:text-white transition-colors flex items-center gap-2"
                       >
                          <ExternalLink className="h-3.5 w-3.5" /> Use Custom URL
                       </button>
                    </div>
                 </GlassCard>
              </div>
           </div>
        </section>

        {/* Links Registry - Simpler padding */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                 <div className="p-2 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border text-stone-400"><Layers className="h-4 w-4" /></div>
                 <h2 className="text-[14px] font-bold text-stone-900 dark:text-white tracking-tight">Active Links ({links.length})</h2>
              </div>
           </div>
           
           <div className="rounded-sm border-white/80 bg-white dark:bg-surface/60 shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-stone-50/40">
                          <th className="px-8 py-5 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">Product</th>
                          <th className="px-4 py-5 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">Link Code</th>
                          <th className="px-4 py-5 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">Clicks</th>
                          <th className="px-4 py-5 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">Sales</th>
                          <th className="px-8 py-5 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50">Earnings</th>
                          <th className="px-8 py-5 text-right w-12 border-b border-stone-50">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                       {links.length === 0 ? (
                         <tr>
                            <td colSpan={6} className="py-16 text-center">
                               <p className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">No active links found. Create one above.</p>
                            </td>
                         </tr>
                       ) : links.map((l) => {
                         const product = l.products as Record<string, unknown> | null;
                         const fullUrl = (l as { full_url?: string }).full_url ?? "";
                         const isCopied = copied === fullUrl || copied === (l.link_code as string);
                         return (
                           <tr key={l.id as string} className="group hover:bg-white dark:bg-surface/60 transition-all duration-300">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-sm bg-white dark:bg-surface border border-stone-100 dark:border-border shadow-none overflow-hidden p-0.5 shrink-0 transition-transform group-hover:scale-105">
                                       {product && Array.isArray(product.images) && product.images[0] ? (
                                         <img src={product.images[0] as string} alt="" className="w-full h-full object-cover rounded-sm" />
                                       ) : (
                                         <Package className="h-4 w-4 text-stone-100" />
                                       )}
                                    </div>
                                    <div className="min-w-0">
                                       <p className="font-bold text-[13px] text-stone-900 dark:text-white tracking-tight truncate">{product?.name as string ?? "Custom Link"}</p>
                                       <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">ID: {(l.id as string).slice(0, 8)}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-5">
                                 <div className="flex items-center justify-center gap-2">
                                    <code className="px-2.5 py-1 rounded-sm bg-stone-50 dark:bg-surface/50 border border-stone-100 dark:border-border text-[10px] font-bold text-orange-600 tracking-widest uppercase">{l.link_code as string}</code>
                                    <button 
                                      onClick={() => copyLink(fullUrl)}
                                      className="p-1.5 rounded-sm hover:bg-white dark:bg-surface transition-all text-stone-300 hover:text-orange-500"
                                    >
                                       {isCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                 </div>
                              </td>
                              <td className="px-4 py-5 text-right font-bold text-sm text-stone-900 dark:text-white tabular-nums">
                                 {(l.total_clicks as number ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-5 text-right font-bold text-sm text-stone-900 dark:text-white tabular-nums">
                                 {(l.total_conversions as number ?? 0).toLocaleString()}
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatMoney(Number(l.total_earnings ?? 0), "USD")}</p>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex items-center justify-end gap-2 text-stone-300">
                                    <button onClick={() => deleteLink(l.id as string)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-sm transition-all"><Trash2 className="h-4 w-4" /></button>
                                    <a href={l.destination_url as string} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-sky-50 hover:text-sky-500 rounded-sm transition-all"><ExternalLink className="h-4 w-4" /></a>
                                 </div>
                              </td>
                           </tr>
                         )
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}

