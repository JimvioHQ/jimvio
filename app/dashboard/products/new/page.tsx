// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ArrowLeft,
//   Zap,
//   DollarSign,
//   Loader2,
//   CheckCircle2,
//   Trash2,
//   Layers,
//   ShoppingBag,
//   Globe,
//   ChevronRight,
//   Upload,
//   Tag,
//   FileText,
//   Settings,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";

// function slugify(text: string) {
//   return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
// }

// const PRODUCT_TYPES = [
//   { id: "physical", label: "Physical", icon: ShoppingBag, description: "Tangible goods shipped to customers" },
//   { id: "digital",  label: "Digital",  icon: Globe,       description: "Downloads, templates, software & more" },
// ];

// const BILLING_PERIODS = ["weekly", "monthly", "quarterly", "yearly"];

// const BUTTON_TEXTS = ["Join", "Get access", "Order now", "Purchase", "Sign up", "Download", "Subscribe"];

// const inputBase = "h-10 w-full rounded-sm border border-border bg-white dark:bg-zinc-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all text-sm px-3.5";
// const selectBase = "h-10 w-full px-3.5 rounded-sm border border-border bg-white dark:bg-zinc-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all appearance-none cursor-pointer";
// const labelBase = "text-[11px] font-bold uppercase tracking-tight text-stone-500 mb-1.5 block";
// const cardBase = "bg-white dark:bg-zinc-900 border border-border rounded-sm p-6 shadow-sm";

// function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
//   return (
//     <div className="mb-5">
//       <h2 className="text-[15px] font-bold text-stone-900 dark:text-white tracking-tight">{title}</h2>
//       {subtitle && <p className="text-[12px] text-stone-400 mt-0.5">{subtitle}</p>}
//     </div>
//   );
// }

// function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
//   return (
//     <button
//       type="button"
//       onClick={() => onChange(!checked)}
//       className={cn(
//         "relative inline-flex h-6 w-11 shrink-0 items-center rounded-sm transition-colors focus:outline-none",
//         checked ? "bg-blue-600" : "bg-[#2A2A2A]"
//       )}
//     >
//       <span className={cn("inline-block h-4 w-4 transform rounded-sm bg-white transition-transform shadow-none", checked ? "translate-x-6" : "translate-x-1")} />
//     </button>
//   );
// }

// function ToggleRow({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
//   return (
//     <div className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0">
//       <div>
//         <p className="text-sm font-medium text-white">{title}</p>
//         {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
//       </div>
//       <Toggle checked={checked} onChange={onChange} />
//     </div>
//   );
// }

// function SelectWrapper({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="relative">
//       {children}
//       <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 rotate-90 pointer-events-none" />
//     </div>
//   );
// }

// export default function NewProductPage() {
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [vendor, setVendor] = useState<any>(null);
//   const [selectedVendorId, setSelectedVendorId] = useState<string>("");
//   const [categories, setCategories] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);
//   const [currentStep, setCurrentStep] = useState(1);

//   const [form, setForm] = useState({
//     name: "",
//     slug: "",
//     short_description: "",
//     description: "",
//     product_type: "physical" as "physical" | "digital",
//     price: "0",           // "0" = Free, anything else = Paid
//     currency: "USD",
//     category_id: "",
//     is_digital: false,
//     pricing_type: "one_time" as "one_time" | "recurring",
//     billing_period: "monthly",
//     digital_file_url: "",
//     track_inventory: true,
//     inventory_quantity: "0",
//     affiliate_enabled: false,
//     affiliate_commission_rate: "10",
//     is_featured: false,
//     status: "draft",
//     button_text: "",
//     tags: "",
//     weight: "",
//     dimensions: "",
//     images: [] as string[],
//   });

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { router.push("/login"); return; }
//       const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
//       if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
//       setVendor(vends[0]);
//       setSelectedVendorId(vends[0].id);
//       const { data: cats } = await supabase
//         .from("product_categories")
//         .select("id, name, slug, category_type")
//         .eq("is_active", true)
//         .order("sort_order");
//       setCategories(cats ?? []);
//     }
//     load();
//   }, [router]);

//   function handleChange(field: string, value: any) {
//     setForm((prev) => {
//       const updated = { ...prev, [field]: value };
//       if (field === "name") updated.slug = slugify(value);

//       if (field === "product_type") {
//         const isDigital = value === "digital";
//         updated.is_digital = isDigital;
//         // Reset pricing_type for physical (always one_time)
//         if (!isDigital) updated.pricing_type = "one_time";
//         // Reset category if it doesn't match new type
//         const currentCat = categories.find(c => c.id === updated.category_id);
//         if (currentCat) {
//           const catType = currentCat.category_type;
//           if (isDigital && catType === "physical") updated.category_id = "";
//           if (!isDigital && catType === "digital") updated.category_id = "";
//         }
//       }

//       // Auto-set button_text & pricing when a digital category is picked
//       if (field === "category_id" && updated.is_digital) {
//         const cat = categories.find(c => c.id === value);
//         const slug = cat?.slug?.toLowerCase() || "";
//         if (slug.includes("course") || slug.includes("ebook") || slug.includes("training")) {
//           updated.pricing_type = "recurring";
//           updated.button_text = updated.button_text || "Join";
//         } else if (slug.includes("software") || slug.includes("saas")) {
//           updated.pricing_type = "one_time";
//           updated.button_text = updated.button_text || "Get access";
//         } else if (slug.includes("template") || slug.includes("graphics") || slug.includes("photo")) {
//           updated.pricing_type = "one_time";
//           updated.button_text = updated.button_text || "Download";
//         }
//       }

//       return updated;
//     });
//   }

//   const isFree = form.price === "0";
//   const isPaid = !isFree;

//   function handleImageUpload(url: string) {
//     setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
//   }
//   function removeImage(index: number) {
//     setForm((prev) => {
//       const next = [...prev.images];
//       next.splice(index, 1);
//       return { ...prev, images: next };
//     });
//   }

//   async function handleSubmit(e?: React.FormEvent) {
//     if (e) e.preventDefault();
//     setError(null);
//     if (!vendor || !form.name) { setError("Product name is required."); return; }
//     if (isPaid && (!form.price || parseFloat(form.price) <= 0)) { setError("Please enter a valid price."); return; }

//     startTransition(async () => {
//       const supabase = createClient();
//       let slug = form.slug || slugify(form.name);
//       const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
//       if (existing) slug = `${slug}-${Date.now()}`;

//       const price = isFree ? 0 : parseFloat(form.price);

//       const payload = {
//         vendor_id: selectedVendorId,
//         name: form.name,
//         slug,
//         short_description: form.short_description || null,
//         description: form.description || null,
//         product_type: form.product_type,
//         status: form.status,
//         price,
//         currency: form.currency,
//         pricing_type: form.pricing_type,
//         billing_period: form.pricing_type === "recurring" ? form.billing_period : null,
//         category_id: form.category_id || null,
//         is_digital: form.is_digital,
//         digital_file_url: form.is_digital ? (form.digital_file_url || null) : null,
//         track_inventory: !form.is_digital && form.track_inventory,
//         inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity || "0"),
//         weight: !form.is_digital ? (parseFloat(form.weight) || null) : null,
//         dimensions: !form.is_digital ? (form.dimensions || null) : null,
//         affiliate_enabled: form.affiliate_enabled,
//         affiliate_commission_rate: form.affiliate_enabled ? parseFloat(form.affiliate_commission_rate || "10") : null,
//         is_featured: form.is_featured,
//         button_text: form.button_text || null,
//         tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
//         images: form.images,
//       };

//       const { error: insertErr } = await supabase.from("products").insert(payload);
//       if (insertErr) { setError(insertErr.message); }
//       else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
//     });
//   }

//   if (success) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#060606]">
//         <div className="relative">
//           <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-sm scale-150 animate-pulse" />
//           <div className="relative w-20 h-20 rounded-sm bg-[#111] border border-[#222] shadow-none flex items-center justify-center">
//             <CheckCircle2 className="h-10 w-10 text-orange-500" />
//           </div>
//         </div>
//         <div className="text-center">
//           <p className="text-base font-bold text-white">Product Successfully Created!</p>
//           <p className="text-sm text-zinc-500 mt-1">Redirecting you to the dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   const filteredCategories = categories.filter(c => {
//     const catType = c.category_type;
//     if (form.product_type === "digital") return catType === "digital";
//     return catType === "physical" || catType === "both" || !catType;
//   });

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
//       {/* Header Actions */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#222]">
//         <div className="flex items-center gap-4">
//           <Link
//             href="/dashboard/products"
//             className="w-10 h-10 flex items-center justify-center rounded-sm border border-[#222] bg-[#111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition-all"
//           >
//             <ArrowLeft className="w-5 h-5" />
//           </Link>
//           <div>
//             <h1 className="text-2xl font-bold text-white tracking-tight">Create Product</h1>
//             <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest font-semibold font-mono">Environment: PRODUCTION</p>
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <Button
//             variant="ghost"
//             onClick={() => router.push("/dashboard/products")}
//             className="text-zinc-400 hover:text-white h-10 px-6 rounded-sm underline-offset-4 hover:underline"
//           >
//             Discard
//           </Button>
//           <Button
//             onClick={() => handleSubmit()}
//             disabled={isPending}
//             className="bg-orange-600 hover:bg-orange-500 text-white px-8 h-10 rounded-sm font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all active:scale-95"
//           >
//             {isPending ? (
//               <Loader2 className="w-4 h-4 animate-spin mr-2" />
//             ) : (
//               <Zap className="w-4 h-4 mr-2" />
//             )}
//             Publish to Store
//           </Button>
//         </div>
//       </div>

//       {error && (
//         <div className="mb-8 p-4 bg-red-500/10 border-l-2 border-red-500 text-red-500 text-xs font-mono">
//           <span className="font-bold mr-2">[ERROR_EXECUTION_FAILURE]:</span> {error}
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
//         {/* Left Column: Form Content */}
//         <div className="lg:col-span-8 space-y-6">
//           {/* General Details */}
//           <div className={cardBase}>
//             <SectionHeader title="01. General Details" subtitle="Fundamental identification for your product asset." />
//             <div className="grid gap-6">
//               <div className="grid gap-2">
//                 <Label className={labelBase}>Product Name</Label>
//                 <Input
//                   placeholder="e.g. Premium Digital Template v1.0"
//                   value={form.name}
//                   onChange={(e) => handleChange("name", e.target.value)}
//                   className={inputBase}
//                 />
//               </div>

//               <div className="grid gap-2">
//                 <Label className={labelBase}>Slug / Endpoint</Label>
//                 <div className="relative flex">
//                   <div className="h-10 bg-[#0A0A0A] border border-[#222] border-r-0 px-4 flex items-center text-[11px] font-mono text-zinc-600 select-none">
//                     jimvio.com/p/
//                   </div>
//                   <Input
//                     value={form.slug}
//                     onChange={(e) => handleChange("slug", e.target.value)}
//                     className={cn(inputBase, "font-mono text-zinc-400")}
//                   />
//                 </div>
//               </div>

//               <div className="grid gap-2">
//                 <Label className={labelBase}>Tagline</Label>
//                 <Input
//                   placeholder="The primary hook for your customers"
//                   value={form.short_description}
//                   onChange={(e) => handleChange("short_description", e.target.value)}
//                   className={inputBase}
//                 />
//               </div>

//               <div className="grid gap-2">
//                 <Label className={labelBase}>Detailed Documentation / Description</Label>
//                 <Textarea
//                   placeholder="Full Markdown support enabled. Describe your assets, technical specs, or physical dimensions..."
//                   value={form.description}
//                   onChange={(e) => handleChange("description", e.target.value)}
//                   className={cn(inputBase, "min-h-[200px] py-4 leading-relaxed resize-none")}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Media Assets */}
//           <div className={cardBase}>
//             <SectionHeader title="02. Media Gallery" subtitle="Visual representation of the product payload." />
//             <div className="bg-[#0A0A0A] border-2 border-dashed border-[#222] hover:border-orange-500/50 hover:bg-[#111] transition-all p-8 text-center group cursor-pointer">
//               <CloudinaryDropzone 
//                 folder="jimvio/products" 
//                 onUploadSuccess={handleImageUpload} 
//                 label={
//                   <div className="flex flex-col items-center">
//                     <Upload className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-orange-500 transition-colors" />
//                     <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">Select Visual Assets</p>
//                     <p className="text-[10px] text-zinc-600 mt-1 font-mono">Supports: JPG, PNG, WEBP (MAX 10MB)</p>
//                   </div>
//                 }
//               />
//             </div>

//             {form.images.length > 0 && (
//               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
//                 {form.images.map((url, i) => (
//                   <div key={url} className="relative aspect-square border border-[#222] bg-[#0A0A0A] group overflow-hidden">
//                     <CloudinaryImage
//                       src={url}
//                       alt={`Asset ${i}`}
//                       fill
//                       className="object-cover group-hover:scale-110 transition-transform duration-500"
//                     />
//                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
//                     <button
//                       onClick={() => removeImage(i)}
//                       className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 scale-90 group-hover:scale-100"
//                     >
//                       <Trash2 className="w-3.5 h-3.5" />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Classification & Pricing */}
//           <div className={cardBase}>
//             <SectionHeader title="03. Configuration & Pricing" subtitle="Logic injection and monetization model." />

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//               <div className="space-y-6">
//                 <div className="grid gap-2">
//                   <Label className={labelBase}>Product Architecture</Label>
//                   <div className="grid grid-cols-2 gap-2">
//                     {PRODUCT_TYPES.map((type) => {
//                       const Icon = type.icon;
//                       const isSelected = form.product_type === type.id;
//                       return (
//                         <button
//                           key={type.id}
//                           onClick={() => handleChange("product_type", type.id)}
//                           className={cn(
//                             "flex items-center gap-3 p-4 border transition-all text-left group",
//                             isSelected 
//                               ? "border-orange-500 bg-orange-500/[0.03]" 
//                               : "border-[#222] bg-[#0A0A0A] hover:border-[#333]"
//                           )}
//                         >
//                           <div className={cn(
//                             "w-8 h-8 flex items-center justify-center rounded-sm transition-colors",
//                             isSelected ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
//                           )}>
//                             <Icon className="w-4 h-4" />
//                           </div>
//                           <div>
//                             <p className={cn("text-[11px] font-bold uppercase tracking-wider", isSelected ? "text-white" : "text-zinc-400")}>{type.label}</p>
//                             <p className="text-[9px] text-zinc-600 leading-tight">NODE_TYPE: {type.id.toUpperCase()}</p>
//                           </div>
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 <div className="grid gap-2">
//                   <Label className={labelBase}>Category Index</Label>
//                   <SelectWrapper>
//                     <select
//                       value={form.category_id}
//                       onChange={(e) => handleChange("category_id", e.target.value)}
//                       className={selectBase}
//                     >
//                       <option value="">UNCATEGORIZED_ASSET</option>
//                       {filteredCategories.map((cat) => (
//                         <option key={cat.id} value={cat.id}>{cat.name}</option>
//                       ))}
//                     </select>
//                   </SelectWrapper>
//                   {filteredCategories.length === 0 && (
//                      <p className="text-[10px] text-orange-400/80 font-mono mt-1">WARN: CATEGORY_LOOKUP_EMPTY. Run migration 057.</p>
//                   )}
//                 </div>
//               </div>

//               <div className="space-y-6 border-l border-[#222] pl-8">
//                 <div className="grid gap-4">
//                   <Label className={labelBase}>Payment Protocol</Label>
//                   <div className="flex gap-2">
//                     <button
//                       type="button"
//                       onClick={() => handleChange("price", "0")}
//                       className={cn(
//                         "flex-1 h-10 border text-[10px] font-bold uppercase tracking-widest transition-all",
//                         isFree ? "border-orange-500 bg-orange-600 text-white" : "border-[#222] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
//                       )}
//                     >
//                       Gratis
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => handleChange("price", "29.99")}
//                       className={cn(
//                         "flex-1 h-10 border text-[10px] font-bold uppercase tracking-widest transition-all",
//                         isPaid ? "border-orange-500 bg-orange-600 text-white" : "border-[#222] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
//                       )}
//                     >
//                       Premium
//                     </button>
//                   </div>
//                 </div>

//                 {isPaid && (
//                   <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <div className="grid grid-cols-2 gap-4">
//                       <div className="grid gap-2">
//                         <Label className={labelBase}>Currency</Label>
//                         <SelectWrapper>
//                           <select
//                             value={form.currency}
//                             onChange={(e) => handleChange("currency", e.target.value)}
//                             className={selectBase}
//                           >
//                             <option value="USD">USD</option>
//                             <option value="EUR">EUR</option>
//                             <option value="GBP">GBP</option>
//                           </select>
//                         </SelectWrapper>
//                       </div>
//                       <div className="grid gap-2">
//                         <Label className={labelBase}>Unit Price</Label>
//                         <div className="relative">
//                           <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
//                           <Input
//                             type="number"
//                             value={form.price}
//                             onChange={(e) => handleChange("price", e.target.value)}
//                             className={cn(inputBase, "pl-9 font-mono font-bold text-base")}
//                           />
//                         </div>
//                       </div>
//                     </div>

//                     {form.product_type === "digital" && (
//                       <div className="grid gap-4">
//                         <div>
//                           <Label className={labelBase}>Billing System</Label>
//                           <div className="flex gap-2">
//                             <button
//                               type="button"
//                               onClick={() => handleChange("pricing_type", "one_time")}
//                               className={cn(
//                                 "flex-1 px-4 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all",
//                                 form.pricing_type === "one_time" ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-[#222] text-zinc-600"
//                               )}
//                             >
//                               Once
//                             </button>
//                             <button
//                               type="button"
//                               onClick={() => handleChange("pricing_type", "recurring")}
//                               className={cn(
//                                 "flex-1 px-4 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all",
//                                 form.pricing_type === "recurring" ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-[#222] text-zinc-600"
//                               )}
//                             >
//                               Subs
//                             </button>
//                           </div>
//                         </div>
//                         {form.pricing_type === "recurring" && (
//                           <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
//                             <Label className={labelBase}>Cycle Period</Label>
//                             <div className="flex flex-wrap gap-2">
//                               {BILLING_PERIODS.map(p => (
//                                 <button
//                                   key={p}
//                                   type="button"
//                                   onClick={() => handleChange("billing_period", p)}
//                                   className={cn(
//                                     "px-3 py-1.5 border text-[9px] font-bold uppercase transition-all",
//                                     form.billing_period === p ? "border-orange-500 text-white bg-orange-600" : "border-[#222] text-zinc-500"
//                                   )}
//                                 >
//                                   {p}
//                                 </button>
//                               ))}
//                             </div>
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Fulfillment details */}
//           <div className={cardBase}>
//             <SectionHeader title="04. Fulfillment Strategy" subtitle="Delivery and stock management parameters." />

//             {form.product_type === "digital" ? (
//               <div className="grid gap-6">
//                 <div className="grid gap-2">
//                   <Label className={labelBase}>Payload Access URL</Label>
//                   <div className="bg-[#0A0A0A] border border-[#222] p-6 text-center space-y-4">
//                      <Upload className="w-6 h-6 text-zinc-700 mx-auto" />
//                      <p className="text-[10px] text-zinc-500 font-mono">Upload the direct delivery asset</p>
//                      <CloudinaryUploadButton
//                       folder="jimvio/digital-files"
//                       resourceType="raw"
//                       onUploadSuccess={url => handleChange("digital_file_url", url)}
//                       className="px-6 h-9 rounded-sm bg-orange-500 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition-colors"
//                     />
//                   </div>
//                   {form.digital_file_url && (
//                     <p className="text-[10px] font-mono text-orange-500 break-all">{form.digital_file_url}</p>
//                   )}
//                   <p className="text-[10px] text-zinc-600 mt-1">Manual delivery URL option:</p>
//                   <Input
//                     placeholder="https://..."
//                     value={form.digital_file_url}
//                     onChange={(e) => handleChange("digital_file_url", e.target.value)}
//                     className={cn(inputBase, "font-mono")}
//                   />
//                 </div>
//               </div>
//             ) : (
//               <div className="grid gap-8">
//                 <div className="p-4 bg-orange-500/[0.02] border border-orange-500/10">
//                   <ToggleRow
//                     title="Real-time Inventory Tracking"
//                     description="Automated depletion of stock units upon successful checkout."
//                     checked={form.track_inventory}
//                     onChange={(v) => handleChange("track_inventory", v)}
//                   />
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                   <div className="grid gap-2">
//                     <Label className={labelBase}>Unit Count</Label>
//                     <Input
//                       type="number"
//                       value={form.inventory_quantity}
//                       onChange={(e) => handleChange("inventory_quantity", e.target.value)}
//                       className={inputBase}
//                       disabled={!form.track_inventory}
//                     />
//                   </div>
//                   <div className="grid gap-2">
//                     <Label className={labelBase}>Weight (kg)</Label>
//                     <Input
//                       type="number"
//                       step="0.01"
//                       value={form.weight}
//                       onChange={(e) => handleChange("weight", e.target.value)}
//                       className={inputBase}
//                     />
//                   </div>
//                   <div className="grid gap-2">
//                     <Label className={labelBase}>Dimensions</Label>
//                     <Input
//                       placeholder="e.g. 10x10x10 cm"
//                       value={form.dimensions}
//                       onChange={(e) => handleChange("dimensions", e.target.value)}
//                       className={inputBase}
//                     />
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Right Column: Sidebar Actions & Summary */}
//         <div className="lg:col-span-4 space-y-6">
//           <div className="sticky top-24 space-y-6">
//             {/* Status Panel */}
//             <div className={cn(cardBase, "border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)]")}>
//               <SectionHeader title="Status & Visibility" subtitle="Deployment state of this product." />
//               <div className="space-y-4">
//                 <div className="flex gap-2">
//                   {["draft", "published", "archived"].map((stat) => (
//                     <button
//                       key={stat}
//                       onClick={() => handleChange("status", stat)}
//                       className={cn(
//                         "flex-1 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all",
//                         form.status === stat 
//                           ? "border-orange-500 bg-orange-600 text-white" 
//                           : "border-[#222] bg-[#0A0A0A] text-zinc-600 hover:text-zinc-400"
//                       )}
//                     >
//                       {stat}
//                     </button>
//                   ))}
//                 </div>

//                 <div className="pt-4 border-t border-[#222]">
//                   <ToggleRow
//                     title="Featured Status"
//                     description="Pin to store showcase."
//                     checked={form.is_featured}
//                     onChange={(v) => handleChange("is_featured", v)}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Presentation Panel */}
//             <div className={cardBase}>
//               <SectionHeader title="Presentation" subtitle="How buyers interact with the listing." />
//               <div className="space-y-6">
//                 <div className="grid gap-2">
//                   <Label className={labelBase}>Interface Button (CTA)</Label>
//                   <Input
//                     placeholder="Enter Custom Text..."
//                     value={form.button_text}
//                     onChange={(e) => handleChange("button_text", e.target.value)}
//                     className={inputBase}
//                   />
//                   <div className="flex flex-wrap gap-1.5 mt-2">
//                     {BUTTON_TEXTS.map(txt => (
//                       <button
//                         key={txt}
//                         type="button"
//                         onClick={() => handleChange("button_text", txt)}
//                         className={cn(
//                           "px-2 py-1 text-[9px] font-bold uppercase border transition-all",
//                           form.button_text === txt ? "border-orange-500 text-orange-500 bg-orange-500/10" : "border-[#222] text-zinc-600 hover:border-[#333]"
//                         )}
//                       >
//                         {txt}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="grid gap-2">
//                    <Label className={labelBase}>Metadata Tags</Label>
//                    <Input
//                     placeholder="tech, music, art (Comma separated)"
//                     value={form.tags}
//                     onChange={(e) => handleChange("tags", e.target.value)}
//                     className={inputBase}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Affiliate Matrix */}
//             <div className={cardBase}>
//               <SectionHeader title="Affiliate Matrix" subtitle="Commission-base growth logic." />
//               <div className="space-y-4">
//                 <ToggleRow
//                   title="Enabled"
//                   checked={form.affiliate_enabled}
//                   onChange={(v) => handleChange("affiliate_enabled", v)}
//                 />

//                 {form.affiliate_enabled && (
//                   <div className="grid gap-2 animate-in slide-in-from-right-2 duration-300">
//                     <Label className={labelBase}>Commission Rate (%)</Label>
//                     <div className="relative">
//                        <Input
//                         type="number"
//                         value={form.affiliate_commission_rate}
//                         onChange={(e) => handleChange("affiliate_commission_rate", e.target.value)}
//                         className={cn(inputBase, "pr-10 font-mono")}
//                       />
//                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">%</span>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Quick Actions Panel */}
//             <div className="p-1 bg-orange-600">
//                <Button
//                 onClick={() => handleSubmit()}
//                 disabled={isPending}
//                 className="w-full bg-black hover:bg-zinc-900 border-0 text-white rounded-sm h-14 font-bold text-xs uppercase tracking-[0.2em] shadow-xl group"
//               >
//                 {isPending ? (
//                   <Loader2 className="w-5 h-5 animate-spin mr-3 text-orange-500" />
//                 ) : (
//                   <CheckCircle2 className="w-5 h-5 mr-3 text-orange-500 group-hover:scale-110 transition-transform" />
//                 )}
//                 Finalize Product
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, DollarSign, Loader2, CheckCircle2,
  Trash2, ShoppingBag, Globe, ChevronRight, Upload,
  AlertTriangle, Package, X, ExternalLink, Image as ImageIcon, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import { FieldInput } from "@/components/ui/field-input";
import { Field, FieldLabel } from "@/components/ui/field";
import CustomSelect from "@/components/ui/select-2";
import { StyledTextarea } from "@/components/ui/textarea";

/* ─── helpers ─────────────────────────────────────────────── */
function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

/* ─── constants ──────────────────────────────────────────── */
const PRODUCT_TYPES = [
  { id: "physical", label: "Physical", icon: ShoppingBag, hint: "Ships to customer" },
  { id: "digital", label: "Digital", icon: Globe, hint: "Instant download" },
];

const BILLING_PERIODS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

const STATUS_OPTIONS = [
  { id: "draft", label: "Draft", dot: "bg-zinc-400" },
  { id: "active", label: "Active", dot: "bg-emerald-500" },
  { id: "paused", label: "Paused", dot: "bg-amber-500" },
  { id: "archived", label: "Archived", dot: "bg-rose-500" },
];

const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join"];

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl p-6 sm:p-8", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ label, step }: { label: string; step: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[10px] font-bold text-zinc-500 flex items-center justify-center tabular-nums">
        {step}
      </span>
      <h2 className="text-sm font-semibold text-white tracking-tight">{label}</h2>
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
        checked ? "bg-orange-500" : "bg-[#2A2A2A]"
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
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#1A1A1A] last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-white font-medium">{title}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}



function StyledSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "w-full h-10 pl-3.5 pr-9 bg-[#111] border border-[#1E1E1E] rounded-xl text-sm text-white appearance-none",
          "focus:outline-none focus:border-zinc-600 transition-all duration-150 cursor-pointer",
          className
        )}
      >
        {children}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 rotate-90 pointer-events-none" />
    </div>
  );
}


/* ─── main ───────────────────────────────────────────────── */
export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    product_type: "physical" as "physical" | "digital",
    price: "0",
    currency: "USD",
    category_id: "",
    is_digital: false,
    pricing_type: "one_time" as "one_time" | "recurring",
    billing_period: "monthly",
    digital_file_url: "",
    track_inventory: true,
    inventory_quantity: "0",
    affiliate_enabled: false,
    affiliate_commission_rate: "10",
    is_featured: false,
    status: "draft",
    button_text: "",
    tags: "",
    weight: "",
    dimensions: "",
    images: [] as string[],
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
      if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
      setVendor(vends[0]);

      const { data: cats } = await supabase
        .from("product_categories")
        .select("id, name, slug, category_type")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(cats ?? []);
    }
    load();
  }, [router]);

  function handleChange(field: string, value: any) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name") updated.slug = slugify(value);
      if (field === "product_type") {
        const isDigital = value === "digital";
        updated.is_digital = isDigital;
        if (!isDigital) updated.pricing_type = "one_time";
        const currentCat = categories.find(c => c.id === updated.category_id);
        if (currentCat) {
          const catType = currentCat.category_type;
          if (isDigital && catType === "physical") updated.category_id = "";
          if (!isDigital && catType === "digital") updated.category_id = "";
        }
      }
      if (field === "category_id" && updated.is_digital) {
        const cat = categories.find(c => c.id === value);
        const slug = cat?.slug?.toLowerCase() || "";
        if (slug.includes("course") || slug.includes("ebook")) {
          updated.pricing_type = "recurring";
          updated.button_text = updated.button_text || "Join";
        } else if (slug.includes("software") || slug.includes("saas")) {
          updated.pricing_type = "one_time";
          updated.button_text = updated.button_text || "Get Access";
        } else if (slug.includes("template") || slug.includes("graphics")) {
          updated.pricing_type = "one_time";
          updated.button_text = updated.button_text || "Download";
        }
      }
      return updated;
    });
  }

  function handleImageUpload(url: string) {
    setForm(prev => ({ ...prev, images: [...prev.images, url] }));
  }
  function removeImage(index: number) {
    setForm(prev => {
      const next = [...prev.images];
      next.splice(index, 1);
      return { ...prev, images: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!vendor || !form.name.trim()) { setError("Product name is required."); return; }
    const price = parseFloat(form.price) || 0;
    if (price < 0) { setError("Price cannot be negative."); return; }

    startTransition(async () => {
      const supabase = createClient();
      let slug = form.slug || slugify(form.name);
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
      if (existing) slug = `${slug}-${Date.now()}`;

      const payload = {
        vendor_id: vendor.id,
        name: form.name,
        slug,
        short_description: form.short_description || null,
        description: form.description || null,
        product_type: form.product_type,
        status: form.status,
        price,
        currency: form.currency,
        pricing_type: form.pricing_type,
        billing_period: form.pricing_type === "recurring" ? form.billing_period : null,
        category_id: form.category_id || null,
        is_digital: form.is_digital,
        digital_file_url: form.is_digital ? (form.digital_file_url || null) : null,
        track_inventory: !form.is_digital && form.track_inventory,
        inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity || "0"),
        weight: !form.is_digital ? (parseFloat(form.weight) || null) : null,
        dimensions: !form.is_digital ? (form.dimensions || null) : null,
        affiliate_enabled: form.affiliate_enabled,
        affiliate_commission_rate: form.affiliate_enabled ? parseFloat(form.affiliate_commission_rate || "10") : null,
        is_featured: form.is_featured,
        button_text: form.button_text || null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        images: form.images,
      };

      const { error: insertErr } = await supabase.from("products").insert(payload);
      if (insertErr) { setError(insertErr.message); }
      else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
    });
  }

  const isFree = parseFloat(form.price) === 0;
  const filteredCategories = categories.filter(c => {
    const ct = c.category_type;
    if (form.product_type === "digital") return ct === "digital";
    return ct === "physical" || ct === "both" || !ct;
  });
  const currentStatus = STATUS_OPTIONS.find(s => s.id === form.status) ?? STATUS_OPTIONS[0];

  /* ─── success screen ── */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#080808]">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">Product created!</p>
          <p className="text-sm text-zinc-500 mt-1">Redirecting to your products…</p>
        </div>
      </div>
    );
  }

  const inputStyle = "pl-3 h-10"
  return (
    <div className="min-h-screen bg-[#080808]">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/products"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#111] border border-[#1E1E1E] text-zinc-500 hover:text-white hover:border-[#2A2A2A] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div className="flex items-center gap-2 text-xs text-zinc-600 min-w-0">
              <span>Products</span>
              <span>/</span>
              <span className="text-zinc-300 font-medium truncate">
                {form.name || "New product"}
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111] border border-[#1E1E1E]">
              <span className={cn("w-1.5 h-1.5 rounded-full", currentStatus.dot)} />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{currentStatus.label}</span>
            </div>

            <button
              onClick={() => router.push("/dashboard/products")}
              className="hidden sm:flex h-8 px-4 rounded-xl border border-[#1E1E1E] text-xs font-semibold text-zinc-500 hover:text-white transition-all"
            >
              Discard
            </button>

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 h-8 px-4 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_16px_rgba(249,115,22,0.25)] transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {isPending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-start gap-3 p-4 bg-rose-500/8 border border-rose-500/20 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-rose-500/60 hover:text-rose-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">

            {/* 1. Core Details */}
            <SectionCard>
              <SectionTitle label="Core Details" step="1" />
              <div className="space-y-5">
                <div>
                  <Field label="Name your product" required error={!form.name.trim().length && error ? "Product name is required." : undefined}>
                    <FieldInput
                      value={form.name}
                      onChange={e => handleChange("name", e.target.value)}
                      placeholder="Product name"
                      className={cn(inputStyle)}
                      hasError={!!error && !form.name.trim()}
                    />
                  </Field>
                </div>

                <div>
                  <Field label="URL slug" hint="Auto-generated from name" required error={!form.slug.trim().length && error ? "URL slug is required." : undefined}>
                    <div className="flex items-center">
                      <span className="h-10 flex items-center px-3 bg-bg border border-r-0 border-[#1E1E1E] rounded-l-md text-[11px] font-mono text-zinc-600 whitespace-nowrap">
                        /product/
                      </span>
                      <FieldInput
                        value={form.slug}
                        onChange={e => handleChange("slug", e.target.value)}
                        className={cn(inputStyle, "rounded-l-none")}
                        placeholder="my-product-name"
                      />
                    </div>
                  </Field>

                </div>

                <div>
                  <Field label="Short description" hint="Shown in listings and search">
                    <FieldInput
                      value={form.short_description}
                      onChange={e => handleChange("short_description", e.target.value)}
                      placeholder="One compelling sentence about your product"
                      className={cn(inputStyle, "pl-3")}
                    />
                  </Field>
                </div>

                <div>
                  <Field label="Full description" hint="Markdown supported">
                    <StyledTextarea
                      value={form.description}
                      onChange={e => handleChange("description", e.target.value)}
                      rows={7}
                      placeholder="Describe your product in detail — features, specs, what's included…"
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* 2. Media */}
            <SectionCard>
              <SectionTitle label="Media" step="2" />
              <div className="border-0 border-dashed border-[#1E1E1E] rounded-xl p-8 text-center hover:border-[#2A2A2A] transition-colors group cursor-pointer">
                <CloudinaryDropzone
                  folder="jimvio/products"
                  onUploadSuccess={handleImageUpload}
                  label={
                    <span className="flex flex-col items-center gap-2">
                      <span className="w-10 h-10 rounded-xl bg-[#151515] flex items-center justify-center group-hover:bg-[#1A1A1A] transition-colors">
                        <ImageIcon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </span>
                      <span className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
                          Drop images here or click to upload
                        </span>
                        <span className="text-xs text-zinc-600">JPG, PNG, WEBP — max 10MB per file</span>
                      </span>
                    </span>
                  }
                />
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                  {form.images.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-[#1E1E1E] group bg-[#111]">
                      <CloudinaryImage
                        src={url}
                        alt={`Image ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
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
                {/* Product type + category */}
                <div className="space-y-5">
                  <div>
                    <FieldLabel label="Product type" />
                    <div className="grid grid-cols-2 gap-2">
                      {PRODUCT_TYPES.map(type => {
                        const Icon = type.icon;
                        const sel = form.product_type === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => handleChange("product_type", type.id)}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-md border text-left transition-all",
                              sel ? "border-orange-500/60 bg-orange-500/5" : "border-[#1E1E1E] bg-[#0A0A0A] hover:border-[#2A2A2A]"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              sel ? "bg-orange-600 text-white" : "bg-[#1A1A1A] text-zinc-500"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={cn("text-xs font-semibold transition-colors", sel ? "text-white" : "text-zinc-400")}>{type.label}</p>
                              <p className="text-[10px] text-zinc-600">{type.hint}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Field label="Category" hint="Helps buyers find your product">
                      <CustomSelect
                        value={form.category_id}
                        onChange={e => handleChange("category_id", e)}
                        options={[
                          ...filteredCategories.map(c => ({ value: c.id, label: c.name })),
                          { value: "", label: "Uncategorized" }
                        ]}
                      />
                    </Field>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-l border-[#1A1A1A] pl-8 space-y-5">
                  <div>
                    <FieldLabel label="Pricing model" />
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "free", label: "Free" },
                        { id: "paid", label: "Paid" },
                      ].map(opt => {
                        const sel = opt.id === "free" ? isFree : !isFree;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
                            className={cn(
                              "h-9 rounded-xl border text-xs font-semibold transition-all",
                              sel ? "border-orange-500/60 bg-orange-600 text-white" : "border-[#1E1E1E] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
                            )}
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
                        <div>
                          <Field label="Currency">
                            <CustomSelect options={[
                              { value: "USD", label: "USD" },
                              { value: "EUR", label: "EUR" },
                              { value: "GBP", label: "GBP" }]}
                              value={form.currency}
                              onChange={value => handleChange("currency", value)} />
                          </Field>
                        </div>
                        <div>
                          <Field label="Price" icon={<DollarSign className="h-3.5 w-3.5 text-zinc-600" />}>
                            <FieldInput
                              type="number"
                              value={form.price}
                              onChange={e => handleChange("price", e.target.value)}
                              className="pl-8"
                              min={0}
                            />
                          </Field>
                        </div>
                      </div>

                      {form.product_type === "digital" && (
                        <div className="space-y-3">
                          <FieldLabel label="Billing type" />
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "one_time", label: "One-time" },
                              { id: "recurring", label: "Recurring" },
                            ].map(opt => {
                              const sel = form.pricing_type === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleChange("pricing_type", opt.id)}
                                  className={cn(
                                    "h-9 rounded-xl border text-xs font-semibold transition-all",
                                    sel ? "border-orange-500/60 bg-orange-500/10 text-orange-400" : "border-[#1E1E1E] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
                                  )}
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
                                    className={cn(
                                      "px-3 h-8 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-all",
                                      form.billing_period === p.id
                                        ? "border-orange-500/60 bg-orange-600 text-white"
                                        : "border-[#1E1E1E] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
                                    )}
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
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
                    <div className="flex items-center gap-3 mb-3">
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <p className="text-sm font-medium text-zinc-300">Digital file</p>
                    </div>
                    {form.digital_file_url ? (
                      <div className="flex items-center gap-3 p-3 bg-[#111] rounded-xl border border-[#1E1E1E]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-xs font-mono text-zinc-400 truncate flex-1">{form.digital_file_url}</p>
                        <button
                          onClick={() => handleChange("digital_file_url", "")}
                          className="text-zinc-600 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <CloudinaryUploadButton
                        folder="jimvio/digital-files"
                        resourceType="raw"
                        onUploadSuccess={url => handleChange("digital_file_url", url)}
                        className="px-5 h-9 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-semibold text-zinc-300 hover:text-white hover:border-[#333] transition-all"
                      />
                    )}
                  </div>

                  <div>
                    <FieldLabel hint="Or paste a direct URL" label="Manual file URL" />
                    <FieldInput
                      placeholder="https://your-cdn.com/file.zip"
                      value={form.digital_file_url}
                      onChange={e => handleChange("digital_file_url", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
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
                        className={cn(!form.track_inventory && "opacity-40 cursor-not-allowed", inputStyle)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <FieldLabel hint="kg" label="Weight" />
                      <FieldInput
                        type="number"
                        step="0.01"
                        value={form.weight}
                        onChange={e => handleChange("weight", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <FieldLabel hint="e.g. 10×10×5 cm" label="Dimensions" />
                      <FieldInput
                        value={form.dimensions}
                        onChange={e => handleChange("dimensions", e.target.value)}
                        placeholder="L × W × H"
                      />
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-5">

            {/* Status & Visibility */}
            <SectionCard>
              <FieldLabel label="Visibility / Status" />
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("status", opt.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all",
                      form.status === opt.id
                        ? "border-[#2A2A2A] bg-[#141414]"
                        : "border-transparent hover:border-[#1A1A1A] hover:bg-[#0A0A0A]"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                    <span className={cn("text-sm font-medium", form.status === opt.id ? "text-white" : "text-zinc-500")}>
                      {opt.label}
                    </span>
                    {form.status === opt.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
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
                  <Field label="Call-to-action button" required error={!form.button_text.trim() && error ? "Button text is required." : undefined}>
                    <FieldInput
                      value={form.button_text}
                      onChange={e => handleChange("button_text", e.target.value)}
                      placeholder="e.g. Buy Now"
                      className={cn(inputStyle, "mb-2")}
                    />
                  </Field>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BUTTON_TEXTS.map(txt => (
                      <button
                        key={txt}
                        onClick={() => handleChange("button_text", txt)}
                        className={cn(
                          "px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all",
                          form.button_text === txt
                            ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                            : "border-[#1E1E1E] text-zinc-600 hover:text-zinc-300 hover:border-[#2A2A2A]"
                        )}
                      >
                        {txt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Field label="Tags" >
                    <FieldInput
                      value={form.tags}
                      onChange={e => handleChange("tags", e.target.value)}
                      placeholder="design, template, minimal"
                      className={cn(inputStyle, "mb-2")}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            {/* Affiliate */}
            <SectionCard>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-white">Affiliate program</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Let others earn by promoting this</p>
                </div>
                <Toggle
                  checked={form.affiliate_enabled}
                  onChange={v => handleChange("affiliate_enabled", v)}
                />
              </div>

              {form.affiliate_enabled && (
                <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
                  <Field label="Commission rate" hint="Percentage of sale price that affiliates earn">
                    <div className="relative">
                      <FieldInput
                        type="number"
                        value={form.affiliate_commission_rate}
                        onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
                        className={cn(inputStyle, "pr-10")}
                        min="1"
                        max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-zinc-500">%</span>
                    </div>
                  </Field>

                </div>
              )}
            </SectionCard>

            {/* Publish button */}
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full h-11 rounded-md text-sm font-semibold flex items-center justify-center gap-2
               bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isPending ? "Publishing…" : "Publish product"}
            </Button>

            <p className="text-[10px] text-zinc-600 text-center">
              Draft products are saved but not visible to buyers
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}