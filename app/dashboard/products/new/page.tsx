"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Save,
  Zap,
  DollarSign,
  Image as ImageIcon,
  Info,
  Box,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  Layers,
  FileText,
  Tag,
  Rocket,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

const inputClass = "h-14 rounded-2xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold placeholder:text-stone-300 transition-all text-base px-6";
const selectClass =
  "h-14 w-full px-6 rounded-2xl border border-stone-200 bg-white/60 text-stone-900 font-bold text-base focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all shadow-sm";

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [userVendors, setUserVendors] = useState<Record<string, unknown>[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    product_type: "physical",
    price: "",
    compare_at_price: "",
    currency: "USD",
    category_id: "",
    is_digital: false,
    digital_file_url: "",
    track_inventory: true,
    inventory_quantity: "0",
    affiliate_enabled: true,
    affiliate_commission_rate: "10",
    influencer_enabled: true,
    is_featured: false,
    status: "draft",
    tags: "",
    images: [] as string[],
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
      
      if (!vends || vends.length === 0) {
        router.push("/dashboard/activate/vendor");
        return;
      }

      setUserVendors(vends);
      const initialVendor = vends[0];
      setVendor(initialVendor);
      setSelectedVendorId(initialVendor.id as string);

      const { data: cats } = await supabase
        .from("product_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(cats ?? []);
    }
    load();
  }, [router]);

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "name") updated.slug = slugify(value as string);
      if (field === "product_type")
        updated.is_digital = ["digital", "course", "software", "template", "ebook"].includes(value as string);
      return updated;
    });
  }

  function handleImageUpload(url: string) {
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
  }

  function removeImage(index: number) {
    setForm((prev) => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vendor || !form.name || !form.price) {
      setError("Product name and price are required.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      let slug = form.slug || slugify(form.name);
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
      if (existing) slug = `${slug}-${Date.now()}`;
      const payload: Record<string, unknown> = {
        vendor_id: selectedVendorId,
        name: form.name,
        slug,
        short_description: form.short_description || null,
        description: form.description || null,
        product_type: form.product_type,
        status: form.status,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        currency: form.currency,
        category_id: form.category_id || null,
        is_digital: form.is_digital,
        digital_file_url: form.is_digital && form.digital_file_url ? form.digital_file_url : null,
        track_inventory: !form.is_digital && form.track_inventory,
        inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity ?? "0"),
        affiliate_enabled: form.affiliate_enabled,
        affiliate_commission_rate: parseFloat(form.affiliate_commission_rate ?? "10"),
        influencer_enabled: form.influencer_enabled,
        is_featured: form.is_featured,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        images: form.images,
      };
      const { error: insertErr } = await supabase.from("products").insert(payload);
      if (insertErr) {
        setError(insertErr.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard/products"), 1500);
      }
    });
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-[24px] bg-white opacity-100 backdrop-blur-md border border-white shadow-2xl flex items-center justify-center overflow-hidden">
             <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-500" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[12px] font-black text-stone-900 uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Product Deployed</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Syncing assets with global inventory registry</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-24"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.06) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.06) 0%, transparent 55%), #f0ede8",
      }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-12">
        <div className="flex flex-col items-center text-center mb-16">
           <Link href="/dashboard/products" className="mb-8 group">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 border border-white/80 text-stone-500 hover:text-stone-900 transition-all shadow-sm">
                 <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                 <span className="text-[10px] font-bold uppercase tracking-widest pl-1">Back to Vault</span>
              </div>
           </Link>
           
           <div className="w-20 h-20 rounded-[28px] bg-white border border-white shadow-2xl flex items-center justify-center mb-6 relative group overflow-hidden">
              <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Package className="h-10 w-10 text-stone-900 group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <h1 className="text-4xl font-black text-stone-900 tracking-tighter mb-4">Deploy New Asset</h1>
           <p className="text-stone-600 font-semibold max-w-sm leading-relaxed">
              Register high-utility assets to your merchant storefront and initiate distribution across the global Jimvio network.
           </p>
        </div>

        <GlassCard className="p-0 overflow-hidden relative shadow-2xl border-white/80">
           <div className="absolute top-0 left-0 w-full h-1 bg-white/20 z-20" />
           <div className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="pb-4">
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-500 shadow-sm border border-orange-100 flex items-center justify-center">
                       <ImageIcon className="h-5 w-5" />
                    </div>
                    Visual Documentation
                  </h2>
                  <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">High-fidelity asset visualization protocol</p>
                </div>
                
                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-[30px] overflow-hidden border-2 border-white shadow-xl hover:scale-105 transition-all duration-300">
                        <CloudinaryImage src={img} alt={`Asset Layer ${i + 1}`} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button 
                            type="button" 
                            onClick={() => removeImage(i)}
                            className="bg-white/20 backdrop-blur-md hover:bg-rose-500 text-white rounded-full p-2.5 shadow-2xl transition-all hover:scale-110 active:scale-90"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                   <CloudinaryDropzone 
                    folder="jimvio/products"
                    onUploadSuccess={handleImageUpload}
                    label="Deploy New Asset Image"
                    sublabel="JPG/PNG/WEBP • Max 10MB • Recommended 1:1 ratio"
                  />
                  <div className="mt-4 flex flex-wrap gap-2 px-1">
                     <GlassPill color="orange" className="text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 opacity-70 border-white">Optimized Delivery</GlassPill>
                     <GlassPill color="sky" className="text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 opacity-70 border-white">CDN Edge Cache</GlassPill>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                <div className="pb-4">
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-500 shadow-sm border border-sky-100 flex items-center justify-center">
                       <FileText className="h-5 w-5" />
                    </div>
                    Asset Metadata
                  </h2>
                  <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Core classification and structural parameters</p>
                </div>
                <div className="space-y-8">
                  {userVendors.length > 1 && (
                    <div className="space-y-3">
                       <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Target Vault Node</Label>
                       <select
                        value={selectedVendorId}
                        onChange={(e) => setSelectedVendorId(e.target.value)}
                        className={selectClass}
                       >
                         {userVendors.map((v) => (
                           <option key={v.id as string} value={v.id as string}>
                             {v.business_name as string}
                           </option>
                         ))}
                       </select>
                       <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1 mt-1.5 opacity-60">Distribution node authorized for this asset</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Primary Asset Label *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g. iPhone 15 Pro Max 256GB"
                      className={inputClass}
                      required
                    />
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1 mt-1.5 opacity-60">Formal registry name for public distribution</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="product_type" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Architecture Type</Label>
                      <select
                        id="product_type"
                        value={form.product_type}
                        onChange={(e) => handleChange("product_type", e.target.value)}
                        className={selectClass}
                      >
                        <option value="physical">Physical Asset</option>
                        <option value="digital">Digital Utility</option>
                        <option value="course">Knowledge Protocol</option>
                        <option value="software">Software Node</option>
                        <option value="template">Structural Template</option>
                        <option value="ebook">Binary Ledger (Ebook)</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="category_id" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Registry Category</Label>
                      <select
                        id="category_id"
                        value={form.category_id}
                        onChange={(e) => handleChange("category_id", e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Indexing: Unclassified</option>
                        {categories.map((cat) => (
                          <option key={cat.id as string} value={cat.id as string}>
                            {cat.name as string}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="short_description" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Brief Abstract</Label>
                    <Textarea
                      id="short_description"
                      placeholder="High-level utility summary..."
                      value={form.short_description}
                      onChange={(e) => handleChange("short_description", e.target.value)}
                      rows={2}
                      className="rounded-2xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold placeholder:text-stone-300 transition-all text-sm px-6 py-4 resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Technical Specifications</Label>
                    <Textarea
                      id="description"
                      placeholder="Full technical documentation for the asset..."
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      rows={6}
                      className="rounded-3xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold placeholder:text-stone-300 transition-all text-sm px-7 py-6 resize-none shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)]"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="tags" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Discovery Tags <span className="text-[9px] lowercase font-semibold opacity-60">(comma separated)</span></Label>
                    <div className="relative group">
                       <Tag className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 pointer-events-none group-focus-within:text-orange-400 transition-colors" />
                       <Input
                        id="tags"
                        value={form.tags}
                        onChange={(e) => handleChange("tags", e.target.value)}
                        placeholder="e.g. electronics, smartphone, apple"
                        className={cn(inputClass, "pl-14")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                <div className="pb-4">
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100 flex items-center justify-center">
                       <DollarSign className="h-5 w-5" />
                    </div>
                    Asset Valuation
                  </h2>
                  <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Economic parameters and exchange protocol</p>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="price" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Unit Valuation *</Label>
                      <div className="relative group">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-900 font-black text-base z-10">{form.currency === 'RWF' ? 'FRW' : '$'}</div>
                         <Input
                          id="price"
                          type="number"
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                          value={form.price}
                          onChange={(e) => handleChange("price", e.target.value)}
                          className={cn(inputClass, "pl-16 text-xl font-black tracking-tight")}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="compare_at_price" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Comparative Market Value</Label>
                      <Input
                        id="compare_at_price"
                        type="number"
                        placeholder="Strike-through price"
                        min={0}
                        step="0.01"
                        value={form.compare_at_price}
                        onChange={(e) => handleChange("compare_at_price", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="currency" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Global Exchange Protocol</Label>
                    <select
                      id="currency"
                      value={form.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={selectClass}
                    >
                      <option value="USD">USD — Universal Stablecoin Strategy</option>
                      <option value="RWF">RWF — Rwandan Central Ledger</option>
                      <option value="EUR">EUR — European Reserve</option>
                      <option value="KES">KES — East African Corridor</option>
                      <option value="UGX">UGX — Nile Economic Protocol</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory — physical only */}
              {!form.is_digital && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                  <div className="pb-4">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-500 shadow-sm border border-amber-100 flex items-center justify-center">
                         <Layers className="h-5 w-5" />
                      </div>
                      Logistics Control
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Stock allocation and registry tracking</p>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label htmlFor="inventory_quantity" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Unit Allocation Count</Label>
                      <Input
                        id="inventory_quantity"
                        type="number"
                        placeholder="0"
                        min={0}
                        value={form.inventory_quantity}
                        onChange={(e) => handleChange("inventory_quantity", e.target.value)}
                        className={cn(inputClass, "text-lg font-black")}
                      />
                    </div>
                    <label className="flex items-center gap-5 cursor-pointer p-6 rounded-[28px] border-2 border-dashed border-stone-200 bg-white/40 hover:bg-white/80 hover:border-orange-200 transition-all group">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={form.track_inventory}
                          onChange={(e) => handleChange("track_inventory", e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-6 h-6 rounded-lg border-2 border-stone-300 bg-white peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center text-white">
                           <CheckCircle2 className="h-4 w-4 scale-0 peer-checked:scale-100 transition-transform" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-[13px] font-black text-stone-900 uppercase tracking-widest block">Active Inventory Surveillance</span>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 block opacity-60">System will trigger depletion alerts at threshold</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Digital file — digital only */}
              {form.is_digital && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                  <div className="pb-4">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm border border-indigo-100 flex items-center justify-center">
                         <Zap className="h-5 w-5" />
                      </div>
                      Digital Delivery Node
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Binary asset upload and secure distribution</p>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Encrypted Payload</Label>
                    <div className="p-1.5 rounded-[30px] border border-stone-200 bg-white/60 shadow-sm">
                      <CloudinaryUploadButton
                        folder="jimvio/digital-files"
                        resourceType="raw"
                        onUploadSuccess={(url) => handleChange("digital_file_url", url)}
                        buttonText="Deploy Binary Asset"
                      />
                    </div>
                    {form.digital_file_url && (
                       <GlassPill color="emerald" className="mt-2 w-fit flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Payload Integrated Successfully
                       </GlassPill>
                    )}
                  </div>
                </div>
              )}

              {/* Affiliate & Marketing */}
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-400">
                <div className="pb-4">
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-500 shadow-sm border border-rose-100 flex items-center justify-center">
                       <Rocket className="h-5 w-5" />
                    </div>
                    Propagation Protocol
                  </h2>
                  <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Incentive structures for influencer distribution</p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-6 p-7 rounded-[32px] border border-stone-200/50 bg-white/40 backdrop-blur-md group hover:bg-stone-900/[0.02] transition-colors">
                    <div className="flex items-start gap-5">
                       <div className="w-12 h-12 rounded-[18px] bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                          <Zap className="h-6 w-6 text-orange-500" />
                       </div>
                       <div>
                         <p className="text-[14px] font-black text-stone-900 uppercase tracking-widest">Affiliate Node Access</p>
                         <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest leading-relaxed">Let global affiliates distribute this asset for commission</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.affiliate_enabled}
                        onChange={(e) => handleChange("affiliate_enabled", e.target.checked)}
                      />
                      <div className="w-14 h-8 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" />
                    </label>
                  </div>
                  
                  {form.affiliate_enabled && (
                    <div className="space-y-3 px-1 animate-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="affiliate_commission_rate" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Distribution Bounty (%)</Label>
                      <div className="relative group max-w-[240px]">
                         <div className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-900 font-black text-base z-10">%</div>
                         <Input
                          id="affiliate_commission_rate"
                          type="number"
                          placeholder="10"
                          min={1}
                          max={90}
                          value={form.affiliate_commission_rate}
                          onChange={(e) => handleChange("affiliate_commission_rate", e.target.value)}
                          className={cn(inputClass, "pr-14 text-lg font-black")}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-6 p-7 rounded-[32px] border border-stone-200/50 bg-white/40 backdrop-blur-md group hover:bg-stone-900/[0.02] transition-colors">
                    <div className="flex items-start gap-5">
                       <div className="w-12 h-12 rounded-[18px] bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                          <Sparkles className="h-6 w-6 text-sky-500" />
                       </div>
                       <div>
                         <p className="text-[14px] font-black text-stone-900 uppercase tracking-widest">Influencer Network Pulse</p>
                         <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest leading-relaxed">Allow high-impact influencers to promotionally secure this asset</p>
                       </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.influencer_enabled}
                        onChange={(e) => handleChange("influencer_enabled", e.target.checked)}
                      />
                      <div className="w-14 h-8 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sky-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Publish status + actions */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 pt-12 border-t border-stone-200/50 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-4">
                  <Label htmlFor="status" className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Initial Visibility State</Label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={cn(selectClass, "md:w-64 bg-stone-900 text-white border-stone-900 shadow-stone-900/20")}
                  >
                    <option value="draft">Storage Protocol (Draft)</option>
                    <option value="active">Live Distribution (Active)</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-all border border-stone-100 hover:bg-white" asChild>
                    <Link href="/dashboard/products">Cancel Protocol</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-14 px-10 rounded-2xl bg-orange-500 text-white hover:bg-orange-600 font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/30 active:scale-95 transition-all"
                  >
                    {isPending ? (
                       <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin text-white" /> Initializing...
                       </div>
                    ) : (
                      <div className="flex items-center gap-2">
                         <Save className="h-4 w-4 mr-2" /> {form.status === "active" ? "Deploy Asset" : "Register Draft"}
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-[24px] border-2 border-rose-100 bg-rose-50 px-8 py-5 text-[13px] font-bold text-rose-500 animate-shake">
                  Protocol Error: {error}
                </div>
              )}
            </form>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
