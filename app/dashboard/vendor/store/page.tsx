"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Star,
  Users,
  Package,
  Pencil,
  Save,
  X,
  Camera,
  ArrowUpRight,
  CheckCircle,
  ExternalLink,
  Loader2,
  Plus,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

export default function VendorStorePage() {
  const { formatMoney } = useCurrency();
  const supabase = createClient();
  
  const [vendor, setVendor] = useState<any | null>(null);
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    business_name: "",
    business_description: "",
    business_logo: "",
    business_banner: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: vs } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      setAllVendors(vs ?? []);
      const v = vs?.[0] || null; 
      if (v) selectVendor(v);
      else setLoading(false);
    }
    load();
  }, []);

  async function selectVendor(v: any) {
    setLoading(true);
    setVendor(v);
    setForm({
      business_name: v.business_name ?? "",
      business_description: v.business_description ?? "",
      business_logo: v.business_logo ?? "",
      business_banner: v.business_banner ?? "",
    });
    
    const [prods, follow] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, price, images, status, product_type, currency")
        .eq("vendor_id", v.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("vendor_followers")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", v.id),
    ]);
    
    setProducts(prods.data ?? []);
    setFollowers(follow.count ?? 0);
    setEditing(false);
    setLoading(false);
  }

  async function handleSave() {
    if (!vendor) return;
    setSaving(true);
    const { error } = await supabase
      .from("vendors")
      .update({
        business_name: form.business_name.trim(),
        business_description: form.business_description.trim() || null,
        business_logo: form.business_logo.trim() || null,
        business_banner: form.business_banner.trim() || null,
      })
      .eq("id", vendor.id);
      
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Store updated");
    setVendor((prev: any) => prev ? { ...prev, ...form } : null);
    
    // Update allVendors array too
    setAllVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, ...form } : v));
    
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-100 border-t-zinc-900 animate-spin" />
          <Store className="absolute inset-0 m-auto h-6 w-6 text-zinc-900" />
        </div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Synchronizing Vault...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <div className="w-24 h-24 bg-zinc-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-zinc-100 shadow-xl">
           <Store className="h-10 w-10 text-zinc-300" />
        </div>
        <h2 className="text-3xl font-black text-zinc-900 mb-4 tracking-tighter">Identity Required</h2>
        <p className="text-zinc-400 text-sm mb-12 leading-relaxed font-semibold">Deploy your first merchant storefront to start selling globally on Jimvio.</p>
        <Button asChild size="lg" className="w-full h-14 rounded-2xl bg-zinc-900 text-white hover:bg-black font-black active:scale-95 transition-all text-xs uppercase tracking-widest shadow-2xl">
           <Link href="/dashboard/vendor/setup">Activate Merchant Token →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-500 fade-in pb-20 px-4 md:px-0">
      
      {/* ── STORE VAULT SELECTOR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 text-white p-3 rounded-[28px] shadow-2xl shadow-zinc-950/20">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-2">
            <div className="flex items-center gap-2 pr-4 border-r border-zinc-800">
               <Store className="h-4 w-4 text-zinc-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">My Vault</span>
            </div>
            {allVendors.map((v) => (
               <button
                  key={v.id}
                  onClick={() => selectVendor(v)}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    vendor?.id === v.id 
                      ? "bg-white text-zinc-900 shadow-lg scale-105" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
               >
                  {v.business_name}
               </button>
            ))}
         </div>
         <Link href="/dashboard/vendor/setup">
            <Button size="sm" className="bg-emerald-500 text-white gap-2 rounded-xl h-10 px-5 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg hover:bg-emerald-600">
               <Plus className="h-4 w-4" /> Deploy New Storefront
            </Button>
         </Link>
      </div>

      {/* ── PREMIUM HERO ── */}
      <div className="relative group">
         <div className="h-64 md:h-80 rounded-[28px] overflow-hidden bg-zinc-100 border border-zinc-200 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
            {editing ? (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
                  <CloudinaryUploadButton
                     folder="jimvio/banners"
                     resourceType="image"
                     onUploadSuccess={(url) => setForm((f) => ({ ...f, business_banner: url }))}
                     buttonText="Replace Backdrop"
                     className="bg-white text-zinc-900 h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest"
                  />
               </div>
            ) : (
               vendor.business_banner && <img src={vendor.business_banner} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
            )}
            
            {/* Identity Overlay */}
            <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div className="flex items-center gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-[24px] bg-white border-4 border-white shadow-2xl relative overflow-hidden shrink-0">
                     {editing ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 z-20 p-2">
                           <CloudinaryUploadButton
                              folder="jimvio/avatars"
                              resourceType="image"
                              onUploadSuccess={(url) => setForm((f) => ({ ...f, business_logo: url }))}
                              buttonText="Logo"
                              className="text-[10px] font-black uppercase bg-zinc-100 text-zinc-900 border-none h-full w-full rounded-xl"
                           />
                        </div>
                     ) : (
                        vendor.business_logo ? <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Store className="h-10 w-10 text-zinc-200" /></div>
                     )}
                  </div>
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-widest">VERIFIED MERCHANT</span>
                        <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">/vendors/{vendor.business_slug}</span>
                     </div>
                     {editing ? (
                        <Input 
                           value={form.business_name} 
                           onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                           className="h-12 bg-white/10 backdrop-blur-md border-white/20 text-white text-2xl font-black rounded-xl mb-2 w-full max-w-sm"
                        />
                     ) : (
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">{vendor.business_name}</h1>
                     )}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  {editing ? (
                     <>
                        <Button variant="ghost" className="h-10 text-white/60 font-black text-[10px] uppercase" onClick={() => setEditing(false)}>Cancel</Button>
                        <Button disabled={saving} onClick={handleSave} className="h-10 px-8 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 font-black text-[10px] uppercase shadow-2xl">
                           {saving ? <Loader2 className="h-4 w-4 animate-spin text-zinc-900" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
                        </Button>
                     </>
                  ) : (
                     <>
                        <Link href={`/vendors/${vendor.business_slug}`} target="_blank">
                           <Button variant="outline" className="h-10 px-5 rounded-xl border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest">
                              Public View <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
                           </Button>
                        </Link>
                        <Button onClick={() => setEditing(true)} className="h-10 px-6 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 font-black text-[10px] uppercase tracking-widest shadow-2xl">
                           <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Storefront
                        </Button>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start">
         
         {/* ── LEFT: INTELLIGENCE & INFO ── */}
         <div className="lg:col-span-4 space-y-8">
            
            {/* Bio Card */}
            <div className="rounded-[28px] bg-white border border-zinc-100 p-8 shadow-sm group">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Merchant Statement</h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               </div>
               {editing ? (
                  <Textarea 
                     value={form.business_description}
                     onChange={(e) => setForm(f => ({ ...f, business_description: e.target.value }))}
                     className="min-h-[140px] rounded-xl bg-zinc-50 border-zinc-100 text-sm font-medium resize-none leading-relaxed"
                  />
               ) : (
                  <p className="text-zinc-600 text-sm leading-relaxed font-semibold">
                     {vendor.business_description || "Brand identity currently undisclosed. Define your merchant statement."}
                  </p>
               )}
            </div>

            {/* Intelligence Grid */}
            <div className="grid grid-cols-1 gap-3">
               {[
                  { label: "Trust Score", value: (vendor.rating || 0).toFixed(1), icon: Star, trend: "Institutional Grade" },
                  { label: "Community", value: followers, icon: Users, trend: "Subscribed Members" },
                  { label: "Global Sales", value: vendor.total_sales || 0, icon: Package, trend: "All-time Fulfillment" },
               ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-[24px] bg-zinc-50 border border-zinc-100 group hover:border-zinc-300 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-900 shadow-sm transition-transform group-hover:scale-110">
                           <stat.icon className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-lg font-black text-zinc-900 leading-tight">{stat.value}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
                        </div>
                     </div>
                     <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300 transform -rotate-90 group-hover:text-zinc-500 transition-colors">{stat.trend}</p>
                  </div>
               ))}
            </div>

            {/* Growth Card */}
            <div className="rounded-[28px] bg-zinc-900 p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl rounded-full translate-x-10 -translate-y-10" />
               <Sparkles className="h-6 w-6 text-emerald-400 mb-6" />
               <h3 className="text-lg font-black tracking-tight mb-2">Viral Acceleration</h3>
               <p className="text-zinc-400 text-xs font-semibold leading-relaxed mb-6">
                  Need more eyes on your storefront? Launch a content mission and tap into our network of creators.
               </p>
               <Link href="/dashboard/vendor/campaigns/new">
                  <Button className="w-full bg-white text-zinc-900 hover:bg-zinc-100 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest">
                     Launch Mission <ArrowRight className="h-3.5 w-3.5 ml-2" />
                  </Button>
               </Link>
            </div>
         </div>

         {/* ── RIGHT: INVENTORY REGISTRY ── */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
               <div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tighter">Inventory Registry</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-0.5">{products.length} Public Listings</p>
               </div>
               <Link href="/dashboard/products/new">
                  <Button size="sm" className="h-10 px-5 rounded-xl bg-zinc-900 text-white hover:bg-black font-black text-[10px] uppercase tracking-widest shadow-xl shadow-zinc-900/10 active:scale-95 transition-all">
                     <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Add Product
                  </Button>
               </Link>
            </div>

            {products.length === 0 ? (
               <div className="py-24 text-center rounded-[28px] bg-zinc-50 border border-zinc-100 border-dashed group">
                  <Package className="h-12 w-12 text-zinc-200 mx-auto mb-4 group-hover:scale-110 transition-transform duration-500" />
                  <h3 className="text-lg font-black text-zinc-900">Shelves Undeployed</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-8 max-w-[200px] mx-auto">Start populating your storefront with verified assets.</p>
                  <Link href="/dashboard/products/new">
                     <Button variant="outline" className="h-12 px-10 rounded-xl border-zinc-200 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 shadow-sm active:scale-95 transition-all">
                        Deploy First Product
                     </Button>
                  </Link>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((p) => (
                    <Link key={p.id} href={`/dashboard/products/${p.id}/edit`} className="group">
                        <div className="flex items-center gap-4 p-4 rounded-[24px] bg-white border border-zinc-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-zinc-200 hover:-translate-y-1">
                           <div className="w-20 h-20 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <Package className="h-8 w-8 text-zinc-200" />
                              )}
                              <div className="absolute top-1 right-1 bg-white/90 backdrop-blur rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Pencil className="h-3 w-3 text-zinc-900" />
                              </div>
                           </div>
                           
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                 <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                    p.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                 )}>{p.status}</span>
                                 <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">{p.product_type}</span>
                              </div>
                              <h4 className="text-base font-black text-zinc-900 truncate tracking-tight">{p.name}</h4>
                              <p className="text-xl font-black text-zinc-900 mt-1">{formatMoney(Number(p.price), (p as any).currency)}</p>
                           </div>

                           <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                              <ArrowRight className="h-4 w-4" />
                           </div>
                        </div>
                    </Link>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
