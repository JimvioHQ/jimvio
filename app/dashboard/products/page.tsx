"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, Search, TrendingUp, Edit, Trash2, 
  Package, AlertCircle, Store, Layers, MousePointer 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active:   { label: "Active",   variant: "success"   },
  paused:   { label: "Paused",   variant: "warning"   },
  draft:    { label: "Draft",    variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
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

  if (!loading && !vendor) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-[32px] flex items-center justify-center mx-auto text-3xl shadow-xl">🏪</div>
        <div>
           <h3 className="text-xl font-black text-zinc-900">Vendor Activation Required</h3>
           <p className="text-sm text-zinc-400 font-medium mt-2">Scale your business by deploying your first storefront.</p>
        </div>
        <Button asChild className="h-12 px-8 rounded-2xl bg-zinc-900 text-white hover:bg-black font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
           <Link href="/dashboard/vendor/setup">Activate Vendor Role</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-500 fade-in pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 px-2">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-xl">
               <Package className="h-6 w-6 text-white" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  Products
                  <span className="text-zinc-300 font-bold">{products.length}</span>
               </h1>
               <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Master Catalog</p>
            </div>
         </div>

         <Link href="/dashboard/products/new">
            <Button className="h-11 px-6 rounded-xl bg-zinc-900 text-white hover:bg-black font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
               <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
         </Link>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: "Public Listings", value: products.filter(p => p.status === 'active').length, icon: Store, color: "text-blue-500", bg: "bg-blue-50" },
           { label: "Lifetime Sales", value: totalSales, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
           { label: "Inventory Alert", value: lowStock, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
           { label: "Digital Goods", value: products.filter(p => p.is_digital).length, icon: MousePointer, color: "text-violet-500", bg: "bg-violet-50" },
         ].map((stat, i) => (
            <div key={i} className="bg-white border border-zinc-100 p-5 rounded-[28px] shadow-sm flex items-center gap-4 relative group overflow-hidden">
               <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity", stat.bg)} />
               <div className={cn("relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                  <stat.icon className="h-5 w-5" />
               </div>
               <div className="relative">
                  <p className="text-xl font-black text-zinc-900">{stat.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
               </div>
            </div>
         ))}
      </div>

      {/* ── SEARCH & FILTER ── */}
      <div className="flex flex-col md:flex-row gap-4 px-2">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
               placeholder="Search product registry..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-zinc-100 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all shadow-sm"
            />
         </div>
         <div className="flex bg-zinc-50 border border-zinc-100 p-1 rounded-2xl overflow-x-auto">
            {["All", "Active", "Digital", "Physical", "Low Stock"].map((f) => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                     "px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                     activeFilter === f ? "bg-zinc-900 text-white shadow-xl" : "text-zinc-400 hover:text-zinc-900"
                  )}
               >
                  {f}
               </button>
            ))}
         </div>
      </div>

      {/* ── PRODUCT REGISTRY ── */}
      <div className="space-y-4">
         <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 px-2">Catalog Registry</h2>
         
         {loading ? (
            <div className="space-y-3">
               {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-[32px] bg-zinc-50 border border-zinc-100 animate-pulse" />)}
            </div>
         ) : filtered.length === 0 ? (
            <div className="py-20 text-center rounded-[32px] bg-zinc-50 border border-zinc-100 border-dashed">
               <Package className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
               <p className="text-sm font-bold text-zinc-500">No products found.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-3">
               {filtered.map((p) => {
                 const s = statusMap[p.status as string] || statusMap.draft;
                 const img = (p.images as string[])?.[0];

                  return (
                    <div key={p.id as string} className="group bg-white border border-zinc-100 hover:border-zinc-300 rounded-[28px] p-4 pr-6 flex items-center gap-6 transition-all shadow-sm hover:shadow-md">
                       
                       {/* Identity */}
                       <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden relative group-hover:border-zinc-300 transition-all">
                          {img ? (
                             <img src={img} alt={p.name as string} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                             <Package className="h-6 w-6 text-zinc-300" />
                          )}
                          {p.is_digital && <span className="absolute top-1 right-1 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg">DIGITAL</span>}
                       </div>

                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                s.variant === 'success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                s.variant === 'warning' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                "bg-zinc-50 text-zinc-500 border-zinc-200"
                             )}>{s.label}</span>
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">{p.product_type}</span>
                          </div>
                          <h3 className="text-base font-black text-zinc-900 truncate">{p.name as string}</h3>
                          <div className="flex items-center gap-4 mt-1">
                             <span className="text-xs font-black text-zinc-900">{formatMoney(Number(p.price), (p.currency as string) || undefined)}</span>
                             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3" /> {p.sale_count || 0} Sold
                             </span>
                             {!p.is_digital && (
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                  (p.inventory_quantity as number) <= 5 ? "text-red-500" : "text-zinc-400"
                                )}>
                                   <Layers className="h-3 w-3" /> {p.inventory_quantity || 0} Stock
                                </span>
                             )}
                          </div>
                       </div>

                       {/* Actions */}
                       <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/dashboard/products/${p.id as string}/edit`}>
                             <div className="w-10 h-10 rounded-xl bg-zinc-50 hover:bg-zinc-900 hover:text-white flex items-center justify-center text-zinc-400 transition-all cursor-pointer border border-zinc-100">
                                <Edit className="h-4 w-4" />
                             </div>
                          </Link>
                          <button onClick={() => deleteProduct(p.id as string)} className="w-10 h-10 rounded-xl bg-zinc-50 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-zinc-300 transition-all cursor-pointer border border-zinc-100 group-hover:opacity-100 opacity-0">
                             <Trash2 className="h-4 w-4" />
                          </button>
                       </div>

                    </div>
                  );
               })}
            </div>
         )}
      </div>

    </div>
  );
}

