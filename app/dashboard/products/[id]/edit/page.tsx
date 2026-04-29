// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect, useTransition } from "react";
// import { useRouter, useParams } from "next/navigation";
// import {
//   ArrowLeft,
//   Save,
//   Loader2,
//   Package,
//   FileText,
//   Tag,
//   Sparkles,
//   DollarSign,
//   Layers,
//   Rocket,
//   Plus,
//   Trash2,
//   CheckCircle2,
//   HelpCircle,
//   Zap,
//   ImageIcon,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import { GlassCard, GlassPill } from "@/components/ui/glass";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";

// export default function EditProductPage() {
//   const router = useRouter();
//   const params = useParams();
//   const productId = params.id as string;
//   const [isPending, startTransition] = useTransition();
//   const [loading, setLoading]  = useState(true);
//   const [error, setError]      = useState<string | null>(null);
//   const [success, setSuccess]  = useState(false);
//   const [categories, setCategories] = useState<any[]>([]);

//   const [form, setForm] = useState({
//     name: "", slug: "", short_description: "", description: "",
//     price: "", compare_at_price: "", category_id: "",
//     inventory_quantity: "", affiliate_enabled: true,
//     affiliate_commission_rate: "10", status: "draft",
//     is_featured: false, tags: "", is_digital: false,
//     product_type: "physical",
//     pricing_type: "one_time", billing_period: "monthly",
//     digital_file_url: "", button_text: "",
//     images: [] as string[],
//   });

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { router.push("/login"); return; }

//       const [productRes, catsRes] = await Promise.all([
//         supabase.from("products").select("*").eq("id", productId).single(),
//         supabase.from("product_categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
//       ]);

//       if (productRes.data) {
//         const p = productRes.data;
//         setForm({
//           name:                    p.name ?? "",
//           slug:                    p.slug ?? "",
//           short_description:       p.short_description ?? "",
//           description:             p.description ?? "",
//           price:                   String(p.price ?? ""),
//           compare_at_price:        String(p.compare_at_price ?? ""),
//           category_id:             p.category_id ?? "",
//           inventory_quantity:      String(p.inventory_quantity ?? 0),
//           affiliate_enabled:       p.affiliate_enabled ?? true,
//           affiliate_commission_rate: String(p.affiliate_commission_rate ?? 10),
//           status:                  p.status ?? "draft",
//           is_featured:             p.is_featured ?? false,
//           tags:                    (p.tags as string[])?.join(", ") ?? "",
//           is_digital:              p.is_digital ?? false,
//           product_type:            p.product_type ?? (p.is_digital ? "digital" : "physical"),
//           pricing_type:            p.pricing_type ?? "one_time",
//           billing_period:          p.billing_period ?? "monthly",
//           digital_file_url:        p.digital_file_url ?? "",
//           button_text:             p.button_text ?? "",
//           images:                  (p.images as string[]) || [],
//         });
//       }
//       setCategories(catsRes.data ?? []);
//       setLoading(false);
//     }
//     load();
//   }, [productId, router]);

//   function handleChange(field: string, value: any) {
//     setForm(prev => {
//       const updated = { ...prev, [field]: value };

//       // AUTO LOGIC based on Category (matching new product logic)
//       if (field === "category_id" && updated.product_type === "digital") {
//         const cat = categories.find(c => c.id === value);
//         const name = cat?.name?.toLowerCase() || "";
//         const slug = cat?.slug?.toLowerCase() || "";

//         if (slug.includes("course") || name.includes("course") || name.includes("training")) {
//            updated.pricing_type = "recurring";
//            updated.button_text = "Join";
//         } else if (slug.includes("software") || name.includes("software") || name.includes("app")) {
//            updated.pricing_type = "one_time";
//            updated.button_text = "Get access";
//         }
//       }
//       return updated;
//     });
//   }

//   function handleImageUpload(url: string) {
//     setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
//   }

//   function removeImage(index: number) {
//     setForm((prev) => {
//       const newImages = [...prev.images];
//       newImages.splice(index, 1);
//       return { ...prev, images: newImages };
//     });
//   }

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError(null);
//     startTransition(async () => {
//       const supabase = createClient();
//       const { error: updateErr } = await supabase.from("products").update({
//         name:                    form.name,
//         short_description:       form.short_description || null,
//         description:             form.description || null,
//         price:                   parseFloat(form.price),
//         compare_at_price:        form.compare_at_price ? parseFloat(form.compare_at_price) : null,
//         category_id:             form.category_id || null,
//         inventory_quantity:      parseInt(form.inventory_quantity ?? "0"),
//         affiliate_enabled:       form.affiliate_enabled,
//         affiliate_commission_rate: parseFloat(form.affiliate_commission_rate ?? "10"),
//         status:                  form.status,
//         is_featured:             form.is_featured,
//         product_type:            form.product_type,
//         pricing_type:            form.pricing_type,
//         billing_period:          form.pricing_type === "recurring" ? form.billing_period : null,
//         button_text:             form.button_text || null,
//         digital_file_url:        form.product_type === "digital" ? form.digital_file_url : null,
//         tags:                    form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
//         images:                  form.images,
//       }).eq("id", productId);

//       if (updateErr) { setError(updateErr.message); return; }
//       setSuccess(true);
//       setTimeout(() => router.push("/dashboard/products"), 1000);
//     });
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
//         <div className="relative">
//           <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
//           <div className="relative w-20 h-20 rounded-[24px] bg-white dark:bg-surface backdrop-blur-md border border-white/80 shadow-2xl flex items-center justify-center overflow-hidden">
//             <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
//             <Package className="h-8 w-8 text-stone-900 dark:text-white" />
//           </div>
//         </div>
//         <div className="text-center">
//            <h2 className="text-[12px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Retrieving Asset</h2>
//            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Accessing Secure Inventory Node</p>
//         </div>
//       </div>
//     );
//   }

//   if (success) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
//         <div className="relative">
//           <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
//           <div className="relative w-20 h-20 rounded-[24px] bg-white dark:bg-surface backdrop-blur-md border border-white shadow-2xl flex items-center justify-center overflow-hidden">
//              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-500" />
//           </div>
//         </div>
//         <div className="text-center">
//            <h2 className="text-[12px] font-black text-stone-900 dark:text-white uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Asset Refined</h2>
//            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Registry update confirmed</p>
//         </div>
//       </div>
//     );
//   }

//   const inputClass = "h-14 rounded-2xl bg-white dark:bg-surface/60 border-stone-200 dark:border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 dark:text-white font-bold placeholder:text-stone-300 transition-all text-base px-6";
//   const selectClass = "h-14 w-full px-6 rounded-2xl border border-stone-200 dark:border-border bg-white dark:bg-surface/60 text-stone-900 dark:text-white font-bold text-base focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all shadow-sm";

//   return (
//     <div
//       className="min-h-screen animate-in fade-in duration-500 pb-24"
//       style={{
//          background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.06) 0%, transparent 55%), #f0ede8",
//       }}
//     >
//       <div className="max-w-3xl mx-auto px-6 pt-12">
//         <div className="flex flex-col items-center text-center mb-16">
//            <Link href="/dashboard/products" className="mb-8 group">
//               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-surface/40 border border-white/80 text-stone-500 hover:text-stone-900 dark:text-white transition-all shadow-sm">
//                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
//                  <span className="text-[10px] font-bold uppercase tracking-widest pl-1">Back to Assets</span>
//               </div>
//            </Link>

//            <div className="w-20 h-20 rounded-[28px] bg-white dark:bg-surface border border-white shadow-2xl flex items-center justify-center mb-6 relative group overflow-hidden">
//               <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
//               <Package className="h-10 w-10 text-stone-900 dark:text-white group-hover:scale-110 transition-transform duration-500" />
//            </div>

//            <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tighter mb-4">Refine Asset</h1>
//            <p className="text-stone-600 font-semibold max-w-sm leading-relaxed uppercase tracking-wider text-[11px]">
//               Modifying registry parameters for <span className="text-stone-900 dark:text-white">{form.name}</span>
//            </p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-12">
//           <GlassCard className="p-0 overflow-hidden relative shadow-2xl border-white/80">
//              <div className="absolute top-0 left-0 w-full h-1 bg-white dark:bg-surface/20 z-20" />
//              <div className="p-8 sm:p-12 space-y-12">
//                 {/* Visual Documentation */}
//                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
//                   <div className="pb-4">
//                     <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
//                       <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-500 shadow-sm border border-orange-100 flex items-center justify-center">
//                          <ImageIcon className="h-5 w-5" />
//                       </div>
//                       Visual documentation
//                     </h2>
//                     <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Update high-fidelity asset previews</p>
//                   </div>

//                   {form.images.length > 0 && (
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
//                       {form.images.map((img, i) => (
//                         <div key={i} className="relative group aspect-square rounded-[30px] overflow-hidden border-2 border-white shadow-xl hover:scale-105 transition-all duration-300">
//                           <CloudinaryImage src={img} alt={`Asset Layer ${i + 1}`} fill className="object-cover" />
//                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
//                              <button 
//                               type="button" 
//                               onClick={() => removeImage(i)}
//                               className="bg-white dark:bg-surface/20 backdrop-blur-md hover:bg-rose-500 text-white rounded-full p-2.5 shadow-2xl transition-all hover:scale-110 active:scale-90"
//                             >
//                               <Trash2 className="h-5 w-5" />
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   <CloudinaryDropzone 
//                     folder="jimvio/products"
//                     onUploadSuccess={handleImageUpload}
//                     label="Update Asset Images"
//                     sublabel="JPG/PNG/WEBP • Max 10MB"
//                   />
//                 </div>

//                 {/* Basic Info */}
//                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
//                   <div className="pb-4 border-t border-stone-100 dark:border-border pt-8">
//                     <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
//                       <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-500 shadow-sm border border-sky-100 flex items-center justify-center">
//                          <FileText className="h-5 w-5" />
//                       </div>
//                       Asset metadata
//                     </h2>
//                     <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Core classification update</p>
//                   </div>

//                   <div className="space-y-6">
//                     <div className="space-y-3">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Primary Asset Label *</Label>
//                       <Input value={form.name} onChange={e => handleChange("name", e.target.value)} className={inputClass} required />
//                     </div>

//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//                       <div className="space-y-3">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Registry Category</Label>
//                         <select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)} className={selectClass}>
//                           <option value="">Indexing: Unclassified</option>
//                           {categories.map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
//                         </select>
//                       </div>
//                       <div className="space-y-3">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Visibility Status</Label>
//                         <select value={form.status} onChange={e => handleChange("status", e.target.value)} className={selectClass}>
//                           <option value="draft">Storage Protocol (Draft)</option>
//                           <option value="active">Live Distribution (Active)</option>
//                           <option value="paused">Hibernation Mode (Paused)</option>
//                           <option value="archived">Decommissioned (Archived)</option>
//                         </select>
//                       </div>
//                       <div className="space-y-3 sm:col-span-2 lg:col-span-1">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Product URL (Live)</Label>
//                         <Input value={`jimvio.com/products/${form.slug}`} readOnly className={cn(inputClass, "opacity-60 bg-stone-50 text-[13px] border-dashed")} />
//                       </div>
//                     </div>

//                     <div className="space-y-3">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Brief Abstract</Label>
//                       <Textarea value={form.short_description} onChange={e => handleChange("short_description", e.target.value)} className="rounded-2xl bg-white dark:bg-surface/60 border-stone-200 dark:border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 dark:text-white font-bold text-sm px-6 py-4 resize-none min-h-[80px]" />
//                     </div>

//                     <div className="space-y-3">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Technical Specifications</Label>
//                       <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} className="rounded-3xl bg-white dark:bg-surface/60 border-stone-200 dark:border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 dark:text-white font-bold text-sm px-7 py-6 resize-none min-h-[160px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)]" />
//                     </div>

//                     <div className="space-y-3">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Discovery Tags</Label>
//                       <Input value={form.tags} onChange={e => handleChange("tags", e.target.value)} placeholder="tag1, tag2, tag3" className={inputClass} />
//                     </div>

//                     <label className="flex items-center gap-4 cursor-pointer p-6 rounded-[28px] border-2 border-dashed border-stone-200 dark:border-border bg-white dark:bg-surface/40 hover:bg-white dark:bg-surface/80 transition-all group w-fit">
//                       <div className="relative flex items-center">
//                         <input type="checkbox" checked={form.is_featured} onChange={e => handleChange("is_featured", e.target.checked)} className="peer sr-only" />
//                         <div className="w-6 h-6 rounded-lg border-2 border-stone-300 bg-white dark:bg-surface peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center text-white">
//                            <CheckCircle2 className="h-4 w-4 scale-0 peer-checked:scale-100 transition-transform" />
//                         </div>
//                       </div>
//                       <span className="text-[11px] font-black uppercase tracking-widest text-stone-900 dark:text-white">Mark as Featured Asset</span>
//                     </label>
//                   </div>
//                 </div>

//                 {/* Valuation & Inventory */}
//                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
//                   <div className="pb-4 border-t border-stone-100 dark:border-border pt-8">
//                     <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
//                       <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100 flex items-center justify-center">
//                          <DollarSign className="h-5 w-5" />
//                       </div>
//                       Valuation & Inventory
//                     </h2>
//                     <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Economic parameters and stock control</p>
//                   </div>

//                   <div className="space-y-6">
//                     <div className="grid grid-cols-2 gap-6">
//                       <div className="space-y-3">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Unit valuation *</Label>
//                         <Input type="number" min="0" step="0.01" value={form.price} onChange={e => handleChange("price", e.target.value)} className={cn(inputClass, "text-xl font-black")} required />
//                       </div>
//                       <div className="space-y-3">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Strike-through Price</Label>
//                         <Input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={e => handleChange("compare_at_price", e.target.value)} className={inputClass} />
//                       </div>
//                     </div>

//                     <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-border/50">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Pricing Model</Label>
//                       <div className="flex flex-wrap gap-4">
//                         <button
//                           type="button"
//                           onClick={() => handleChange("pricing_type", "one_time")}
//                           className={cn(
//                             "flex-1 min-w-[140px] p-5 rounded-[24px] border-2 text-left transition-all",
//                             form.pricing_type === "one_time"
//                               ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10"
//                               : "border-stone-100 dark:border-border hover:border-stone-200"
//                           )}
//                         >
//                           <div className="flex items-center gap-2 mb-1">
//                             <div className={cn("h-2.5 w-2.5 rounded-full", form.pricing_type === "one_time" ? "bg-emerald-500" : "bg-zinc-300")} />
//                             <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">Direct Pay</span>
//                           </div>
//                           <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Standard one-time purchase</p>
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => handleChange("pricing_type", "recurring")}
//                           className={cn(
//                             "flex-1 min-w-[140px] p-5 rounded-[24px] border-2 text-left transition-all",
//                             form.pricing_type === "recurring"
//                               ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10"
//                               : "border-stone-100 dark:border-border hover:border-stone-200"
//                           )}
//                         >
//                           <div className="flex items-center gap-2 mb-1">
//                             <div className={cn("h-2.5 w-2.5 rounded-full", form.pricing_type === "recurring" ? "bg-indigo-500" : "bg-zinc-300")} />
//                             <span className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">Membership Plan</span>
//                           </div>
//                           <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Subscription or recurring bill</p>
//                         </button>
//                       </div>

//                       {form.pricing_type === "recurring" && (
//                         <div className="animate-in slide-in-from-top-2 duration-300 space-y-3 pb-2 pl-4 border-l-2 border-indigo-100">
//                           <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500">Billing Period</Label>
//                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
//                             {["weekly", "monthly", "quarterly", "yearly"].map((period) => (
//                               <button
//                                 key={period}
//                                 type="button"
//                                 onClick={() => handleChange("billing_period", period)}
//                                 className={cn(
//                                   "py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
//                                   form.billing_period === period
//                                     ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
//                                     : "bg-white dark:bg-surface border-stone-200 dark:border-border text-stone-500 hover:border-indigo-300"
//                                 )}
//                               >
//                                 {period}
//                               </button>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     <div className="space-y-3">
//                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Purchase button text <span className="opacity-60 font-normal">(Optional)</span></Label>
//                       <select value={form.button_text} onChange={e => handleChange("button_text", e.target.value)} className={selectClass}>
//                         <option value="">Default (Add / Access)</option>
//                         <option value="Join">Join</option>
//                         <option value="Call now">Call now</option>
//                         <option value="Complete order">Complete order</option>
//                         <option value="Contact us">Contact us</option>
//                         <option value="Donate now">Donate now</option>
//                         <option value="Get access">Get access</option>
//                         <option value="Get offer">Get offer</option>
//                         <option value="Order now">Order now</option>
//                         <option value="Purchase">Purchase</option>
//                         <option value="Shop now">Shop now</option>
//                         <option value="Sign up">Sign up</option>
//                       </select>
//                     </div>

//                     {!form.is_digital && (
//                       <div className="space-y-3">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Registry Stock Allocation</Label>
//                         <Input type="number" min="0" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} className={cn(inputClass, "max-w-[240px] text-lg font-black")} />
//                       </div>
//                     )}
//                   </div>
//                 </div>


//                 {/* Digital Assets Section */}
//                 {form.is_digital && (
//                   <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
//                     <div className="pb-4 border-t border-stone-100 dark:border-border pt-8">
//                       <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
//                         <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm border border-indigo-100 flex items-center justify-center">
//                            <Zap className="h-5 w-5" />
//                         </div>
//                         Digital Distribution
//                       </h2>
//                       <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Update the asset file for delivery</p>
//                     </div>

//                     <div className="space-y-4">
//                       <CloudinaryUploadButton 
//                         folder="jimvio/digital-files"
//                         resourceType="raw"
//                         onUploadSuccess={(url) => handleChange("digital_file_url", url)}
//                         buttonText="Upload New Asset File"
//                       />
//                       {form.digital_file_url && (
//                         <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 rounded-2xl">
//                           <CheckCircle2 className="h-4 w-4" /> Asset file verified and ready for delivery
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 )}

//                 {/* Affiliate Node */}
//                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
//                   <div className="pb-4 border-t border-stone-100 dark:border-border pt-8">
//                     <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight flex items-center gap-3">
//                       <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-500 shadow-sm border border-rose-100 flex items-center justify-center">
//                          <Rocket className="h-5 w-5" />
//                       </div>
//                       Propagation incentive
//                     </h2>
//                     <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Commission structural parameters</p>
//                   </div>

//                   <div className="space-y-6">
//                     <div className="flex items-center justify-between gap-6 p-7 rounded-[32px] border border-stone-200/50 bg-white dark:bg-surface/40 backdrop-blur-md group hover:bg-stone-900/[0.02] transition-colors">
//                       <div className="flex items-start gap-4">
//                         <div className="w-12 h-12 rounded-[18px] bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
//                            <Zap className="h-6 w-6 text-orange-500" />
//                         </div>
//                         <div>
//                           <p className="text-[14px] font-black text-stone-900 dark:text-white uppercase tracking-widest">Affiliate Node Access</p>
//                           <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest leading-relaxed">Let global affiliates earn commissions on this asset</p>
//                         </div>
//                       </div>
//                       <label className="relative inline-flex items-center cursor-pointer">
//                         <input type="checkbox" className="sr-only peer" checked={form.affiliate_enabled} onChange={e => handleChange("affiliate_enabled", e.target.checked)} />
//                         <div className="w-14 h-8 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white dark:bg-surface after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" />
//                       </label>
//                     </div>

//                     {form.affiliate_enabled && (
//                       <div className="space-y-3 px-1 animate-in slide-in-from-top-2 duration-300">
//                         <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Distribution Bounty (%)</Label>
//                         <Input type="number" min="1" max="90" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} className={cn(inputClass, "max-w-[200px] text-lg font-black")} />
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {error && (
//                   <div className="rounded-[24px] border-2 border-rose-100 bg-rose-50 px-8 py-5 text-[13px] font-bold text-rose-500">
//                     Registry Conflict: {error}
//                   </div>
//                 )}

//                 <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-stone-100 dark:border-border">
//                   <Button type="submit" disabled={isPending} className="h-14 px-10 rounded-2xl bg-stone-900 text-white hover:bg-black font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-stone-900/20 active:scale-95 transition-all w-full sm:w-auto">
//                     {isPending ? (
//                       <div className="flex items-center gap-3">
//                          <Loader2 className="h-4 w-4 animate-spin" /> Synchronizing...
//                       </div>
//                     ) : (
//                       <div className="flex items-center gap-2">
//                          <Save className="h-4 w-4 mr-2" /> Commit Refinements
//                       </div>
//                     )}
//                   </Button>
//                   <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 dark:text-white transition-all border border-stone-100 dark:border-border hover:bg-white dark:bg-surface w-full sm:w-auto" asChild>
//                     <Link href="/dashboard/products">Cancel Protocol</Link>
//                   </Button>
//                 </div>
//              </div>
//           </GlassCard>
//         </form>
//       </div>
//     </div>
//   );
// }
"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, DollarSign, Loader2, CheckCircle2,
  Trash2, ShoppingBag, Globe, Upload, AlertTriangle,
  X, ExternalLink, Image as ImageIcon, Zap, Edit,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field-input";
import { Field, FieldLabel } from "@/components/ui/field";
import CustomSelect from "@/components/ui/select-2";
import { StyledTextarea } from "@/components/ui/textarea";

/* ── helpers ── */
function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── constants ── */
const PRODUCT_TYPES = [
  { id: "physical", label: "Physical", icon: ShoppingBag, hint: "Ships to customer" },
  { id: "digital",  label: "Digital",  icon: Globe,       hint: "Instant download"  },
];

const BILLING_PERIODS = [
  { id: "weekly",    label: "Weekly"    },
  { id: "monthly",   label: "Monthly"   },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly",    label: "Yearly"    },
];

const STATUS_OPTIONS = [
  { id: "draft",    label: "Draft",    dot: "bg-[var(--color-text-muted)]" },
  { id: "active",   label: "Active",   dot: "bg-emerald-500"               },
  { id: "paused",   label: "Paused",   dot: "bg-amber-500"                 },
  { id: "archived", label: "Archived", dot: "bg-rose-500"                  },
];

const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join"];

/* ── sub-components ── */
function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl p-6 sm:p-8", className)}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ label, step }: { label: string; step: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span
        className="w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums"
        style={{
          background: "var(--color-surface-secondary)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        {step}
      </span>
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</h2>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
        checked ? "bg-orange-500" : "bg-[var(--color-border-strong)]"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      )} />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }: {
  title: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3.5 border-b last:border-0"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</p>
        {description && (
          <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)" }}>{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ── main ── */
export default function EditProductPage() {
  const router    = useRouter();
  const params    = useParams();
  const productId = params?.id as string;

  const [isPending, startTransition] = useTransition();
  const [loading,       setLoading      ] = useState(true);
  const [categories,    setCategories   ] = useState<any[]>([]);
  const [error,         setError        ] = useState<string | null>(null);
  const [success,       setSuccess      ] = useState(false);
  const [unsaved,       setUnsaved      ] = useState(false);
  const [originalName,  setOriginalName ] = useState("");

  const [form, setForm] = useState({
    name: "", slug: "", short_description: "", description: "",
    product_type: "physical" as "physical" | "digital",
    price: "0", currency: "USD", category_id: "", is_digital: false,
    pricing_type: "one_time" as "one_time" | "recurring",
    billing_period: "monthly", digital_file_url: "", track_inventory: true,
    inventory_quantity: "0", affiliate_enabled: false, affiliate_commission_rate: "10",
    is_featured: false, status: "draft", button_text: "", tags: "",
    weight: "", dimensions: "", images: [] as string[], vendor_id: "",
  });

  useEffect(() => {
    async function load() {
      if (!productId) { router.push("/dashboard/products"); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: product }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("product_categories").select("id, name, slug, category_type").eq("is_active", true).order("sort_order"),
      ]);

      if (!product) { router.push("/dashboard/products"); return; }

      setOriginalName(product.name);
      setCategories(cats ?? []);
      setForm({
        name:                     product.name ?? "",
        slug:                     product.slug ?? "",
        short_description:        product.short_description ?? "",
        description:              product.description ?? "",
        product_type:             (product.product_type as "physical" | "digital") ?? "physical",
        price:                    product.price?.toString() ?? "0",
        currency:                 product.currency ?? "USD",
        category_id:              product.category_id ?? "",
        is_digital:               product.is_digital ?? false,
        pricing_type:             (product.pricing_type as "one_time" | "recurring") ?? "one_time",
        billing_period:           product.billing_period ?? "monthly",
        digital_file_url:         product.digital_file_url ?? "",
        track_inventory:          product.track_inventory ?? true,
        inventory_quantity:       product.inventory_quantity?.toString() ?? "0",
        affiliate_enabled:        product.affiliate_enabled ?? false,
        affiliate_commission_rate:product.affiliate_commission_rate?.toString() ?? "10",
        is_featured:              product.is_featured ?? false,
        status:                   product.status ?? "draft",
        button_text:              product.button_text ?? "",
        tags:                     Array.isArray(product.tags) ? product.tags.join(", ") : (product.tags ?? ""),
        weight:                   product.weight?.toString() ?? "",
        dimensions:               product.dimensions ?? "",
        images:                   product.images ?? [],
        vendor_id:                product.vendor_id ?? "",
      });
      setLoading(false);
    }
    load();
  }, [productId, router]);

  function handleChange(field: string, value: any) {
    setUnsaved(true);
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "name") updated.slug = slugify(value);
      if (field === "product_type") {
        updated.is_digital = value === "digital";
        if (value !== "digital") updated.pricing_type = "one_time";
      }
      return updated;
    });
  }

  function handleImageUpload(url: string) {
    setUnsaved(true);
    setForm(prev => ({ ...prev, images: [...prev.images, url] }));
  }
  function removeImage(index: number) {
    setUnsaved(true);
    setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
  }

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) { setError("Product name is required."); return; }

    startTransition(async () => {
      const supabase = createClient();
      const price = parseFloat(form.price) || 0;

      const payload = {
        name: form.name, slug: form.slug,
        short_description: form.short_description || null,
        description: form.description || null,
        product_type: form.product_type, status: form.status, price,
        currency: form.currency, pricing_type: form.pricing_type,
        billing_period: form.pricing_type === "recurring" ? form.billing_period : null,
        category_id: form.category_id || null, is_digital: form.is_digital,
        digital_file_url: form.is_digital ? (form.digital_file_url || null) : null,
        track_inventory: !form.is_digital && form.track_inventory,
        inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity || "0"),
        weight: !form.is_digital ? (parseFloat(form.weight) || null) : null,
        dimensions: !form.is_digital ? (form.dimensions || null) : null,
        affiliate_enabled: form.affiliate_enabled,
        affiliate_commission_rate: form.affiliate_enabled ? parseFloat(form.affiliate_commission_rate || "10") : null,
        is_featured: form.is_featured, button_text: form.button_text || null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        images: form.images, updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase.from("products").update(payload).eq("id", productId);
      if (updateErr) { setError(updateErr.message); }
      else { setSuccess(true); setUnsaved(false); setTimeout(() => setSuccess(false), 3000); }
    });
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${originalName}"? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("products").update({ is_active: false, status: "archived" }).eq("id", productId);
    router.push("/dashboard/products");
  }

  const isFree = parseFloat(form.price) === 0;
  const filteredCategories = categories.filter(c => {
    const ct = c.category_type;
    if (form.product_type === "digital") return ct === "digital";
    return ct === "physical" || ct === "both" || !ct;
  });
  const currentStatus = STATUS_OPTIONS.find(s => s.id === form.status) ?? STATUS_OPTIONS[0];

  /* ── loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-accent)" }} />
        </div>
        <p className="text-xs font-medium tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Loading product
        </p>
      </div>
    </div>
  );

  const inputStyle = "pl-3 h-10";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur"
        style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/products"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
              onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div className="flex items-center gap-2 text-xs min-w-0" style={{ color: "var(--color-text-muted)" }}>
              <span>Products</span>
              <span>/</span>
              <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                {originalName || "Edit"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Unsaved indicator */}
            {unsaved && !isPending && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            )}

            {/* Status pill */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", currentStatus.dot)} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {currentStatus.label}
              </span>
            </div>

            <button
              onClick={handleDelete}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              onMouseEnter={e => { (e.currentTarget.style.color = "#f43f5e"); (e.currentTarget.style.borderColor = "rgba(244,63,94,0.3)"); (e.currentTarget.style.background = "rgba(244,63,94,0.05)"); }}
              onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); (e.currentTarget.style.background = "var(--color-surface)"); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <Link
              href={`/product/${form.slug}`}
              target="_blank"
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              onMouseEnter={e => { (e.currentTarget.style.color = "var(--color-text-primary)"); (e.currentTarget.style.borderColor = "var(--color-border-strong)"); }}
              onMouseLeave={e => { (e.currentTarget.style.color = "var(--color-text-muted)"); (e.currentTarget.style.borderColor = "var(--color-border)"); }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleSave}
              disabled={isPending}
              className={cn(
                "flex items-center gap-2 h-8 px-4 rounded-xl text-xs font-semibold transition-all",
                success ? "text-emerald-500" : "text-white"
              )}
              style={
                success
                  ? { background: "rgba(48,164,108,0.12)", border: "1px solid rgba(48,164,108,0.25)" }
                  : { background: "var(--color-accent)", boxShadow: "0 0 16px rgba(253,80,0,0.25)" }
              }
              onMouseEnter={e => { if (!success && !isPending) (e.currentTarget.style.background = "var(--color-accent-hover)") } }
              onMouseLeave={e => { if (!success && !isPending) (e.currentTarget.style.background = "var(--color-accent)") } }
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Edit className="w-3.5 h-3.5" />}
              {isPending ? "Saving…" : success ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.2)" }}>
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-500">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-rose-500/60 hover:text-rose-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT ── */}
          <div className="space-y-5">

            {/* 1. Core Details */}
            <SectionCard>
              <SectionTitle label="Core Details" step="1" />
              <div className="space-y-5">
                <Field label="Product name" required>
                  <FieldInput
                    value={form.name}
                    onChange={e => handleChange("name", e.target.value)}
                    placeholder="Give your product a clear, descriptive name"
                    className={inputStyle}
                  />
                </Field>

                <Field label="URL slug" hint="Auto-generated from name">
                  <div className="flex items-center">
                    <span
                      className="h-10 flex items-center px-3 border border-r-0 rounded-l-xl text-[11px] font-mono whitespace-nowrap"
                      style={{
                        background: "var(--color-surface-secondary)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      /product/
                    </span>
                    <FieldInput
                      value={form.slug}
                      onChange={e => handleChange("slug", e.target.value)}
                      className={cn(inputStyle, "rounded-l-none font-mono text-xs")}
                      placeholder="my-product-name"
                    />
                  </div>
                </Field>

                <Field label="Short description" hint="Shown in listings and search">
                  <FieldInput
                    value={form.short_description}
                    onChange={e => handleChange("short_description", e.target.value)}
                    placeholder="One compelling sentence about your product"
                    className={inputStyle}
                  />
                </Field>

                <Field label="Full description" hint="Markdown supported">
                  <StyledTextarea
                    value={form.description}
                    onChange={e => handleChange("description", e.target.value)}
                    rows={7}
                    placeholder="Describe your product in detail — features, specs, what's included…"
                  />
                </Field>
              </div>
            </SectionCard>

            {/* 2. Media */}
            <SectionCard>
              <SectionTitle label="Media" step="2" />
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center group cursor-pointer transition-colors"
                style={{ borderColor: "var(--color-border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
              >
                <CloudinaryDropzone
                  folder="jimvio/products"
                  onUploadSuccess={handleImageUpload}
                  label={
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: "var(--color-surface-secondary)" }}
                      >
                        <ImageIcon className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium transition-colors" style={{ color: "var(--color-text-muted)" }}>
                          Drop images here or click to upload
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                          JPG, PNG, WEBP — max 10MB per file
                        </p>
                      </div>
                    </div>
                  }
                />
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                  {form.images.map((url, i) => (
                    <div
                      key={url}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                    >
                      <CloudinaryImage src={url} alt={`Image ${i + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      {i === 0 && (
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur rounded-md text-[9px] font-semibold text-white uppercase tracking-wide">
                          Main
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 3. Type & Pricing */}
            <SectionCard>
              <SectionTitle label="Type & Pricing" step="3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Type + category */}
                <div className="space-y-5">
                  <div>
                    <FieldLabel label="Product type" />
                    <div className="grid grid-cols-2 gap-2">
                      {PRODUCT_TYPES.map(type => {
                        const Icon = type.icon;
                        const sel  = form.product_type === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => handleChange("product_type", type.id)}
                            className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                            style={{
                              border: sel ? "1px solid rgba(253,80,0,0.4)" : "1px solid var(--color-border)",
                              background: sel ? "rgba(253,80,0,0.05)" : "var(--color-surface-secondary)",
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                              style={sel ? { background: "var(--color-accent)", color: "#fff" } : { background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                                {type.label}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>{type.hint}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Field label="Category" hint="Helps buyers find your product">
                    <CustomSelect
                      value={form.category_id}
                      onChange={v => handleChange("category_id", v)}
                      options={[
                        ...filteredCategories.map(c => ({ value: c.id, label: c.name })),
                        { value: "", label: "Uncategorized" },
                      ]}
                    />
                  </Field>
                </div>

                {/* Pricing */}
                <div className="space-y-5" style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "2rem" }}>
                  <div>
                    <FieldLabel label="Pricing model" />
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: "free", label: "Free" }, { id: "paid", label: "Paid" }].map(opt => {
                        const sel = opt.id === "free" ? isFree : !isFree;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
                            className="h-9 rounded-xl text-xs font-semibold transition-all"
                            style={sel
                              ? { border: "1px solid rgba(253,80,0,0.4)", background: "var(--color-accent)", color: "#fff" }
                              : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }
                            }
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!isFree && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Currency">
                          <CustomSelect
                            value={form.currency}
                            onChange={v => handleChange("currency", v)}
                            options={[
                              { value: "USD", label: "USD" },
                              { value: "EUR", label: "EUR" },
                              { value: "GBP", label: "GBP" },
                            ]}
                          />
                        </Field>
                        <Field label="Price" icon={<DollarSign className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />}>
                          <FieldInput
                            type="number"
                            value={form.price}
                            onChange={e => handleChange("price", e.target.value)}
                            className="pl-8 font-mono"
                            min={0}
                          />
                        </Field>
                      </div>

                      {form.product_type === "digital" && (
                        <div className="space-y-3">
                          <FieldLabel label="Billing type" />
                          <div className="grid grid-cols-2 gap-2">
                            {[{ id: "one_time", label: "One-time" }, { id: "recurring", label: "Recurring" }].map(opt => {
                              const sel = form.pricing_type === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleChange("pricing_type", opt.id)}
                                  className="h-9 rounded-xl text-xs font-semibold transition-all"
                                  style={sel
                                    ? { border: "1px solid rgba(253,80,0,0.4)", background: "rgba(253,80,0,0.1)", color: "var(--color-accent)" }
                                    : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }
                                  }
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          {form.pricing_type === "recurring" && (
                            <div>
                              <FieldLabel label="Billing period" />
                              <div className="flex flex-wrap gap-2">
                                {BILLING_PERIODS.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleChange("billing_period", p.id)}
                                    className="px-3 h-8 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all"
                                    style={form.billing_period === p.id
                                      ? { border: "1px solid rgba(253,80,0,0.4)", background: "var(--color-accent)", color: "#fff" }
                                      : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }
                                    }
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* 4. Fulfillment */}
            <SectionCard>
              <SectionTitle label="Fulfillment" step="4" />

              {form.product_type === "digital" ? (
                <div className="space-y-4">
                  <div
                    className="p-4 rounded-xl"
                    style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Upload className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Digital file</p>
                    </div>
                    {form.digital_file_url ? (
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-xs font-mono truncate flex-1" style={{ color: "var(--color-text-muted)" }}>
                          {form.digital_file_url}
                        </p>
                        <button onClick={() => handleChange("digital_file_url", "")} className="text-rose-400 hover:text-rose-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <CloudinaryUploadButton
                        folder="jimvio/digital-files"
                        resourceType="raw"
                        onUploadSuccess={url => handleChange("digital_file_url", url)}
                        className="px-5 h-9 rounded-xl text-xs font-semibold transition-all"
                        // style={{
                        //   background: "var(--color-surface)",
                        //   border: "1px solid var(--color-border)",
                        //   color: "var(--color-text-secondary)",
                        // }}
                      />
                    )}
                  </div>

                  <Field label="Manual file URL" hint="Or paste a direct URL">
                    <FieldInput
                      placeholder="https://your-cdn.com/file.zip"
                      value={form.digital_file_url}
                      onChange={e => handleChange("digital_file_url", e.target.value)}
                      className="font-mono text-xs h-10 pl-3"
                    />
                  </Field>
                </div>
              ) : (
                <div className="space-y-6">
                  <div
                    className="p-4 rounded-xl"
                    style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                  >
                    <ToggleRow
                      title="Track inventory"
                      description="Automatically reduce stock when orders are placed"
                      checked={form.track_inventory}
                      onChange={v => handleChange("track_inventory", v)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <FieldLabel label="Stock quantity" />
                      <FieldInput
                        type="number"
                        value={form.inventory_quantity}
                        onChange={e => handleChange("inventory_quantity", e.target.value)}
                        disabled={!form.track_inventory}
                        className={cn("h-10 pl-3", !form.track_inventory && "opacity-40 cursor-not-allowed")}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Weight" hint="kg" />
                      <FieldInput
                        type="number" step="0.01"
                        value={form.weight}
                        onChange={e => handleChange("weight", e.target.value)}
                        placeholder="0.00"
                        className="h-10 pl-3"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Dimensions" hint="e.g. 10×10×5 cm" />
                      <FieldInput
                        value={form.dimensions}
                        onChange={e => handleChange("dimensions", e.target.value)}
                        placeholder="L × W × H"
                        className="h-10 pl-3"
                      />
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-5">

            {/* Status */}
            <SectionCard>
              <FieldLabel label="Status" />
              <div className="space-y-1">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("status", opt.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all"
                    style={form.status === opt.id
                      ? { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border-strong)" }
                      : { background: "transparent", border: "1px solid transparent" }
                    }
                    onMouseEnter={e => { if (form.status !== opt.id) (e.currentTarget.style.background = "var(--color-surface-secondary)"); }}
                    onMouseLeave={e => { if (form.status !== opt.id) (e.currentTarget.style.background = "transparent"); }}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: form.status === opt.id ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
                    >
                      {opt.label}
                    </span>
                    {form.status === opt.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--color-text-muted)" }} />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                <ToggleRow
                  title="Featured"
                  description="Highlight in store showcase"
                  checked={form.is_featured}
                  onChange={v => handleChange("is_featured", v)}
                />
              </div>
            </SectionCard>

            {/* CTA + Tags */}
            <SectionCard>
              <div className="space-y-5">
                <div>
                  <Field label="Call-to-action button">
                    <FieldInput
                      value={form.button_text}
                      onChange={e => handleChange("button_text", e.target.value)}
                      placeholder="e.g. Buy Now"
                      className="h-10 pl-3 mb-2"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BUTTON_TEXTS.map(txt => (
                      <button
                        key={txt}
                        onClick={() => handleChange("button_text", txt)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={form.button_text === txt
                          ? { border: "1px solid rgba(253,80,0,0.4)", background: "rgba(253,80,0,0.1)", color: "var(--color-accent)" }
                          : { border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
                        }
                      >
                        {txt}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Tags" hint="Comma-separated">
                  <FieldInput
                    value={form.tags}
                    onChange={e => handleChange("tags", e.target.value)}
                    placeholder="design, template, minimal"
                    className="h-10 pl-3"
                  />
                </Field>
              </div>
            </SectionCard>

            {/* Affiliate */}
            <SectionCard>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate program</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Let others earn by promoting this</p>
                </div>
                <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
              </div>

              {form.affiliate_enabled && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <Field label="Commission rate" hint="% of sale price">
                    <div className="relative">
                      <FieldInput
                        type="number"
                        value={form.affiliate_commission_rate}
                        onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
                        className="h-10 pl-3 pr-8 font-mono"
                        min="1" max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
                    </div>
                  </Field>
                </div>
              )}
            </SectionCard>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isPending}
              className={cn(
                "w-full h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                success ? "text-emerald-500" : "text-white"
              )}
              style={
                success
                  ? { background: "rgba(48,164,108,0.12)", border: "1px solid rgba(48,164,108,0.25)" }
                  : { background: "var(--color-accent)", boxShadow: "0 0 20px rgba(253,80,0,0.2)" }
              }
              onMouseEnter={e => { if (!success && !isPending) (e.currentTarget.style.background = "var(--color-accent-hover)"); }}
              onMouseLeave={e => { if (!success && !isPending) (e.currentTarget.style.background = "var(--color-accent)"); }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {isPending ? "Saving…" : success ? "Changes saved" : "Save changes"}
            </button>

            <p className="text-[10px] text-center" style={{ color: "var(--color-text-muted)" }}>
              Changes go live based on product status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}