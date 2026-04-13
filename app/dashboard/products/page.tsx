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
      if (activeFilter === "Digital")  result = result.filter(p => p.is_digital === true);
      if (activeFilter === "Physical") result = result.filter(p => p.is_digital === false);
      if (activeFilter === "Low Stock")result = result.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5);
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
  const lowStock  = products.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5).length;
  const totalSales= products.reduce((s, p) => s + (p.sale_count as number ?? 0), 0);

  if (loading && products.length === 0) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700" style={{ background: "#f8f7f5" }}>
         <div className="relative">
           <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-[32px] bg-white border border-white shadow-2xl flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
             <Box className="h-10 w-10 text-stone-900" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-stone-900 uppercase tracking-[0.4em] pl-[0.4em]">Products Hub</h2>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Reconciling Global Marketplace Inventory</p>
         </div>
       </div>
    );
  }

  if (!loading && !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f8f7f5" }}>
        <GlassCard className="max-w-md w-full p-10 text-center rounded-[48px] border-white bg-white/60 shadow-2xl">
           <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-stone-50 shadow-xl">
              <Store className="h-10 w-10 text-stone-100" />
           </div>
           <h3 className="text-3xl font-black text-stone-900 tracking-tighter">Vendor Account Required</h3>
           <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-4 leading-relaxed">System requires active vendor status to access inventory management.</p>
           <Button asChild className="w-full h-16 rounded-3xl bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl mt-10 hover:bg-black transition-all border-none">
              <Link href="/dashboard/activate/vendor">Become a Vendor</Link>
           </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: "#f8f7f5" }}>
      <GlassAmbientGlow color="orange" position="top-right" />
      <GlassAmbientGlow color="indigo" position="bottom-left" />

      <div className="max-w-6xl mx-auto space-y-12 px-6 pt-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Protocol */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-2">
              <h1 className="text-4xl font-black text-stone-900 tracking-tighter flex items-center gap-4">
                 <div className="p-2.5 rounded-[20px] bg-white border border-white shadow-2xl shrink-0">
                    <Package className="h-8 w-8 text-orange-500" />
                 </div>
                 My Products
                 <span className="text-stone-300 ml-2 font-black">{products.length}</span>
              </h1>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] pl-16">
                 Track and manage your marketplace inventory
              </p>
           </div>

           <div className="flex items-center gap-4">
              <Button className="h-14 px-8 rounded-full bg-stone-900 text-white font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-black border-none" asChild>
                 <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-3" /> Add Product</Link>
              </Button>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-orange-50 border border-orange-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <Store className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{products.filter(p => p.status === "active").length}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Active Items</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <TrendingUp className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{totalSales}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Total Sales</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white/60 border-white shadow-xl group">
              <div className="w-14 h-14 rounded-[22px] bg-rose-50 border border-rose-100 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <div>
                 <p className="text-3xl font-black text-rose-600 tracking-tighter leading-none tabular-nums">{lowStock}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Low Stock Alerts</p>
              </div>
           </GlassCard>
           <GlassCard className="p-8 flex flex-col justify-between rounded-[40px] bg-white border-white shadow-2xl group">
              <div className="w-14 h-14 rounded-[22px] bg-stone-900 text-white flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
                 <MousePointer className="h-7 w-7" />
              </div>
              <div>
                 <p className="text-3xl font-black text-stone-900 tracking-tighter leading-none tabular-nums">{products.filter(p => p.is_digital).length}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-3">Digital Files</p>
              </div>
           </GlassCard>
        </div>

        {/* Filters & Table Hub */}
        <div className="space-y-8">
           <div className="flex flex-col md:flex-row gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-300 group-focus-within:text-orange-500 transition-colors" />
                 <input
                    placeholder="Search your products by name or SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-16 pl-14 pr-6 rounded-[28px] bg-white/60 border border-white text-[14px] font-bold tracking-tight text-stone-900 placeholder:text-stone-300 shadow-xl focus:outline-none focus:bg-white transition-all"
                 />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth p-1 shrink-0">
                 {["All", "Active", "Digital", "Physical", "Low Stock"].map((f) => (
                    <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={cn(
                          "px-8 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm",
                          activeFilter === f
                             ? "bg-stone-900 border-stone-900 text-white shadow-xl scale-105"
                             : "bg-white/60 border-white text-stone-400 hover:text-stone-900 hover:bg-white"
                       )}
                    >
                       {f}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">Inventory Registry</h2>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Marketplace Sync
                 </div>
              </div>
              
              {filtered.length === 0 ? (
                 <GlassCard className="p-24 text-center rounded-[56px] border-white bg-white/20">
                    <Package className="h-12 w-12 text-stone-100 mx-auto mb-8" />
                    <h2 className="text-2xl font-black text-stone-900 tracking-tighter uppercase">No Products Found</h2>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-4">Start by adding your first product to the marketplace.</p>
                 </GlassCard>
              ) : (
                 <div className="grid grid-cols-1 gap-6">
                    {filtered.map((p) => {
                      const s = statusMap[p.status as string] || { label: "Draft", color: "indigo" };
                      const img = (p.images as string[])?.[0];

                       return (
                         <GlassCard key={p.id as string} className="group p-8 flex flex-col lg:flex-row lg:items-center gap-8 rounded-[48px] hover:shadow-2xl hover:bg-white transition-all duration-500">
                            
                            {/* Product Graphics */}
                            <div className="w-24 h-24 rounded-[32px] bg-white border border-white shadow-xl flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform duration-700">
                               {img ? (
                                  <img src={img} alt={p.name as string} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                               ) : (
                                  <Package className="h-10 w-10 text-stone-100" />
                               )}
                               {Boolean(p.is_digital) && (
                                  <div className="absolute top-2 right-2 bg-indigo-500 text-white text-[7px] font-black px-2 py-1 rounded-lg border border-white/20 shadow-lg">
                                     DIGITAL
                                  </div>
                               )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-4">
                               <div className="flex items-center gap-3">
                                  <button onClick={() => toggleStatus(p.id as string, p.status as string)} className="active:scale-90 transition-all">
                                     <GlassPill color={s.color} className="text-[8px] font-black uppercase tracking-[0.15em] px-4 py-1.5 border-none shadow-none ring-1 ring-white/50">{s.label}</GlassPill>
                                  </button>
                                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">#{String(p.id).slice(0, 8)}</span>
                               </div>
                               <h3 className="text-2xl font-black text-stone-900 tracking-tighter truncate leading-none">{p.name as string}</h3>
                               
                               <div className="flex flex-wrap items-center gap-8 mt-2">
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">Price Point</p>
                                     <span className="text-xl font-black text-stone-900 tabular-nums tracking-tighter">{formatMoney(Number(p.price), (p.currency as string) || undefined)}</span>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">Sales Vol</p>
                                     <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xl font-black text-stone-900">{(p.sale_count as number) || 0}</span>
                                     </div>
                                  </div>
                                  {!p.is_digital && (
                                     <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">Inv Levels</p>
                                        <div className="flex items-center gap-2">
                                           <div className={cn("w-2 h-2 rounded-full", (p.inventory_quantity as number) <= 5 ? "bg-rose-500 animate-pulse" : "bg-emerald-400")} />
                                           <span className={cn(
                                             "text-xl font-black tabular-nums",
                                             (p.inventory_quantity as number) <= 5 ? "text-rose-500" : "text-stone-900"
                                           )}>
                                              {(p.inventory_quantity as number) || 0}
                                           </span>
                                        </div>
                                     </div>
                                  )}
                               </div>
                            </div>

                            {/* Controls Hub */}
                            <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
                               <Link href={`/dashboard/products/${p.id as string}/edit`} className="flex-1 lg:flex-none">
                                  <div className="h-14 px-8 rounded-2xl bg-white border border-stone-50 hover:bg-stone-900 hover:text-white flex items-center justify-center gap-3 text-stone-600 transition-all cursor-pointer shadow-lg group-hover:shadow-xl active:scale-95">
                                     <Edit className="h-4 w-4" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                                  </div>
                                </Link>
                                <Link href={`/product/${p.slug}`} target="_blank" className="flex-1 lg:flex-none">
                                  <div className="h-14 px-8 rounded-2xl bg-white border border-stone-50 hover:bg-orange-500 hover:text-white flex items-center justify-center gap-3 text-stone-400 transition-all cursor-pointer shadow-lg group-hover:shadow-xl active:scale-95">
                                     <Eye className="h-4 w-4" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">View</span>
                                  </div>
                                </Link>
                                <button onClick={() => deleteProduct(p.id as string)} className="w-14 h-14 rounded-2xl bg-white border border-stone-50 hover:bg-rose-500 hover:text-white flex items-center justify-center text-stone-300 transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-95">
                                   <Trash2 className="h-5 w-5" />
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
