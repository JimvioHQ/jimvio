"use client";
export const dynamic = "force-dynamic";

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
  Globe,
  Settings,
  RefreshCw,
  LayoutGrid,
  Heart,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { Badge } from "@/components/ui/badge";

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
    toast.success("Storefront details updated.");
    setVendor((prev: any) => prev ? { ...prev, ...form } : null);
    setAllVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, ...form } : v));
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Loading Storefront...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
        <GlassCard className="max-w-md w-full p-8 text-center rounded-[32px] border-border shadow-sm bg-surface dark:bg-surface/60">
          <div className="w-20 h-20 bg-surface dark:bg-surface rounded-2xl flex items-center justify-center mx-auto mb-8 border border-border shadow-sm">
             <Store className="h-8 w-8 text-stone-100" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2 tracking-tight">No Storefront Found</h2>
          <p className="text-stone-500 text-sm mb-10 leading-relaxed font-medium">Initialize your first storefront to start selling on Jimvio.</p>
          <Button asChild className="w-full h-12 rounded-xl bg-orange-500 text-white hover:bg-orange-600 font-bold active:scale-95 transition-all text-sm shadow-lg border-none">
             <Link href="/dashboard/activate/vendor">Create a Storefront <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24 animate-in fade-in duration-500 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), var(--color-bg)",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Storefront Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm">
              <div className="px-5 py-2 border-r border-border flex items-center gap-2">
                 <Store className="h-3.5 w-3.5 text-stone-300" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">My Storefronts</span>
              </div>
              {allVendors.map((v) => (
                 <button
                    key={v.id}
                    onClick={() => selectVendor(v)}
                    className={cn(
                       "px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                       vendor?.id === v.id 
                          ? "bg-stone-900 text-white shadow-md scale-105" 
                          : "text-stone-400 hover:text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50"
                    )}
                 >
                    {v.business_name}
                 </button>
              ))}
           </div>

           <Button className="h-11 px-6 rounded-xl bg-surface dark:bg-surface text-stone-900 dark:text-white font-bold text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-all hover:bg-surface-secondary dark:bg-surface/50 border border-border" asChild>
              <Link href="/dashboard/activate/vendor"><Plus className="h-4 w-4 mr-2" /> New Storefront</Link>
           </Button>
        </div>

        {/* Store Header */}
        <div className="relative group">
           <div className="h-64 sm:h-80 rounded-[32px] overflow-hidden bg-stone-100 border border-white shadow-sm relative">
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
              {editing ? (
                 <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl">
                    <CloudinaryUploadButton
                       folder="jimvio/banners"
                       resourceType="image"
                       onUploadSuccess={(url) => setForm((f) => ({ ...f, business_banner: url }))}
                       buttonText="Change Banner"
                       className="bg-white dark:bg-surface text-stone-900 dark:text-white h-11 px-8 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all border-none"
                    />
                 </div>
              ) : (
                 vendor.business_banner ? (
                    <img src={vendor.business_banner} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                 ) : (
                    <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                       <ImageIcon className="h-12 w-12 text-white/10" />
                    </div>
                 )
              )}
              
              {/* Overlay Content */}
              <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                 <div className="flex items-center gap-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface dark:bg-surface border-[3px] border-border shadow-xl relative overflow-hidden shrink-0">
                       {editing ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-surface dark:bg-surface z-20">
                             <CloudinaryUploadButton
                                folder="jimvio/avatars"
                                resourceType="image"
                                onUploadSuccess={(url) => setForm((f) => ({ ...f, business_logo: url }))}
                                buttonText="LOGO"
                                className="text-[10px] font-bold uppercase bg-stone-50 dark:bg-surface/50 text-stone-900 dark:text-white h-full w-full rounded-xl border-none"
                             />
                          </div>
                       ) : (
                          vendor.business_logo ? (
                             <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-surface/50">
                                <Store className="h-8 w-8 text-stone-100" />
                             </div>
                          )
                       )}
                    </div>
                    
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-500 text-white border-none text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Verified Vendor</Badge>
                       </div>
                       {editing ? (
                          <Input 
                             value={form.business_name} 
                             onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                             className="h-12 bg-white dark:bg-surface/20 backdrop-blur-xl border-white/20 text-white text-2xl font-bold rounded-xl mb-1 w-full max-w-sm placeholder:text-white/40 focus:ring-0"
                          />
                       ) : (
                          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{vendor.business_name}</h1>
                       )}
                       <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">jimvio.com/vendors/{vendor.business_slug}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-2">
                    {editing ? (
                       <>
                          <Button variant="ghost" className="h-10 px-5 text-white/80 font-bold text-[10px] uppercase tracking-widest hover:text-white hover:bg-white dark:bg-surface/10" onClick={() => setEditing(false)}>Cancel</Button>
                          <Button disabled={saving} onClick={handleSave} className="h-10 px-6 rounded-xl bg-white dark:bg-surface text-stone-900 dark:text-white hover:bg-white dark:bg-surface/90 font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all border-none">
                             {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
                          </Button>
                       </>
                    ) : (
                       <>
                          <Link href={`/vendors/${vendor.business_slug}`} target="_blank">
                             <Button variant="outline" className="h-10 px-5 rounded-lg border-white/20 bg-white dark:bg-surface/10 backdrop-blur-xl text-white hover:bg-white dark:bg-surface/20 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                                View Public <ExternalLink className="h-3 w-3 ml-2" />
                             </Button>
                          </Link>
                          <Button onClick={() => setEditing(true)} className="h-10 px-6 rounded-lg bg-orange-500 text-white hover:bg-orange-600 font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all border-none">
                             <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Storefront
                          </Button>
                       </>
                    )}
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Left Content Column */}
           <div className="lg:col-span-8 space-y-8">
              
              {/* Description Box */}
              <GlassCard className="p-8 rounded-[28px] bg-surface dark:bg-surface/60 border-border shadow-sm relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Store Description</h3>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                 </div>
                 {editing ? (
                    <Textarea 
                       value={form.business_description}
                       onChange={(e) => setForm(f => ({ ...f, business_description: e.target.value }))}
                       className="min-h-[140px] rounded-xl bg-white dark:bg-surface border-stone-100 dark:border-border text-sm font-medium leading-relaxed shadow-sm focus:ring-4 focus:ring-stone-500/5 focus:border-stone-200 dark:border-border p-6 resize-none"
                       placeholder="Write a brief description of your storefront..."
                    />
                 ) : (
                    <p className="text-base font-medium text-stone-700 leading-relaxed">
                       {vendor.business_description || "Add a description to tell customers about your store."}
                    </p>
                 )}
              </GlassCard>

              {/* Products Grid */}
              <section className="space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                       <h2 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">Top Products</h2>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{products.length} Items Listed</p>
                    </div>
                    <Link href="/dashboard/products/new">
                       <Button className="h-10 px-5 rounded-xl bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-sm hover:bg-black transition-all border-none">
                          <Plus className="h-3.5 w-3.5 mr-2" /> New Product
                       </Button>
                    </Link>
                 </div>

                 {products.length === 0 ? (
                    <GlassCard className="py-16 text-center rounded-[28px] border-dashed border-border bg-surface dark:bg-surface/20">
                       <Package className="h-10 w-10 text-stone-400 dark:text-stone-600 mx-auto mb-4" />
                       <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">No products listed</h3>
                       <p className="text-xs font-medium text-stone-400 mt-2 mb-8">Ready to start selling? List your first inventory item.</p>
                       <Link href="/dashboard/products/new">
                          <Button className="h-11 px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm bg-white dark:bg-surface border-stone-100 dark:border-border text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50">
                             Add Product
                          </Button>
                       </Link>
                    </GlassCard>
                 ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {products.map((p) => (
                          <Link key={p.id} href={`/dashboard/products/${p.id}/edit`} className="group outline-none">
                             <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm hover:bg-surface-secondary dark:hover:bg-zinc-800 hover:shadow-md transition-all active:scale-[0.98]">
                                <div className="w-16 h-16 rounded-xl bg-surface-secondary dark:bg-surface-secondary border border-border shadow-sm overflow-hidden p-0.5 shrink-0">
                                   {p.images?.[0] ? (
                                      <img src={p.images[0]} alt="" className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform" />
                                   ) : (
                                      <div className="w-full h-full bg-surface-secondary dark:bg-surface/50 flex items-center justify-center rounded-lg"><Package className="h-5 w-5 text-stone-400" /></div>
                                   )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-0.5">
                                      <span className={cn(
                                        "text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-widest",
                                        p.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                      )}>
                                         {p.status}
                                      </span>
                                   </div>
                                   <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate tracking-tight">{p.name}</h4>
                                   <p className="text-base font-black text-stone-900 dark:text-white tabular-nums">{formatMoney(Number(p.price), (p as any).currency)}</p>
                                </div>

                                <div className="h-8 w-8 rounded-full bg-stone-50 dark:bg-surface/50 flex items-center justify-center text-stone-300 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm">
                                   <ChevronRight className="h-4 w-4" />
                                </div>
                             </div>
                          </Link>
                       ))}
                    </div>
                 )}
              </section>
           </div>

           {/* Right Sidebar Column */}
           <div className="lg:col-span-4 space-y-6">
              
              {/* Simple Stats List */}
              <div className="grid grid-cols-1 gap-4">
                 {[
                    { label: "Store Rating", value: (vendor.rating || 0).toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Followers", value: followers, icon: Users, color: "text-sky-500", bg: "bg-sky-50" },
                    { label: "Total Sales", value: vendor.total_sales || 0, icon: ShoppingBag, color: "text-indigo-500", bg: "bg-indigo-50" },
                 ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border bg-surface-secondary dark:bg-surface-secondary shadow-sm", stat.color)}>
                             <stat.icon className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-lg font-bold text-stone-900 dark:text-white tabular-nums leading-none tracking-tight">{stat.value}</p>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1.5">{stat.label}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>

              {/* Promo Banner - Softer */}
              <GlassCard className="p-8 rounded-[32px] bg-stone-900 text-white relative overflow-hidden shadow-lg border-none">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                 <Sparkles className="h-6 w-6 text-orange-400 mb-6" />
                 <h3 className="text-xl font-bold tracking-tight mb-2 leading-none text-white">Boost Your Sales</h3>
                 <p className="text-stone-400 text-xs font-medium leading-relaxed mb-8">
                    Start an affiliate campaign to get influencers promoting your products to their audience.
                 </p>
                 <Link href="/dashboard/vendor/campaigns/new">
                    <Button className="w-full bg-white dark:bg-surface text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50 h-11 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all outline-none border-none">
                       Start a Mission <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                 </Link>
              </GlassCard>
              
              {/* Public Link Card */}
              <div className="p-8 rounded-[32px] bg-surface dark:bg-surface border border-border shadow-sm text-center space-y-4">
                 <div className="w-10 h-10 bg-surface-secondary dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto text-stone-500">
                    <Globe className="h-5 w-5" />
                 </div>
                 <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1">Public Marketplace Link</h4>
                    <p className="text-xs font-bold text-stone-900 dark:text-white">jimvio.com/vendors/{vendor.business_slug}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// Missing icon
function ShoppingBag(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
