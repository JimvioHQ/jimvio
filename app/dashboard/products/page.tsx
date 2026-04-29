
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
   Plus, Search, TrendingUp, Edit, Trash2,
   Package, AlertCircle, Store, MousePointer,
   Eye, Box, Loader2, Filter, ChevronDown,
   ArrowUpRight, MoreHorizontal, Zap,
   ShoppingBag,
   ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ── status config ──────────────────────────────────────────── */
const STATUS = {
   active: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
   paused: { label: "Paused", dot: "bg-amber-500", text: "text-amber-400", badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
   draft: { label: "Draft", dot: "bg-zinc-500", text: "text-zinc-400", badge: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400" },
   archived: { label: "Archived", dot: "bg-rose-500", text: "text-rose-400", badge: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
} as Record<string, { label: string; dot: string; text: string; badge: string }>;

const FILTERS = ["All", "Active", "Digital", "Physical", "Low Stock"] as const;
type Filter = typeof FILTERS[number];

/* ── stat card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, color, value, label }: {
   icon: React.ElementType; color: string; value: number | string; label: string;
}) {
   return (
      <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 flex flex-col gap-4">
         <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
            <Icon className="w-4 h-4" />
         </div>
         <div>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-0.5">{label}</p>
         </div>
      </div>
   );
}

/* ── main ───────────────────────────────────────────────────── */
export default function ProductsPage() {
   const { formatMoney } = useCurrency();
   const [products, setProducts] = useState<Record<string, unknown>[]>([]);
   const [filtered, setFiltered] = useState<Record<string, unknown>[]>([]);
   const [loading, setLoading] = useState(true);
   const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
   const [search, setSearch] = useState("");
   const [activeFilter, setFilter] = useState<Filter>("All");
   const [openMenu, setOpenMenu] = useState<string | null>(null);

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
               .select(`id, name, slug, price, currency, status, product_type, images,
                   inventory_quantity, sale_count, is_digital, created_at, vendor_id`)
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
      if (activeFilter === "Active") result = result.filter(p => p.status === "active");
      if (activeFilter === "Digital") result = result.filter(p => p.is_digital === true);
      if (activeFilter === "Physical") result = result.filter(p => p.is_digital === false);
      if (activeFilter === "Low Stock") result = result.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5);
      setFiltered(result);
   }, [search, activeFilter, products]);

   async function toggleStatus(productId: string, currentStatus: string) {
      const supabase = createClient();
      const newStatus = currentStatus === "active" ? "paused" : "active";
      const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", productId);
      if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
      setOpenMenu(null);
   }

   async function deleteProduct(productId: string, name: string) {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ is_active: false, status: "archived" }).eq("id", productId);
      if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
      setOpenMenu(null);
   }

   const active = products.filter(p => p.status === "active").length;
   const lowStock = products.filter(p => !p.is_digital && (p.inventory_quantity as number) <= 5).length;
   const total = products.reduce((s, p) => s + ((p.sale_count as number) || 0), 0);
   const digital = products.filter(p => p.is_digital).length;

   /* ── loading ── */
   if (loading) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#080808]">
            <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1E1E1E] flex items-center justify-center">
               <Box className="h-6 w-6 text-orange-500" />
            </div>
            <div className="text-center">
               <p className="text-sm font-semibold text-white">Loading products</p>
               <p className="text-xs text-zinc-600 mt-1">Fetching your inventory…</p>
            </div>
            <Loader2 className="h-4 w-4 text-zinc-600 animate-spin" />
         </div>
      );
   }

   /* ── no vendor ── */
   if (!vendor) {
      return (
         <div className="min-h-screen flex items-center justify-center px-6 bg-[#080808]">
            <div className="max-w-sm w-full text-center space-y-6">
               <div className="w-16 h-16 bg-[#111] border border-[#1E1E1E] rounded-2xl flex items-center justify-center mx-auto">
                  <Store className="h-7 w-7 text-zinc-400" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white">Vendor account required</h3>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">You need an active vendor account to manage products.</p>
               </div>
               <Button asChild className="w-full h-11 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm border-none">
                  <Link href="/dashboard/activate/vendor">Become a vendor</Link>
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#080808] pb-24">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-7 h-7 rounded-xl bg-orange-600/15 flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-orange-500" />
                     </div>
                     <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Inventory</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                     My Products
                     <span className="ml-2.5 text-lg font-normal text-zinc-600">({products.length})</span>
                  </h1>
               </div>

               <Link
                  href="/dashboard/products/new"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)] shrink-0"
               >
                  <Plus className="h-4 w-4" />
                  Add product
               </Link>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
               <StatCard icon={ShoppingBag} color="bg-orange-600/15 text-orange-500" value={active} label="Active" />
               <StatCard icon={ShoppingCart} color="bg-emerald-600/15 text-emerald-500" value={total} label="Total sales" />
               <StatCard icon={AlertCircle} color="bg-rose-600/15 text-rose-500" value={lowStock} label="Low stock" />
               <StatCard icon={MousePointer} color="bg-zinc-700/40 text-zinc-400" value={digital} label="Digital" />
            </div>

            {/* ── Filters bar ── */}
            <div className="flex flex-col sm:flex-row gap-3">
               <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <input
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     placeholder="Search products…"
                     className={cn(
                        "w-full h-10 pl-10 pr-4 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl",
                        "text-sm text-white placeholder:text-zinc-600",
                        "focus:outline-none focus:border-[#2A2A2A] transition-all"
                     )}
                  />
               </div>

               <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {FILTERS.map(f => (
                     <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                           "shrink-0 px-4 h-10 rounded-2xl border text-xs font-semibold transition-all",
                           activeFilter === f
                              ? "bg-white border-white text-black"
                              : "bg-[#0D0D0D] border-[#1A1A1A] text-zinc-500 hover:text-white hover:border-[#2A2A2A]"
                        )}
                     >
                        {f}
                     </button>
                  ))}
               </div>
            </div>

            {/* ── Product list ── */}
            {filtered.length === 0 ? (
               <div className="py-24 text-center border border-[#1A1A1A] bg-[#0D0D0D] rounded-2xl">
                  <Package className="h-8 w-8 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-white">No products found</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                     {search ? `No matches for "${search}"` : "Add your first product to get started."}
                  </p>
               </div>
            ) : (
               <div className="space-y-2.5">
                  {filtered.map((p) => {
                     const s = STATUS[p.status as string] ?? STATUS.draft;
                     const img = (p.images as string[])?.[0];
                     const isLowStock = !p.is_digital && (p.inventory_quantity as number) <= 5;
                     const id = p.id as string;

                     return (
                        <div
                           key={id}
                           className="group flex items-center gap-4 p-4 bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#222] rounded-2xl transition-all"
                        >
                           {/* Thumbnail */}
                           <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#151515] border border-[#1E1E1E] shrink-0">
                              {img ? (
                                 <img
                                    src={img}
                                    alt={p.name as string}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                 />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-zinc-700" />
                                 </div>
                              )}
                              {!!p.is_digital && (
                                 <div className="absolute inset-0 flex items-end p-1">
                                    <span className="text-[8px] font-bold text-white bg-orange-600/90 backdrop-blur px-1 py-0.5 rounded-md uppercase tracking-wide">
                                       Digital
                                    </span>
                                 </div>
                              )}
                           </div>

                           {/* Info */}
                           <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                 <button
                                    onClick={() => toggleStatus(id, p.status as string)}
                                    className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all hover:opacity-80", s.badge)}
                                 >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                                    {s.label}
                                 </button>
                              </div>

                              <h3 className="text-sm sm:text-base font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
                                 {p.name as string}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                 <span className="text-sm font-semibold text-white font-mono">
                                    {parseFloat(p.price as string) === 0
                                       ? <span className="text-emerald-400">Free</span>
                                       : formatMoney(Number(p.price), (p.currency as string) || undefined)
                                    }
                                 </span>

                                 <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <TrendingUp className="w-3 h-3" />
                                    {(p.sale_count as number) || 0} sales
                                 </span>

                                 {!p.is_digital && (
                                    <span className={cn("flex items-center gap-1.5 text-xs font-medium", isLowStock ? "text-rose-400" : "text-zinc-500")}>
                                       <span className={cn("w-1.5 h-1.5 rounded-full", isLowStock ? "bg-rose-500 animate-pulse" : "bg-zinc-600")} />
                                       {(p.inventory_quantity as number) || 0} in stock
                                       {isLowStock && " — Low"}
                                    </span>
                                 )}
                              </div>
                           </div>

                           {/* Actions */}
                           <div className="flex items-center gap-2 shrink-0">
                              <Link
                                 href={`/dashboard/products/${id}/edit`}
                                 className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#151515] border border-[#1E1E1E] hover:border-[#2A2A2A] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                              >
                                 <Edit className="w-3 h-3" />
                                 Edit
                              </Link>

                              <Link
                                 href={`/product/${p.slug}`}
                                 target="_blank"
                                 className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-[#151515] border border-[#1E1E1E] hover:border-[#2A2A2A] text-zinc-500 hover:text-white transition-all"
                              >
                                 <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>

                              {/* Mobile / overflow menu */}
                              <div className="relative">
                                 <button
                                    onClick={() => setOpenMenu(openMenu === id ? null : id)}
                                    className="w-8 h-8 rounded-xl bg-[#151515] border border-[#1E1E1E] hover:border-[#2A2A2A] text-zinc-500 hover:text-white flex items-center justify-center transition-all"
                                 >
                                    <MoreHorizontal className="w-4 h-4" />
                                 </button>

                                 {openMenu === id && (
                                    <>
                                       <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                                       <div className="absolute right-0 top-10 z-20 w-44 bg-[#141414] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
                                          <Link
                                             href={`/dashboard/products/${id}/edit`}
                                             onClick={() => setOpenMenu(null)}
                                             className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                                          >
                                             <Edit className="w-3.5 h-3.5" />
                                             Edit product
                                          </Link>
                                          <Link
                                             href={`/product/${p.slug}`}
                                             target="_blank"
                                             onClick={() => setOpenMenu(null)}
                                             className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                                          >
                                             <Eye className="w-3.5 h-3.5" />
                                             View live
                                          </Link>
                                          <button
                                             onClick={() => toggleStatus(id, p.status as string)}
                                             className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-[#1A1A1A] transition-colors"
                                          >
                                             <Zap className="w-3.5 h-3.5" />
                                             {p.status === "active" ? "Pause" : "Activate"}
                                          </button>
                                          <div className="border-t border-[#1E1E1E]" />
                                          <button
                                             onClick={() => deleteProduct(id, p.name as string)}
                                             className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-colors"
                                          >
                                             <Trash2 className="w-3.5 h-3.5" />
                                             Delete
                                          </button>
                                       </div>
                                    </>
                                 )}
                              </div>
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