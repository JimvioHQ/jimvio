// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect } from "react";
// import Link from "next/link";
// import {
//   Store,
//   Star,
//   Users,
//   Package,
//   Pencil,
//   Save,
//   X,
//   Camera,
//   ArrowUpRight,
//   CheckCircle,
//   ExternalLink,
//   Plus,
//   Sparkles,
//   ChevronRight,
//   ArrowRight,
//   Globe,
//   Settings,
//   Loader2,
//   LayoutGrid,
//   Heart,
//   Image as ImageIcon
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
// import { createClient } from "@/lib/supabase/client";
// import { useCurrency } from "@/context/CurrencyContext";
// import { toast } from "sonner";
// import { cn } from "@/lib/utils";
// import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
// import { Badge } from "@/components/ui/badge";

// export default function VendorStorePage() {
//   const { formatMoney } = useCurrency();
//   const supabase = createClient();

//   const [vendor, setVendor] = useState<any | null>(null);
//   const [allVendors, setAllVendors] = useState<any[]>([]);
//   const [products, setProducts] = useState<any[]>([]);
//   const [followers, setFollowers] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [editing, setEditing] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     business_name: "",
//     business_description: "",
//     business_logo: "",
//     business_banner: "",
//   });

//   useEffect(() => {
//     async function load() {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;

//       const { data: vs } = await supabase
//         .from("vendors")
//         .select("*")
//         .eq("user_id", user.id)
//         .order("created_at", { ascending: false });

//       setAllVendors(vs ?? []);
//       const v = vs?.[0] || null; 
//       if (v) selectVendor(v);
//       else setLoading(false);
//     }
//     load();
//   }, []);

//   async function selectVendor(v: any) {
//     setLoading(true);
//     setVendor(v);
//     setForm({
//       business_name: v.business_name ?? "",
//       business_description: v.business_description ?? "",
//       business_logo: v.business_logo ?? "",
//       business_banner: v.business_banner ?? "",
//     });

//     const [prods, follow] = await Promise.all([
//       supabase
//         .from("products")
//         .select("id, name, slug, price, images, status, product_type, currency")
//         .eq("vendor_id", v.id)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false })
//         .limit(8),
//       supabase
//         .from("vendor_followers")
//         .select("id", { count: "exact", head: true })
//         .eq("vendor_id", v.id),
//     ]);

//     setProducts(prods.data ?? []);
//     setFollowers(follow.count ?? 0);
//     setEditing(false);
//     setLoading(false);
//   }

//   async function handleSave() {
//     if (!vendor) return;
//     setSaving(true);
//     const { error } = await supabase
//       .from("vendors")
//       .update({
//         business_name: form.business_name.trim(),
//         business_description: form.business_description.trim() || null,
//         business_logo: form.business_logo.trim() || null,
//         business_banner: form.business_banner.trim() || null,
//       })
//       .eq("id", vendor.id);

//     setSaving(false);
//     if (error) {
//       toast.error(error.message);
//       return;
//     }
//     toast.success("Storefront details updated.");
//     setVendor((prev: any) => prev ? { ...prev, ...form } : null);
//     setAllVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, ...form } : v));
//     setEditing(false);
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
//         <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
//         <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Loading Storefront...</p>
//       </div>
//     );
//   }

//   if (!vendor) {
//     return (
//       <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-bg)" }}>
//         <GlassCard className="max-w-md w-full p-6 sm:p-8 text-center rounded-2xl border-border shadow-sm bg-surface dark:bg-surface/60">
//           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface dark:bg-surface rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-border shadow-sm">
//              <Store className="h-6 w-6 sm:h-8 sm:w-8 text-stone-400" />
//           </div>
//           <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white mb-2 tracking-tight">No Storefront Found</h2>
//           <p className="text-stone-500 text-xs sm:text-sm mb-8 sm:mb-10 leading-relaxed font-medium">Initialize your first storefront to start selling on Jimvio.</p>
//           <Button asChild className="w-full h-11 sm:h-12 rounded-xl bg-[#fd5000] text-white hover:bg-orange-600 font-bold active:scale-95 transition-all text-xs sm:text-sm shadow-sm border-none">
//              <Link href="/dashboard/activate/vendor">Create a Storefront <ArrowRight className="h-4 w-4 ml-2" /></Link>
//           </Button>
//         </GlassCard>
//       </div>
//     );
//   }

//   return (
//     <div
//       className="min-h-screen pb-24 animate-in fade-in duration-500 relative overflow-hidden"
//       style={{
//         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), var(--color-bg)",
//       }}
//     >
//       <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 pt-6 sm:pt-10 relative z-10">

//         {/* Storefront Switcher */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
//            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-surface dark:bg-surface border border-border shadow-sm">
//               <div className="px-3 sm:px-5 py-2 border-r border-border flex items-center gap-2">
//                  <Store className="h-3.5 w-3.5 text-stone-400" />
//                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-500">My Storefronts</span>
//               </div>
//               {allVendors.map((v) => (
//                  <button
//                     key={v.id}
//                     onClick={() => selectVendor(v)}
//                     className={cn(
//                        "px-4 sm:px-5 py-2 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
//                        vendor?.id === v.id 
//                           ? "bg-stone-900 text-white shadow-sm scale-105" 
//                           : "text-stone-500 hover:text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50"
//                     )}
//                  >
//                     {v.business_name}
//                  </button>
//               ))}
//            </div>

//            <Button className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-surface dark:bg-surface text-stone-900 dark:text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-all hover:bg-surface-secondary dark:bg-surface/50 border border-border w-full sm:w-auto" asChild>
//               <Link href="/dashboard/activate/vendor"><Plus className="h-4 w-4 mr-2" /> New Storefront</Link>
//            </Button>
//         </div>

//         {/* Store Header */}
//         <div className="relative group">
//            <div className="h-48 sm:h-80 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-border shadow-sm relative">
//               <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
//               {editing ? (
//                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl">
//                     <CloudinaryUploadButton
//                        folder="jimvio/banners"
//                        resourceType="image"
//                        onUploadSuccess={(url) => setForm((f) => ({ ...f, business_banner: url }))}
//                        buttonText="Change Banner"
//                        className="bg-white dark:bg-surface text-stone-900 dark:text-white h-11 px-8 rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-sm active:scale-95 transition-all border-none"
//                     />
//                  </div>
//               ) : (
//                  vendor.business_banner ? (
//                     <img src={vendor.business_banner} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
//                  ) : (
//                     <div className="w-full h-full bg-stone-800 flex items-center justify-center">
//                        <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-white/10" />
//                     </div>
//                  )
//               )}

//               {/* Overlay Content */}
//               <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
//                  <div className="flex items-center gap-4 sm:gap-6">
//                     <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-surface dark:bg-surface border-4 border-border shadow-md relative overflow-hidden shrink-0">
//                        {editing ? (
//                           <div className="absolute inset-0 flex items-center justify-center bg-surface dark:bg-surface z-20">
//                              <CloudinaryUploadButton
//                                 folder="jimvio/avatars"
//                                 resourceType="image"
//                                 onUploadSuccess={(url) => setForm((f) => ({ ...f, business_logo: url }))}
//                                 buttonText="LOGO"
//                                 className="text-[9px] sm:text-[10px] font-bold uppercase bg-stone-50 dark:bg-surface/50 text-stone-900 dark:text-white h-full w-full rounded-2xl border-none"
//                              />
//                           </div>
//                        ) : (
//                           vendor.business_logo ? (
//                              <img src={vendor.business_logo} className="w-full h-full object-cover" alt="" />
//                           ) : (
//                              <div className="w-full h-full flex items-center justify-center bg-stone-50 dark:bg-surface/50">
//                                 <Store className="h-6 w-6 sm:h-8 sm:w-8 text-stone-300" />
//                              </div>
//                           )
//                        )}
//                     </div>

//                     <div className="space-y-1">
//                        <div className="flex items-center gap-2">
//                           <Badge variant="secondary" className="bg-[#fd5000] hover:bg-[#fd5000] text-white border-none text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Verified Vendor</Badge>
//                        </div>
//                        {editing ? (
//                           <Input 
//                              value={form.business_name} 
//                              onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
//                              className="h-10 sm:h-12 bg-white/20 dark:bg-surface/20 backdrop-blur-xl border-white/20 text-white text-xl sm:text-2xl font-bold rounded-xl mb-1 w-full max-w-[200px] sm:max-w-sm placeholder:text-white/40 focus:ring-0"
//                           />
//                        ) : (
//                           <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-1">{vendor.business_name}</h1>
//                        )}
//                        <p className="text-[9px] sm:text-[10px] font-bold text-white/70 tracking-widest uppercase truncate max-w-[200px] sm:max-w-full">jimvio.com/vendors/{vendor.business_slug}</p>
//                     </div>
//                  </div>

//                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//                     {editing ? (
//                        <>
//                           <Button variant="ghost" className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-white/80 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest hover:text-white hover:bg-white/20 dark:bg-surface/10 flex-1 sm:flex-none" onClick={() => setEditing(false)}>Cancel</Button>
//                           <Button disabled={saving} onClick={handleSave} className="h-9 sm:h-10 px-5 sm:px-6 rounded-xl bg-white dark:bg-surface text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/90 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all border-none flex-1 sm:flex-none">
//                              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />} Save
//                           </Button>
//                        </>
//                     ) : (
//                        <>
//                           <Link href={`/vendors/${vendor.business_slug}`} target="_blank" className="flex-1 sm:flex-none">
//                              <Button variant="outline" className="w-full h-9 sm:h-10 px-4 sm:px-5 rounded-xl border-white/20 bg-white/10 dark:bg-surface/10 backdrop-blur-xl text-white hover:bg-white/20 dark:bg-surface/20 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all">
//                                 Public Page <ExternalLink className="h-3 w-3 ml-1.5" />
//                              </Button>
//                           </Link>
//                           <Button onClick={() => setEditing(true)} className="flex-1 sm:flex-none h-9 sm:h-10 px-5 sm:px-6 rounded-xl bg-[#fd5000] text-white hover:bg-[#e04700] font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all border-none">
//                              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
//                           </Button>
//                        </>
//                     )}
//                  </div>
//               </div>
//            </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

//            {/* Left Content Column */}
//            <div className="lg:col-span-8 space-y-8">

//               {/* Description Box */}
//               <GlassCard className="p-5 sm:p-8 rounded-2xl bg-surface dark:bg-surface/60 border-border shadow-sm relative overflow-hidden">
//                  <div className="flex items-center justify-between mb-4 sm:mb-6">
//                     <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400">Store Description</h3>
//                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//                  </div>
//                  {editing ? (
//                     <Textarea 
//                        value={form.business_description}
//                        onChange={(e) => setForm(f => ({ ...f, business_description: e.target.value }))}
//                        className="min-h-[120px] sm:min-h-[140px] rounded-xl bg-white dark:bg-surface border-stone-200 dark:border-border text-xs sm:text-sm font-medium leading-relaxed shadow-sm focus:ring-4 focus:ring-stone-500/5 focus:border-stone-300 dark:border-border p-4 sm:p-6 resize-none"
//                        placeholder="Write a brief description of your storefront..."
//                     />
//                  ) : (
//                     <p className="text-sm sm:text-base font-medium text-stone-700 leading-relaxed">
//                        {vendor.business_description || "Add a description to tell customers about your store."}
//                     </p>
//                  )}
//               </GlassCard>

//               {/* Products Grid */}
//               <section className="space-y-4 sm:space-y-6">
//                  <div className="flex items-center justify-between px-1">
//                     <div className="space-y-0.5">
//                        <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white tracking-tight">Top Products</h2>
//                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400">{products.length} Items Listed</p>
//                     </div>
//                     <Link href="/dashboard/products/new">
//                        <Button className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm hover:bg-black dark:hover:bg-stone-200 transition-all border-none">
//                           <Plus className="h-3.5 w-3.5 sm:mr-2" /> <span className="hidden sm:inline">New Product</span>
//                        </Button>
//                     </Link>
//                  </div>

//                  {products.length === 0 ? (
//                     <GlassCard className="py-12 sm:py-16 text-center rounded-2xl border-dashed border-border bg-surface dark:bg-surface/20">
//                        <Package className="h-8 w-8 sm:h-10 sm:w-10 text-stone-400 dark:text-stone-600 mx-auto mb-3 sm:mb-4" />
//                        <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tracking-tight">No products listed</h3>
//                        <p className="text-[11px] sm:text-xs font-medium text-stone-400 mt-1.5 mb-6 sm:mb-8">Ready to start selling? List your first inventory item.</p>
//                        <Link href="/dashboard/products/new">
//                           <Button className="h-10 sm:h-11 px-6 sm:px-8 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm bg-white dark:bg-surface border-stone-200 dark:border-border text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50">
//                              Add Product
//                           </Button>
//                        </Link>
//                     </GlassCard>
//                  ) : (
//                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
//                        {products.map((p) => (
//                           <Link key={p.id} href={`/dashboard/products/${p.id}/edit`} className="group outline-none">
//                              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface dark:bg-surface border border-border shadow-sm hover:bg-stone-50 dark:hover:bg-zinc-800 hover:shadow-md transition-all active:scale-[0.98]">
//                                 <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-surface-secondary dark:bg-surface-secondary border border-border shadow-sm overflow-hidden shrink-0">
//                                    {p.images?.[0] ? (
//                                       <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
//                                    ) : (
//                                       <div className="w-full h-full bg-surface-secondary dark:bg-surface/50 flex items-center justify-center"><Package className="h-4 w-4 sm:h-5 sm:w-5 text-stone-400" /></div>
//                                    )}
//                                 </div>

//                                 <div className="flex-1 min-w-0">
//                                    <div className="flex items-center gap-2 mb-1">
//                                       <span className={cn(
//                                         "text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest",
//                                         p.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-orange-50 text-orange-600 border border-orange-100"
//                                       )}>
//                                          {p.status}
//                                       </span>
//                                    </div>
//                                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate tracking-tight">{p.name}</h4>
//                                    <p className="text-sm sm:text-base font-black text-stone-900 dark:text-white tabular-nums">{formatMoney(Number(p.price), (p as any).currency)}</p>
//                                 </div>

//                                 <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-stone-50 dark:bg-surface/50 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-all shadow-sm shrink-0">
//                                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                                 </div>
//                              </div>
//                           </Link>
//                        ))}
//                     </div>
//                  )}
//               </section>
//            </div>

//            {/* Right Sidebar Column */}
//            <div className="lg:col-span-4 space-y-6">

//               {/* Simple Stats List */}
//               <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4">
//                  {[
//                     { label: "Store Rating", value: (vendor.rating || 0).toFixed(1), icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
//                     { label: "Followers", value: followers, icon: Users, color: "text-sky-500", bg: "bg-sky-50" },
//                     { label: "Total Sales", value: vendor.total_sales || 0, icon: ShoppingBag, color: "text-indigo-500", bg: "bg-indigo-50" },
//                  ].map((stat, i) => (
//                     <div key={i} className="flex items-center justify-between p-4 sm:p-6 rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm">
//                        <div className="flex items-center gap-3 sm:gap-4">
//                           <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border border-border bg-surface-secondary dark:bg-surface-secondary shadow-sm", stat.color)}>
//                              <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
//                           </div>
//                           <div>
//                              <p className="text-base sm:text-lg font-bold text-stone-900 dark:text-white tabular-nums leading-none tracking-tight">{stat.value}</p>
//                              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-1 sm:mt-1.5">{stat.label}</p>
//                           </div>
//                        </div>
//                     </div>
//                  ))}
//               </div>

//               {/* Promo Banner - Softer */}
//               <GlassCard className="p-6 sm:p-8 rounded-2xl bg-stone-900 text-white relative overflow-hidden shadow-sm border-none">
//                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
//                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400 mb-4 sm:mb-6" />
//                  <h3 className="text-lg sm:text-xl font-bold tracking-tight mb-2 leading-none text-white">Boost Your Sales</h3>
//                  <p className="text-stone-400 text-[11px] sm:text-xs font-medium leading-relaxed mb-6 sm:mb-8">
//                     Start an affiliate campaign to get influencers promoting your products to their audience.
//                  </p>
//                  <Link href="/dashboard/vendor/campaigns/new">
//                     <Button className="w-full bg-white dark:bg-surface text-stone-900 dark:text-white hover:bg-stone-50 dark:bg-surface/50 h-10 sm:h-11 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-95 transition-all outline-none border-none shadow-sm">
//                        Start a Mission <ArrowRight className="h-3.5 w-3.5 ml-2" />
//                     </Button>
//                  </Link>
//               </GlassCard>

//               {/* Public Link Card */}
//               <div className="p-6 sm:p-8 rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm text-center space-y-3 sm:space-y-4">
//                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-surface-secondary dark:bg-surface-secondary rounded-xl flex items-center justify-center mx-auto text-stone-500 shadow-sm border border-border">
//                     <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
//                  </div>
//                  <div>
//                     <h4 className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1">Public Link</h4>
//                     <p className="text-[10px] sm:text-xs font-bold text-stone-900 dark:text-white truncate">jimvio.com/vendors/{vendor.business_slug}</p>
//                  </div>
//               </div>
//            </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Missing icon
// function ShoppingBag(props: any) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
//       <path d="M3 6h18" />
//       <path d="M16 10a4 4 0 0 1-8 0" />
//     </svg>
//   );
// }

"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
   Store, Star, Users, Package, Pencil, Save, X,
   ArrowRight, ExternalLink, Plus, Sparkles,
   ChevronRight, Globe, Loader2, Image as ImageIcon,
   TrendingUp, BarChart2, ShoppingBag, Copy, Check,
   ArrowUpRight, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";

/* ─────────────────────────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
   const [copied, setCopied] = useState(false);
   return (
      <button
         onClick={() => {
            navigator.clipboard.writeText(text).catch(() => { });
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
         }}
         className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-md hover:bg-muted transition-colors"
         title="Copy link"
      >
         {copied
            ? <Check className="h-3 w-3 text-emerald-500" />
            : <Copy className="h-3 w-3 text-muted-foreground" />
         }
      </button>
   );
}

function StatCard({
   icon: Icon, label, value, sub, color,
}: {
   icon: React.ElementType; label: string; value: string | number;
   sub?: string; color: string;
}) {
   return (
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-card border border-border">
         <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-4 w-4" />
         </div>
         <div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums leading-none mb-1">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
         </div>
      </div>
   );
}

/* ─────────────────────────────────────────────────────────────
   Product row
───────────────────────────────────────────────────────────── */
function ProductRow({ p, formatMoney }: { p: any; formatMoney: (v: number, c?: string) => string }) {
   return (
      <Link href={`/dashboard/products/${p.id}/edit`} className="group outline-none">
         <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
               {p.images?.[0]
                  ? <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>
               }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
               <p className="text-[13px] font-semibold truncate tracking-tight mb-1">{p.name}</p>
               <div className="flex items-center gap-2">
                  <span className={cn(
                     "text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full",
                     p.status === "active"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                  )}>
                     {p.status}
                  </span>
                  {p.product_type && (
                     <span className="text-[10px] text-muted-foreground font-medium capitalize">{p.product_type}</span>
                  )}
               </div>
            </div>

            {/* Price */}
            <p className="text-[13px] font-semibold tabular-nums tracking-tight flex-shrink-0">
               {formatMoney(Number(p.price), p.currency)}
            </p>

            {/* Arrow */}
            <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center flex-shrink-0 group-hover:bg-foreground group-hover:border-foreground transition-all">
               <ChevronRight className="h-3.5 w-3.5 group-hover:text-background transition-colors" />
            </div>
         </div>
      </Link>
   );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
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
            .from("vendors").select("*").eq("user_id", user.id)
            .order("created_at", { ascending: false });
         setAllVendors(vs ?? []);
         const v = vs?.[0] || null;
         if (v) await selectVendor(v);
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
         supabase.from("products")
            .select("id,name,slug,price,images,status,product_type,currency")
            .eq("vendor_id", v.id).eq("is_active", true)
            .order("created_at", { ascending: false }).limit(8),
         supabase.from("vendor_followers")
            .select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      ]);
      setProducts(prods.data ?? []);
      setFollowers(follow.count ?? 0);
      setEditing(false);
      setLoading(false);
   }

   async function handleSave() {
      if (!vendor) return;
      setSaving(true);
      const { error } = await supabase.from("vendors").update({
         business_name: form.business_name.trim(),
         business_description: form.business_description.trim() || null,
         business_logo: form.business_logo.trim() || null,
         business_banner: form.business_banner.trim() || null,
      }).eq("id", vendor.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Storefront updated.");
      setVendor((prev: any) => prev ? { ...prev, ...form } : null);
      setAllVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, ...form } : v));
      setEditing(false);
   }

   /* ── Loading ── */
   if (loading) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground">Loading storefront…</p>
         </div>
      );
   }

   /* ── No vendor ── */
   if (!vendor) {
      return (
         <div className="min-h-screen flex items-center justify-center px-6 bg-background">
            <div className="max-w-sm w-full text-center space-y-6">
               <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto">
                  <Store className="h-7 w-7 text-muted-foreground" />
               </div>
               <div>
                  <h2 className="text-xl font-semibold tracking-tight mb-2">No storefront yet</h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                     Create your first storefront to start selling on Jimvio.
                  </p>
               </div>
               <Button asChild className="w-full h-11 rounded-xl bg-[#fd5000] hover:bg-[#e04700] text-white font-semibold text-[11px] tracking-widest border-none">
                  <Link href="/dashboard/activate/vendor">Create storefront <ArrowRight className="h-4 w-4 ml-2" /></Link>
               </Button>
            </div>
         </div>
      );
   }

   const publicUrl = `jimvio.com/vendors/${vendor.business_slug}`;

   /* ── Main ── */
   return (
      <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-400">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-6 sm:space-y-8">

            {/* ── Top bar: switcher + new storefront ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit overflow-x-auto">
                  <span className="px-3 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground flex-shrink-0 border-r border-border pr-3 mr-1">
                     Stores
                  </span>
                  {allVendors.map((v) => (
                     <button key={v.id} onClick={() => selectVendor(v)}
                        className={cn(
                           "px-4 py-1.5 rounded-lg text-[11px] font-semibold tracking-tight transition-all whitespace-nowrap",
                           vendor?.id === v.id
                              ? "bg-background border border-border shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                        )}>
                        {v.business_name}
                     </button>
                  ))}
               </div>

               <Button asChild variant="outline"
                  className="h-9 rounded-xl text-[11px] font-semibold tracking-tight border-border w-full sm:w-auto">
                  <Link href="/dashboard/activate/vendor">
                     <Plus className="h-3.5 w-3.5 mr-1.5" /> New storefront
                  </Link>
               </Button>
            </div>

            {/* ── Banner / Hero ── */}
            <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: "clamp(180px, 28vw, 320px)" }}>
               {/* Banner image or placeholder */}
               {vendor.business_banner
                  ? <img src={vendor.business_banner} alt="" className="w-full h-full object-cover" />
                  : (
                     <div className="w-full h-full bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-white/10" />
                     </div>
                  )
               }

               {/* Gradient overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

               {/* Edit banner overlay */}
               {editing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                     <CloudinaryUploadButton
                        folder="jimvio/banners" resourceType="image"
                        onUploadSuccess={(url) => setForm(f => ({ ...f, business_banner: url }))}
                        buttonText="Change banner"
                        className="h-10 px-6 rounded-xl bg-white text-stone-900 font-semibold text-[11px] tracking-widest border-none"
                     />
                  </div>
               )}

               {/* Bottom content */}
               <div className="absolute bottom-0 inset-x-0 z-10 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                     {/* Logo */}
                     <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-background border-2 border-white/20 flex-shrink-0 relative shadow-lg">
                        {editing ? (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                              <CloudinaryUploadButton
                                 folder="jimvio/avatars" resourceType="image"
                                 onUploadSuccess={(url) => setForm(f => ({ ...f, business_logo: url }))}
                                 buttonText="Logo"
                                 className="text-[9px] font-bold text-white bg-transparent border-none w-full h-full"
                              />
                           </div>
                        ) : vendor.business_logo ? (
                           <img src={vendor.business_logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Store className="h-6 w-6 text-muted-foreground" />
                           </div>
                        )}
                     </div>

                     {/* Name + slug */}
                     <div className="pb-1">
                        {editing ? (
                           <Input
                              value={form.business_name}
                              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                              className="h-10 bg-white/15 backdrop-blur-md border-white/20 text-white text-xl font-semibold rounded-xl placeholder:text-white/40 w-48 sm:w-72 mb-1"
                           />
                        ) : (
                           <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight mb-1 drop-shadow-sm">
                              {vendor.business_name}
                           </h1>
                        )}
                        <div className="flex items-center">
                           <span className="text-[11px] text-white/50">{publicUrl}</span>
                           <CopyButton text={`https://${publicUrl}`} />
                        </div>
                     </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                     {editing ? (
                        <>
                           <Button variant="ghost" onClick={() => setEditing(false)}
                              className="h-9 px-4 rounded-xl text-white/70 hover:text-white hover:bg-white/15 text-[11px] font-semibold uppercase tracking-widest">
                              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                           </Button>
                           <Button onClick={handleSave} disabled={saving}
                              className="h-9 px-5 rounded-xl bg-white text-stone-900 hover:bg-stone-50 text-[11px] font-semibold uppercase tracking-widest border-none shadow-sm">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                              Save
                           </Button>
                        </>
                     ) : (
                        <>
                           <Button variant="outline" asChild
                              className="h-9 px-4 rounded-xl border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 text-[11px] font-semibold tracking-widest">
                              <Link href={`/vendors/${vendor.business_slug}`} target="_blank">
                                 <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                              </Link>
                           </Button>
                           <Button onClick={() => setEditing(true)}
                              className="h-9 px-5 rounded-xl bg-[#fd5000] hover:bg-[#e04700] text-white text-[11px] font-semibold tracking-widest border-none shadow-sm">
                              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                           </Button>
                        </>
                     )}
                  </div>
               </div>
            </div>

            {/* ── Verified badge row ── */}
            <div className="flex items-center gap-3">
               <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#fd5000]/10 text-[#fd5000] border border-[#fd5000]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fd5000]" />
                  Verified vendor
               </span>
               <span className="text-[11px] text-muted-foreground font-medium">
                  {products.length} product{products.length !== 1 ? "s" : ""} listed
               </span>
            </div>

            {/* ── Main layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

               {/* LEFT: description + products */}
               <div className="lg:col-span-8 space-y-6">

                  {/* Description */}
                  <div className="rounded-2xl border border-border bg-card p-6">
                     <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">About this store</p>
                        {!editing && (
                           <button onClick={() => setEditing(true)}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> Edit
                           </button>
                        )}
                     </div>
                     {editing ? (
                        <Textarea
                           value={form.business_description}
                           onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))}
                           className="min-h-[120px] rounded-xl text-[13px] font-medium leading-relaxed resize-none"
                           placeholder="Describe your store — what you sell, your brand story, what makes you different…"
                        />
                     ) : (
                        <p className={cn(
                           "text-[14px] leading-relaxed font-medium",
                           vendor.business_description ? "text-foreground" : "text-muted-foreground italic"
                        )}>
                           {vendor.business_description || "No description yet. Click Edit to add one."}
                        </p>
                     )}
                  </div>

                  {/* Products */}
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                     <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div>
                           <h2 className="text-[14px] font-semibold tracking-tight">Products</h2>
                           <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {products.length} active listing{products.length !== 1 ? "s" : ""}
                           </p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button asChild variant="outline" className="h-8 px-3 rounded-lg text-[11px] font-semibold border-border">
                              <Link href="/dashboard/products">
                                 All products <ArrowUpRight className="h-3 w-3 ml-1" />
                              </Link>
                           </Button>
                           <Button asChild className="h-8 px-3 rounded-lg bg-foreground text-background text-[11px] font-semibold border-none hover:opacity-85">
                              <Link href="/dashboard/products/new">
                                 <Plus className="h-3.5 w-3.5 mr-1" /> New
                              </Link>
                           </Button>
                        </div>
                     </div>

                     {products.length === 0 ? (
                        <div className="py-16 text-center px-6">
                           <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                              <Package className="h-5 w-5 text-muted-foreground" />
                           </div>
                           <h3 className="text-[14px] font-semibold mb-1">No products yet</h3>
                           <p className="text-[12px] text-muted-foreground mb-6">List your first product to start selling.</p>
                           <Button asChild variant="outline" className="h-9 px-5 rounded-xl text-[11px] font-semibold">
                              <Link href="/dashboard/products/new">Add first product</Link>
                           </Button>
                        </div>
                     ) : (
                        <div className="px-3 py-2 divide-y divide-border/50">
                           {products.map(p => (
                              <ProductRow key={p.id} p={p} formatMoney={formatMoney} />
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* RIGHT: stats + promo + link */}
               <div className="lg:col-span-4 space-y-4">

                  {/* Stats */}
                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                     <StatCard
                        icon={Star} label="Rating" value={(vendor.rating || 0).toFixed(1)}
                        sub={vendor.review_count ? `${vendor.review_count} reviews` : undefined}
                        color="bg-amber-50 dark:bg-amber-950/40 text-amber-500"
                     />
                     <StatCard
                        icon={Users} label="Followers" value={followers}
                        color="bg-sky-50 dark:bg-sky-950/40 text-sky-500"
                     />
                     <StatCard
                        icon={ShoppingBag} label="Total sales" value={vendor.total_sales || 0}
                        color="bg-violet-50 dark:bg-violet-950/40 text-violet-500"
                     />
                  </div>

                  {/* Promo CTA */}
                  <div className="rounded-2xl bg-stone-900 dark:bg-stone-950 text-white p-6 relative overflow-hidden border border-white/5">
                     <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#fd5000]/20 blur-2xl pointer-events-none" />
                     <div className="relative">
                        <div className="w-8 h-8 rounded-xl bg-[#fd5000]/20 flex items-center justify-center mb-4">
                           <Megaphone className="h-4 w-4 text-[#fd5000]" />
                        </div>
                        <h3 className="text-[15px] font-semibold tracking-tight mb-1.5">Boost your sales</h3>
                        <p className="text-[12px] text-white/50 leading-relaxed mb-5">
                           Launch an affiliate campaign and get creators to promote your products.
                        </p>
                        <Button asChild
                           className="w-full h-9 rounded-xl bg-white text-stone-900 hover:bg-stone-100 text-[11px] font-semibold uppercase tracking-widest border-none">
                           <Link href="/dashboard/vendor/campaigns/new">
                              Start a mission <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                           </Link>
                        </Button>
                     </div>
                  </div>

                  {/* Public link */}
                  <div className="rounded-2xl border border-border bg-card p-5">
                     <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> Public storefront
                     </p>
                     <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/60">
                        <p className="text-[11px] text-foreground font-semibold truncate flex-1">{publicUrl}</p>
                        <CopyButton text={`https://${publicUrl}`} />
                     </div>
                     <Button asChild variant="outline" className="w-full h-9 rounded-xl text-[11px] font-semibold border-border mt-3">
                        <Link href={`/vendors/${vendor.business_slug}`} target="_blank">
                           View live page <ExternalLink className="h-3 w-3 ml-1.5" />
                        </Link>
                     </Button>
                  </div>

               </div>
            </div>
         </div>
      </div>
   );
}