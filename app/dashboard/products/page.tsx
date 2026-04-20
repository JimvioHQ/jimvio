"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, Search, TrendingUp, Edit, Trash2, 
  Package, AlertCircle, Store, Layers, MousePointer, Eye, ShoppingBag, Box, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; color: "emerald" | "orange" | "rose" | "indigo" | "amber" }> = {
  active:   { label: "Active",   color: "emerald" },
  paused:   { label: "Paused",   color: "orange" },
  draft:    { label: "Draft",    color: "indigo" },
  archived: { label: "Archived", color: "rose" },
};

export default function ProductsPage() {
  const { formatMoney } = useCurrency();
  const [products, setProducts]   = useState<Record<string, unknown>[]>([]);
  const [filtered, setFiltered]   = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);
  const [vendor, setVendor]       = useState<Record<string, unknown> | null>(null);
  const [search, setSearch]       = useState("");
  const [activeFilter, setFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userVendors } = await supabase.from("vendors").select("*").eq("user_id", user.id);
      setVendor(userVendors?.[0] || null);

      if (userVendors && userVendors.length > 0) {
        const vendorIds = userVendors.map(v => v.id);
        const { data: prods } = await supabase
          .from("products")
          .select(`
            id, name, slug, price, currency, compare_at_price, status, product_type,
            images, inventory_quantity, sale_count, rating, review_count,
            affiliate_enabled, affiliate_commission_rate, is_active,
            is_digital, created_at, vendor_id
          `)
          .in("vendor_id", vendorIds)
          .order("created_at", { ascending: false });

        setProducts(prods ?? []);
        setFiltered(prods ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let result = products;
    if (search) result = result.filter(p => (p.name as string)?.toLowerCase().includes(search.toLowerCase()));
    if (activeFilter !== "All") {
      if (activeFilter === "Active")   result = result.filter(p => p.status === "active");
      if (activeFilter === "Digital")  result = result.filter(p => p.product_type === "digital" || p.is_digital === true);
      if (activeFilter === "Physical") result = result.filter(p => p.product_type === "physical" || (!p.product_type && p.is_digital === false));
      if (activeFilter === "Low Stock")result = result.filter(p => p.product_type !== "digital" && !p.is_digital && (p.inventory_quantity as number) <= 5);
    }
    setFiltered(result);
  }, [search, activeFilter, products]);

  async function toggleStatus(productId: string, currentStatus: string) {
    const supabase  = createClient();
    const newStatus = currentStatus === "active" ? "paused" : "active";
    const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
  }

  async function deleteProduct(productId: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const supabase  = createClient();
    const { error } = await supabase.from("products").update({ is_active: false, status: "archived" }).eq("id", productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
  }

  const active    = products.filter(p => p.status === "active").length;
  const lowStock  = products.filter(p => p.product_type !== "digital" && !p.is_digital && (p.inventory_quantity as number) <= 5).length;
  const totalSales= products.reduce((s, p) => s + (p.sale_count as number ?? 0), 0);

  if (loading && products.length === 0) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "var(--color-bg)" }}>
         <div className="relative">
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-[32px] bg-surface border border-border shadow-2xl flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
             <Box className="h-10 w-10 text-stone-900 dark:text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] pl-[0.4em]">Products Hub</h2>
            <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest pl-[0.1em]">Reconciling Global Marketplace Inventory</p>
         </div>
       </div>
    );
  }

  if (!loading && !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-md w-full p-10 text-center rounded-[48px] border-border bg-surface/60 shadow-2xl">
           <div className="w-24 h-24 bg-surface dark:bg-surface-secondary rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-border shadow-xl">
              <Store className="h-10 w-10 text-stone-100 dark:text-zinc-700 dark:text-zinc-300" />
           </div>
           <h3 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">Vendor Account Required</h3>
           <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-4 leading-relaxed">System requires active vendor status to access inventory management.</p>
           <Button asChild className="w-full h-16 rounded-3xl bg-stone-900 dark:bg-white dark:bg-surface dark:text-stone-900 dark:text-white text-white font-black text-[11px] uppercase tracking-widest shadow-2xl mt-10 hover:bg-black dark:hover:bg-stone-200 transition-all border-none">
              <Link href="/dashboard/activate/vendor">Become a Vendor</Link>
           </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10 px-4 sm:px-6 pt-6 sm:pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-surface border border-border shadow-sm shrink-0">
                 <Package className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500" />
              </div>
              <div className="space-y-0.5">
                 <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                    My Products
                    <span className="text-stone-300 dark:text-stone-600 ml-2 font-black text-lg">{products.length}</span>
                 </h1>
                 <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest leading-none pl-0.5 opacity-80">
                    Track and manage your marketplace inventory
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <Button className="h-10 sm:h-11 px-6 sm:px-8 rounded-xl bg-stone-900 dark:bg-white dark:bg-surface dark:text-stone-900 dark:text-white text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-black dark:hover:bg-stone-200 border-none" asChild>
                 <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-2" /> Add Product</Link>
              </Button>
           </div>
        </div>

        {/* Stats Row - Soft & Compact */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
           <GlassCard className="p-4 sm:p-6 flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-surface/60 dark:bg-surface-secondary/40 border-border shadow-sm group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-100/50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                 <Store className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{products.filter(p => p.status === "active").length}</p>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-text-muted mt-2">Active Items</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-6 flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-surface/60 dark:bg-surface-secondary/40 border-border shadow-sm group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                 <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{totalSales}</p>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-text-muted mt-2">Total Sales</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-6 flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-surface/60 dark:bg-surface-secondary/40 border-border shadow-sm group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-100/50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                 <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-500 tracking-tight tabular-nums">{lowStock}</p>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-text-muted mt-2">Low Stock Alerts</p>
              </div>
           </GlassCard>
           <GlassCard className="p-4 sm:p-6 flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-surface/60 dark:bg-surface-secondary/40 border-border shadow-sm group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                 <MousePointer className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                 <p className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight tabular-nums">{products.filter(p => p.is_digital).length}</p>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-text-muted mt-2">Digital Files</p>
              </div>
           </GlassCard>
        </div>

        {/* Filters & Table Hub */}
        <div className="space-y-6 sm:space-y-8">
           <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-stone-300 dark:text-stone-600 group-focus-within:text-orange-500 transition-colors" />
                 <input
                    placeholder="Search by name or SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 sm:h-12 pl-12 pr-6 rounded-xl sm:rounded-2xl bg-surface/60 dark:bg-surface-secondary/40 border border-border text-[13px] font-medium tracking-tight text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-600 shadow-sm focus:outline-none focus:bg-surface dark:focus:bg-zinc-800 transition-all"
                 />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth p-0.5 shrink-0">
                 {["All", "Active", "Digital", "Physical", "Low Stock"].map((f) => (
                    <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={cn(
                          "px-6 h-10 sm:h-11 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm",
                          activeFilter === f
                             ? "bg-stone-900 dark:bg-white dark:bg-surface border-stone-900 dark:border-white text-white dark:text-stone-900 dark:text-white shadow-md active:scale-95"
                             : "bg-surface/60 dark:bg-surface-secondary/40 border-border text-stone-400 dark:text-text-muted hover:text-stone-900 dark:text-white dark:hover:text-stone-200 hover:bg-surface dark:hover:bg-zinc-800"
                       )}
                    >
                       {f}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600 opacity-60">Inventory Registry</h2>
                 <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-stone-300 uppercase tracking-widest opacity-50">
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Marketplace Sync
                 </div>
              </div>
              
               {filtered.length === 0 ? (
                  <GlassCard className="p-16 py-24 text-center rounded-[32px] border-border bg-surface/30 dark:bg-surface/30">
                     <Package className="h-10 w-10 text-stone-100 dark:text-zinc-800 dark:text-text-secondary mx-auto mb-6 opacity-50" />
                     <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight uppercase">No Products Found</h2>
                     <p className="text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-3 opacity-80">Start by adding your first product to the marketplace.</p>
                  </GlassCard>
               ) : (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                     {filtered.map((p) => {
                       const s = statusMap[p.status as string] || { label: "Draft", color: "indigo" };
                       const img = (p.images as string[])?.[0];
 
                        return (
                          <GlassCard key={p.id as string} className="group p-4 sm:p-7 flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-8 rounded-2xl sm:rounded-3xl hover:shadow-xl hover:bg-surface dark:hover:bg-zinc-800/80 transition-all duration-500 border-border max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 bg-surface/80 dark:bg-surface-secondary/60">
                             
                             {/* Product Graphics */}
                             <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-surface dark:bg-surface-secondary border border-border shadow-sm flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform duration-700">
                                {img ? (
                                   <img src={img} alt={p.name as string} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                   <Package className="h-8 w-8 text-stone-100 dark:text-zinc-700 dark:text-zinc-300" />
                                )}
                                {Boolean(p.is_digital) && (
                                   <div className="absolute top-1.5 right-1.5 bg-indigo-500 text-white text-[6px] font-black px-1.5 py-0.5 rounded-md border border-white/20 shadow-md">
                                      DIGITAL
                                   </div>
                                )}
                             </div>
 
                             <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-3">
                                   <button onClick={() => toggleStatus(p.id as string, p.status as string)} className="active:scale-95 transition-all">
                                      <GlassPill color={s.color} className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-3 py-1 border-none shadow-none ring-1 ring-border">{s.label}</GlassPill>
                                   </button>
                                   <span className="text-[9px] font-black text-stone-300 dark:text-stone-600 uppercase tracking-tight">#{String(p.id).slice(0, 8)}</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight truncate leading-tight group-hover:text-orange-600 transition-colors uppercase">{p.name as string}</h3>
                                
                                <div className="flex flex-wrap items-center gap-6 sm:gap-10 mt-1">
                                   <div className="space-y-0.5">
                                      <p className="text-[8px] sm:text-[9px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest">Price</p>
                                      <span className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tabular-nums tracking-tight">{formatMoney(Number(p.price), (p.currency as string) || undefined)}</span>
                                   </div>
                                   <div className="space-y-0.5">
                                      <p className="text-[8px] sm:text-[9px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest">Sales</p>
                                      <div className="flex items-center gap-1.5">
                                         <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                         <span className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">{(p.sale_count as number) || 0}</span>
                                      </div>
                                   </div>
                                   {!p.is_digital && (
                                      <div className="space-y-0.5">
                                         <p className="text-[8px] sm:text-[9px] font-bold text-stone-300 dark:text-stone-600 uppercase tracking-widest">Stock</p>
                                         <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", (p.inventory_quantity as number) <= 5 ? "bg-rose-500 animate-pulse" : "bg-emerald-400")} />
                                            <span className={cn(
                                              "text-lg sm:text-xl font-black tabular-nums tracking-tight",
                                              (p.inventory_quantity as number) <= 5 ? "text-rose-500" : "text-stone-900 dark:text-white"
                                            )}>
                                               {(p.inventory_quantity as number) || 0}
                                            </span>
                                         </div>
                                      </div>
                                   )}
                                </div>
                             </div>
 
                             {/* Controls Hub - Soft & Compact */}
                             <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
                                <Link href={`/dashboard/products/${p.id as string}/edit`} className="flex-1 lg:flex-none">
                                   <div className="h-10 sm:h-11 px-6 rounded-xl bg-surface dark:bg-surface-secondary border border-border hover:bg-stone-900 dark:hover:bg-white dark:bg-surface hover:text-white dark:hover:text-stone-900 dark:text-white flex items-center justify-center gap-2.5 text-stone-600 dark:text-text-muted transition-all cursor-pointer shadow-sm group-hover:shadow-md active:scale-95">
                                      <Edit className="h-3.5 w-3.5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                                   </div>
                                 </Link>
                                 <Link href={`/product/${p.slug}`} target="_blank" className="flex-1 lg:flex-none">
                                   <div className="h-10 sm:h-11 px-6 rounded-xl bg-surface dark:bg-surface-secondary border border-border hover:bg-orange-500 hover:text-white flex items-center justify-center gap-2.5 text-stone-400 dark:text-stone-600 transition-all cursor-pointer shadow-sm group-hover:shadow-md active:scale-95">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">View</span>
                                   </div>
                                 </Link>
                                 <button onClick={() => deleteProduct(p.id as string)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface dark:bg-surface-secondary border border-border hover:bg-rose-500 hover:text-white flex items-center justify-center text-stone-300 dark:text-stone-700 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95">
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                             </div>
 
                          </GlassCard>
                        );
                     })}
                  </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
}
