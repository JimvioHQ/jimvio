"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, Search, TrendingUp, Edit, Trash2, 
  Package, AlertCircle, Store, Layers, MousePointer, Eye, ShoppingBag, Box, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; textClass: string; bgClass: string }> = {
  active:   { label: "Active",   textClass: "text-emerald-500", bgClass: "bg-emerald-500/10 border-emerald-500/20" },
  paused:   { label: "Paused",   textClass: "text-orange-500", bgClass: "bg-orange-500/10 border-orange-500/20" },
  draft:    { label: "Draft",    textClass: "text-zinc-500", bgClass: "bg-zinc-500/10 border-zinc-500/20" },
  archived: { label: "Archived", textClass: "text-rose-500", bgClass: "bg-rose-500/10 border-rose-500/20" },
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
       <div className="min-h-screen flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700 bg-[#060606]">
         <div className="relative">
           <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-sm scale-150 animate-pulse" />
           <div className="relative w-24 h-24 rounded-sm bg-[#111] border border-[#222] shadow-none flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-sm animate-spin m-2" />
             <Box className="h-10 w-10 text-white" />
           </div>
         </div>
         <div className="text-center space-y-3">
            <h2 className="text-[14px] font-black text-white uppercase tracking-[0.4em] pl-[0.4em]">Products Hub</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-[0.1em]">Reconciling Global Marketplace Inventory</p>
         </div>
       </div>
    );
  }

  if (!loading && !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#060606]">
        <div className="max-w-md w-full p-10 text-center rounded-sm border border-[#222] bg-[#0A0A0A] shadow-none">
           <div className="w-24 h-24 bg-[#111] rounded-sm flex items-center justify-center mx-auto mb-8 border border-[#222] shadow-none">
              <Store className="h-10 w-10 text-zinc-400" />
           </div>
           <h3 className="text-3xl font-black text-white tracking-tighter">Vendor Account Required</h3>
           <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-4 leading-relaxed">System requires active vendor status to access inventory management.</p>
           <Button asChild className="w-full h-16 rounded-sm bg-white text-black font-black text-[11px] uppercase tracking-widest mt-10 hover:bg-zinc-200 transition-all border-none">
              <Link href="/dashboard/activate/vendor">Become a Vendor</Link>
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#060606] relative">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 px-4 sm:px-6 pt-6 sm:pt-12 relative z-10 animate-in fade-in duration-500">
        
        {/* Header Protocol */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-[#222]">
           <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-[#111] border border-[#222] shrink-0 rounded-xl">
                 <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
              <div>
                 <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    My Products
                    <span className="text-zinc-600 font-mono text-base sm:text-lg">({products.length})</span>
                 </h1>
                 <p className="text-[9px] sm:text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 sm:mt-1 font-mono">
                    Track and manage your marketplace inventory
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-10 px-6 sm:px-8 rounded-xl bg-orange-600 text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:bg-orange-500 transition-all border-none" asChild>
                 <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-1.5 sm:mr-2" /> Add Product</Link>
              </Button>
           </div>
        </div>

        {/* Stats Row */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
           <div className="p-4 sm:p-6 flex flex-col justify-between bg-[#0A0A0A] border border-[#222] group rounded-2xl">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#111] flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#1A1A1A] transition-colors">
                 <Store className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              </div>
              <div>
                 <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">{products.filter(p => p.status === "active").length}</p>
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 sm:mt-2">Active Items</p>
              </div>
           </div>
           
           <div className="p-4 sm:p-6 flex flex-col justify-between bg-[#0A0A0A] border border-[#222] group rounded-2xl">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#111] flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#1A1A1A] transition-colors">
                 <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
              </div>
              <div>
                 <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">{totalSales}</p>
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 sm:mt-2">Total Sales</p>
              </div>
           </div>
           
           <div className="p-4 sm:p-6 flex flex-col justify-between bg-[#0A0A0A] border border-[#222] group rounded-2xl">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#111] flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#1A1A1A] transition-colors">
                 <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
              </div>
              <div>
                 <p className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight tabular-nums">{lowStock}</p>
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 sm:mt-2">Low Stock</p>
              </div>
           </div>
           
           <div className="p-4 sm:p-6 flex flex-col justify-between bg-[#0A0A0A] border border-[#222] group rounded-2xl">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#111] flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-[#1A1A1A] transition-colors">
                 <MousePointer className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                 <p className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">{products.filter(p => p.is_digital).length}</p>
                 <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 sm:mt-2">Digital Files</p>
              </div>
           </div>
        </div>

        {/* Filters & Table Hub */}
        <div className="space-y-4 sm:space-y-8 pt-4">
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
                 <input
                    placeholder="Search by name or SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 sm:pr-6 bg-[#0A0A0A] border border-[#222] text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors rounded-xl"
                 />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 shrink-0 pb-1 sm:pb-0">
                 {["All", "Active", "Digital", "Physical", "Low Stock"].map((f) => (
                    <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={cn(
                          "px-4 sm:px-6 h-9 sm:h-10 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border rounded-lg",
                          activeFilter === f
                             ? "bg-white border-white text-black shadow-sm"
                             : "bg-[#0A0A0A] border-[#222] text-zinc-500 hover:text-white hover:border-[#333]"
                       )}
                    >
                       {f}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Inventory Registry</h2>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                    <Loader2 className="h-3 w-3 animate-spin-slow" />
                    Marketplace Sync
                 </div>
              </div>
              
               {filtered.length === 0 ? (
                  <div className="p-16 py-24 text-center border border-[#222] bg-[#0A0A0A]">
                     <Package className="h-10 w-10 text-zinc-800 mx-auto mb-6" />
                     <h2 className="text-xl font-bold text-white tracking-tight uppercase">No Products Found</h2>
                     <p className="text-xs font-mono text-zinc-500 mt-3">Start by adding your first product to the marketplace.</p>
                  </div>
               ) : (
                   <div className="grid grid-cols-1 gap-3 sm:gap-4">
                     {filtered.map((p) => {
                       const s = statusMap[p.status as string] || { label: "Draft", textClass: "text-zinc-500", bgClass: "bg-zinc-500/10 border-zinc-500/20" };
                       const img = (p.images as string[])?.[0];
 
                        return (
                          <div key={p.id as string} className="group p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-colors rounded-2xl shadow-sm">
                             
                             <div className="flex flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
                                {/* Product Graphics */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#111] border border-[#222] flex items-center justify-center shrink-0 overflow-hidden relative rounded-xl">
                                   {img ? (
                                      <img src={img} alt={p.name as string} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                   ) : (
                                      <Package className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-700" />
                                   )}
                                   {Boolean(p.is_digital) && (
                                      <div className="absolute top-0 right-0 bg-orange-600 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 border-b border-l border-[#222] rounded-bl-lg">
                                         DIGITAL
                                      </div>
                                   )}
                                </div>
    
                                <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                                   <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                      <button onClick={() => toggleStatus(p.id as string, p.status as string)} className="active:scale-95 transition-all outline-none">
                                         <span className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 flex items-center justify-center border rounded-full", s.bgClass, s.textClass)}>
                                           {s.label}
                                         </span>
                                      </button>
                                      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase">#{String(p.id).slice(0, 8)}</span>
                                   </div>
                                   <h3 className="text-base sm:text-xl font-bold text-white tracking-tight truncate leading-tight group-hover:text-orange-500 transition-colors">{p.name as string}</h3>
                                   
                                   <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-0.5 sm:pt-2">
                                      <div className="space-y-0.5 sm:space-y-1">
                                         <p className="text-[9px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Price</p>
                                         <span className="text-sm sm:text-base font-bold text-white font-mono">{formatMoney(Number(p.price), (p.currency as string) || undefined)}</span>
                                      </div>
                                      <div className="space-y-0.5 sm:space-y-1">
                                         <p className="text-[9px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sales</p>
                                         <div className="flex items-center gap-1 sm:gap-1.5">
                                            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-500" />
                                            <span className="text-sm sm:text-base font-bold text-white font-mono">{(p.sale_count as number) || 0}</span>
                                         </div>
                                      </div>
                                      {!p.is_digital && (
                                         <div className="space-y-0.5 sm:space-y-1">
                                            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Stock</p>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                               <div className={cn("w-1.5 h-1.5 rounded-full", (p.inventory_quantity as number) <= 5 ? "bg-rose-500 animate-pulse" : "bg-zinc-600")} />
                                               <span className={cn(
                                                 "text-sm sm:text-base font-bold font-mono",
                                                 (p.inventory_quantity as number) <= 5 ? "text-rose-500" : "text-white"
                                               )}>
                                                  {(p.inventory_quantity as number) || 0}
                                               </span>
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                </div>
                             </div>
 
                             {/* Controls Hub */}
                             <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t border-[#222] sm:border-none mt-2 sm:mt-0">
                                <Link href={`/dashboard/products/${p.id as string}/edit`} className="flex-1 sm:flex-none">
                                   <div className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#111] border border-[#222] hover:bg-[#1A1A1A] flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95">
                                      <Edit className="h-3.5 w-3.5" />
                                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Edit</span>
                                   </div>
                                 </Link>
                                 <Link href={`/product/${p.slug}`} target="_blank" className="flex-1 sm:flex-none">
                                   <div className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#111] border border-[#222] hover:bg-[#1A1A1A] flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">View</span>
                                   </div>
                                 </Link>
                                 <button onClick={() => deleteProduct(p.id as string)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#111] border border-[#222] hover:border-rose-500/50 hover:bg-rose-500/10 flex items-center justify-center text-zinc-500 hover:text-rose-500 transition-colors cursor-pointer active:scale-95">
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                 </button>
                             </div>
 
                          </div>
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

