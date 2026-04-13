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
          .select("id, name, slug, status, product_type, is_digital, inventory_quantity, low_stock_threshold, sale_count, images")
          .eq("vendor_id", vend.id)
          .eq("is_active", true)
          .eq("is_digital", false)  
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 capitalize pl-1">Loading Inventory...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f8f7f5" }}>
        <div className="max-w-md w-full p-10 text-center space-y-8 bg-white rounded-[32px] border border-stone-100 shadow-sm">
          <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto border border-stone-100">
             <ShieldCheck className="h-8 w-8 text-stone-200" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Access Denied</h2>
            <p className="text-stone-400 text-[13px] font-medium leading-relaxed">Please register as a vendor to manage your product inventory.</p>
          </div>
          <Button asChild className="w-full h-12 rounded-xl bg-stone-900 text-white hover:bg-black font-bold active:scale-95 transition-all text-[11px] capitalize border-none">
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
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8 px-6 pt-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-white border border-stone-100 shadow-sm hover:bg-white active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="space-y-1">
                 <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Product Inventory</h1>
                 <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest leading-none pl-0.5">Track and manage your physical stock</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <Button asChild className="h-10 px-6 rounded-xl bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all hover:bg-black border-none">
                <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-2" /> Add Product</Link>
              </Button>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <div className="p-6 rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 shrink-0">
                 <Activity className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-lg font-black text-stone-900 leading-none">{totalUnits.toLocaleString()}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1.5">Total Units</p>
              </div>
           </div>
           <div className="p-6 rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                 <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-lg font-black text-stone-900 leading-none">{lowStock}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1.5">Low Stock</p>
              </div>
           </div>
           <div className="p-6 rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                 <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-lg font-black text-stone-900 leading-none text-rose-600">{outOfStock}</p>
                 <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-1.5">Out of Stock</p>
              </div>
           </div>
        </div>

        {/* Inventory Table */}
        <GlassCard className="rounded-[32px] border-white bg-white/60 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-stone-50 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                 <h3 className="text-lg font-bold text-stone-900 tracking-tight">Stock List</h3>
                 <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Real-time inventory levels</p>
              </div>
              <div className="relative group max-w-sm w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                 <input 
                    placeholder="Search inventory..." 
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-stone-100 text-[13px] font-medium text-stone-900 placeholder:text-stone-300 shadow-sm focus:outline-none focus:ring-4 focus:ring-stone-900/5 transition-all"
                 />
              </div>
           </div>
           
           <div className="overflow-x-auto">
             {products.length === 0 ? (
               <div className="py-20 text-center space-y-4">
                  <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto border border-stone-100">
                     <Package className="h-6 w-6 text-stone-200" />
                  </div>
                  <p className="text-[12px] font-bold text-stone-400 uppercase tracking-widest">No inventory items found</p>
               </div>
             ) : (
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-stone-50/40">
                     <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-stone-400">Product</th>
                     <th className="px-8 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Sales</th>
                     <th className="px-8 py-5 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">Status</th>
                     <th className="px-8 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-stone-400">Stock Count</th>
                     <th className="px-8 py-5" />
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-50">
                   {products.map((p) => {
                     const qty       = p.inventory_quantity as number ?? 0;
                     const threshold = (p.low_stock_threshold as number) ?? 5;
                     const isOut     = qty === 0;
                     const isLow     = qty > 0 && qty <= threshold;
                     const images    = (p.images as string[]) ?? [];
                     const isEditing = editQty[p.id as string] !== undefined;

                     return (
                       <tr key={p.id as string} className="hover:bg-white/60 transition-all duration-300 group">
                         <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 overflow-hidden shrink-0">
                               {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-stone-300">{String(p.name)[0]}</div>}
                             </div>
                             <div className="min-w-0">
                               <p className="text-[14px] font-bold text-stone-900 truncate tracking-tight">{p.name as string}</p>
                               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{p.product_type as string}</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-8 py-6 text-right text-sm font-bold text-stone-400 tabular-nums">
                           {(p.sale_count as number ?? 0).toLocaleString()} sold
                         </td>
                         <td className="px-8 py-6">
                           <div className="flex justify-center">
                              <GlassPill color={isOut ? "red" : isLow ? "orange" : "emerald"} className="font-bold text-[9px] px-3 py-1.5 uppercase tracking-widest border-none shadow-none">
                                {isOut ? "Out of Stock" : isLow ? "Low Stock" : "Sufficient"}
                              </GlassPill>
                           </div>
                         </td>
                         <td className="px-8 py-6 text-right">
                           {isEditing ? (
                             <div className="flex justify-end">
                                <input
                                  type="number"
                                  value={editQty[p.id as string]}
                                  onChange={e => setEditQty(prev => ({ ...prev, [p.id as string]: e.target.value }))}
                                  className="w-20 h-9 px-3 text-[13px] font-bold text-stone-900 text-right rounded-lg bg-white border border-stone-200 outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                                  min="0"
                                  autoFocus
                                />
                             </div>
                           ) : (
                             <div className="flex flex-col items-end">
                                <p 
                                  className={cn(
                                     "text-lg font-bold tabular-nums tracking-tight cursor-pointer hover:underline underline-offset-4 decoration-dotted decoration-stone-200",
                                     isOut ? "text-rose-500" : isLow ? "text-orange-500" : "text-stone-900"
                                  )}
                                  onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}
                                >
                                  {qty}
                                </p>
                             </div>
                           )}
                         </td>
                         <td className="px-8 py-6 text-right">
                           {isEditing ? (
                             <div className="flex gap-2 justify-end">
                               <Button size="sm" className="h-9 px-4 rounded-lg bg-stone-900 text-white font-bold text-[10px] capitalize" loading={updating === p.id as string} onClick={() => updateInventory(p.id as string, editQty[p.id as string])}>
                                 Save
                               </Button>
                               <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-bold text-[10px] capitalize text-stone-400" onClick={() => setEditQty(prev => { const n = { ...prev }; delete n[p.id as string]; return n; })}>
                                 Cancel
                               </Button>
                             </div>
                           ) : (
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-50"
                               onClick={() => setEditQty(prev => ({ ...prev, [p.id as string]: String(qty) }))}>
                               <RefreshCw className="h-4 w-4" />
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
