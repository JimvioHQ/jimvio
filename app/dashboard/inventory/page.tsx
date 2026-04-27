"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Package, AlertTriangle, TrendingDown, RefreshCw, Loader2, ArrowRight, Zap, ShieldCheck, Activity, Search, ArrowLeft, MoreVertical, Plus } from "lucide-react";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [vendor, setVendor]     = useState<Record<string, unknown> | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editQty, setEditQty]   = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: vend } = await supabase.from("vendors").select("id").eq("user_id", user.id).maybeSingle();
      setVendor(vend ?? null);

      if (vend) {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, status, product_type, inventory_quantity, low_stock_threshold, sale_count, images")
          .eq("vendor_id", vend.id)
          .eq("is_active", true)
          .eq("product_type", "physical")
          .order("inventory_quantity", { ascending: true });
        setProducts(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function updateInventory(productId: string, quantity: string) {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) return;
    setUpdating(productId);
    const supabase = createClient();
    await supabase.from("products").update({ inventory_quantity: qty }).eq("id", productId);
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, inventory_quantity: qty } : p));
    setEditQty(prev => { const n = { ...prev }; delete n[productId]; return n; });
    setUpdating(null);
  }

  const outOfStock = products.filter(p => (p.inventory_quantity as number) === 0).length;
  const lowStock   = products.filter(p => (p.inventory_quantity as number) > 0 && (p.inventory_quantity as number) <= ((p.low_stock_threshold as number) ?? 5)).length;
  const totalUnits = products.reduce((s, p) => s + (p.inventory_quantity as number ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted capitalize pl-1">Loading Inventory...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <div className="max-w-md w-full p-10 text-center space-y-8 bg-surface dark:bg-surface rounded-sm border border-border shadow-none">
          <div className="w-16 h-16 bg-surface-secondary dark:bg-surface-secondary rounded-sm flex items-center justify-center mx-auto border border-border">
             <ShieldCheck className="h-8 w-8 text-stone-200 dark:text-stone-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">Access Denied</h2>
            <p className="text-stone-400 dark:text-text-muted text-[13px] font-medium leading-relaxed">Please register as a vendor to manage your product inventory.</p>
          </div>
          <Button asChild className="w-full h-12 rounded-sm bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white hover:bg-black dark:hover:bg-stone-100 font-bold active:scale-95 transition-all text-[11px] capitalize border-none">
             <Link href="/dashboard/roles">Activate Vendor Role</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20"
      style={{
        background: "var(--color-bg)",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8 px-4 sm:px-6 pt-4 sm:pt-10">
        
        {/* Header - Simpler */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
               <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-sm bg-surface dark:bg-surface-secondary border border-border shadow-none hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-text-muted">
                 <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
               </Button>
               <div className="space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Product Inventory</h1>
                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest leading-none pl-0.5 opacity-80">Track and manage your physical stock</p>
               </div>
            </div>
                      <div className="flex items-center gap-2">
               <Button asChild className="h-9 sm:h-10 px-6 rounded-sm bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-none active:scale-95 transition-all hover:bg-black dark:hover:bg-stone-100 border-none">
                 <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-2" /> Add Product</Link>
               </Button>
            </div>
         </div>

        {/* Stats Grid - Soft & Compact */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-sm sm:rounded-sm bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-4">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm sm:rounded-sm bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0 border border-sky-500/10">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
               </div>
               <div>
                  <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{totalUnits.toLocaleString()}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Total Units</p>
               </div>
            </div>
            <div className="p-4 sm:p-5 rounded-sm sm:rounded-sm bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-3 sm:gap-4">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm sm:rounded-sm bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 border border-orange-500/10">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
               </div>
               <div>
                  <p className="text-lg sm:text-xl font-black text-stone-900 dark:text-white leading-none tabular-nums">{lowStock}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Low Stock</p>
               </div>
            </div>
            <div className="p-4 sm:p-5 rounded-sm sm:rounded-sm bg-surface/60 dark:bg-surface-secondary/40 border border-border shadow-none flex items-center gap-3 sm:gap-4">
               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm sm:rounded-sm bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/10">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
               </div>
               <div>
                  <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-500 leading-none tabular-nums">{outOfStock}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted mt-1">Out of Stock</p>
               </div>
            </div>
        </div>

        {/* Inventory Table - Full-width Mobile */}
         <GlassCard className="rounded-sm sm:rounded-sm border-border max-sm:-mx-4 max-sm:rounded-sm max-sm:border-x-0 bg-surface/60 dark:bg-surface-secondary/40 backdrop-blur-md shadow-none overflow-hidden text-left">
            <div className="p-4 sm:p-8 border-b border-border bg-surface/40 dark:bg-surface/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
               <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight">Stock List</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest opacity-80">Real-time inventory levels</p>
               </div>
               <div className="relative group max-w-sm w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                     placeholder="Search inventory..." 
                     className="w-full h-10 sm:h-11 pl-11 pr-4 rounded-sm bg-surface dark:bg-surface-secondary border border-border text-[13px] font-medium text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 shadow-none focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all"
                  />
               </div>
            </div>
                      <div className="overflow-x-auto">
               {products.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                     <div className="w-12 h-12 bg-surface dark:bg-surface-secondary rounded-sm flex items-center justify-center mx-auto border border-border">
                        <Package className="h-6 w-6 text-stone-300 dark:text-stone-700" />
                     </div>
                     <p className="text-[12px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">No inventory items found</p>
                  </div>
               ) : (
                 <table className="w-full text-left min-w-[750px] sm:min-w-0">
                  <thead>
                    <tr className="bg-surface/40 dark:bg-surface/20 border-b border-border">
                      <th className="px-5 sm:px-8 py-4 sm:py-5 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">Product</th>
                      <th className="px-5 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">Total Sales</th>
                      <th className="px-5 sm:px-8 py-4 sm:py-5 text-center text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">Status</th>
                      <th className="px-5 sm:px-8 py-4 sm:py-5 text-right text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted">Stock Count</th>
                      <th className="px-5 sm:px-8 py-4 sm:py-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {products.map((p) => {
                      const qty       = p.inventory_quantity as number ?? 0;
                      const threshold = (p.low_stock_threshold as number) ?? 5;
                      const isOut     = qty === 0;
                      const isLow     = qty > 0 && qty <= threshold;
                      const images    = (p.images as string[]) ?? [];
                      const isEditing = editQty[p.id as string] !== undefined;

                      return (
                        <tr key={p.id as string} className="hover:bg-surface-secondary/60 dark:hover:bg-zinc-800/40 transition-all duration-300 group">
                          <td className="px-5 sm:px-8 py-5 sm:py-6 text-left">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-sm sm:rounded-sm bg-surface-secondary dark:bg-surface-secondary border border-border overflow-hidden shrink-0 shadow-none">
                                {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-300 dark:text-stone-700">{String(p.name)[0]}</div>}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[14px] font-bold text-stone-900 dark:text-white truncate tracking-tight group-hover:text-orange-600 transition-colors">{p.name as string}</p>
                                <p className="text-[9px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest mt-1 opacity-70">{p.product_type as string}</p>
                              </div>
                            </div>
                          </td>
                           <td className="px-5 sm:px-8 py-5 sm:py-6 text-right text-[12px] font-bold text-stone-400 dark:text-text-muted tabular-nums">
                            {(p.sale_count as number ?? 0).toLocaleString()} <span className="text-[10px] opacity-60">sold</span>
                          </td>
                          <td className="px-5 sm:px-8 py-5 sm:py-6">
                            <div className="flex justify-center">
                               <GlassPill color={isOut ? "red" : isLow ? "orange" : "emerald"} className="font-black text-[7px] sm:text-[9px] px-3 py-1.5 uppercase tracking-widest border-none shadow-none scale-90 sm:scale-100">
                                 {isOut ? "Out of Stock" : isLow ? "Low Stock" : "Sufficient"}
                               </GlassPill>
                            </div>
                          </td>
                          <td className="px-5 sm:px-8 py-5 sm:py-6 text-right">
                            {isEditing ? (
                              <div className="flex justify-end">
                                 <input
                                   type="number"
                                   value={editQty[p.id as string]}
                                   onChange={e => setEditQty(prev => ({ ...prev, [p.id as string]: e.target.value }))}
                                   className="w-16 sm:w-20 h-8 sm:h-9 px-3 text-[13px] font-bold text-stone-900 dark:text-white text-right rounded-sm bg-surface dark:bg-surface-secondary border border-border outline-none focus:ring-2 focus:ring-orange-500/10 transition-all shadow-none"
                                   min="0"
                                   autoFocus
                                 />
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                 <p 
                                   className={cn(
                                      "text-base sm:text-lg font-black tabular-nums tracking-tight cursor-pointer hover:underline underline-offset-4 decoration-dotted decoration-border",
                                      isOut ? "text-rose-500" : isLow ? "text-orange-500" : "text-stone-900 dark:text-white"
                                   )}
                                   onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}
                                 >
                                   {qty}
                                 </p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 sm:px-8 py-5 sm:py-6 text-right">
                            {isEditing ? (
                              <div className="flex gap-1.5 justify-end">
                                 <Button size="sm" className="h-8 sm:h-9 px-3 sm:px-4 rounded-sm bg-stone-900 dark:bg-white dark:bg-surface text-white dark:text-stone-900 dark:text-white font-bold text-[9px] sm:text-[10px] capitalize shadow-none" loading={updating === p.id as string} onClick={() => updateInventory(p.id as string, editQty[p.id as string])}>
                                  Save
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 sm:h-9 px-3 rounded-sm font-bold text-[9px] sm:text-[10px] capitalize text-stone-400 dark:text-stone-600" onClick={() => setEditQty(prev => { const n = { ...prev }; delete n[p.id as string]; return n; })}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-sm text-stone-300 dark:text-stone-700 hover:text-stone-900 dark:text-white dark:hover:text-white hover:bg-surface dark:hover:bg-zinc-800 transition-colors"
                                 onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}>
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
           </div>
        </GlassCard>
      </div>
    </div>
  );
}

