"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  FileText,
  Tag,
  Sparkles,
  DollarSign,
  Layers,
  Rocket,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Zap,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlassCard, GlassPill } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);
  const [success, setSuccess]  = useState(false);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);

  const [form, setForm] = useState({
    name: "", slug: "", short_description: "", description: "",
    price: "", compare_at_price: "", category_id: "",
    inventory_quantity: "", affiliate_enabled: true,
    affiliate_commission_rate: "10", status: "draft",
    is_featured: false, tags: "", is_digital: false,
    images: [] as string[],
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [productRes, catsRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase.from("product_categories").select("id, name, slug").eq("is_active", true).order("sort_order"),
      ]);

      if (productRes.data) {
        const p = productRes.data;
        setForm({
          name:                    p.name ?? "",
          slug:                    p.slug ?? "",
          short_description:       p.short_description ?? "",
          description:             p.description ?? "",
          price:                   String(p.price ?? ""),
          compare_at_price:        String(p.compare_at_price ?? ""),
          category_id:             p.category_id ?? "",
          inventory_quantity:      String(p.inventory_quantity ?? 0),
          affiliate_enabled:       p.affiliate_enabled ?? true,
          affiliate_commission_rate: String(p.affiliate_commission_rate ?? 10),
          status:                  p.status ?? "draft",
          is_featured:             p.is_featured ?? false,
          tags:                    (p.tags as string[])?.join(", ") ?? "",
          is_digital:              p.is_digital ?? false,
          images:                  (p.images as string[]) || [],
        });
      }
      setCategories(catsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [productId, router]);

  function handleChange(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
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
    startTransition(async () => {
      const supabase = createClient();
      const { error: updateErr } = await supabase.from("products").update({
        name:                    form.name,
        short_description:       form.short_description || null,
        description:             form.description || null,
        price:                   parseFloat(form.price),
        compare_at_price:        form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category_id:             form.category_id || null,
        inventory_quantity:      parseInt(form.inventory_quantity ?? "0"),
        affiliate_enabled:       form.affiliate_enabled,
        affiliate_commission_rate: parseFloat(form.affiliate_commission_rate ?? "10"),
        status:                  form.status,
        is_featured:             form.is_featured,
        tags:                    form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
        images:                  form.images,
      }).eq("id", productId);

      if (updateErr) { setError(updateErr.message); return; }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/products"), 1000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-[24px] bg-white backdrop-blur-md border border-white/80 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin m-2" />
            <Package className="h-8 w-8 text-stone-900" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[12px] font-black text-stone-900 uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Retrieving Asset</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Accessing Secure Inventory Node</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700" style={{ background: "#f0ede8" }}>
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-[24px] bg-white backdrop-blur-md border border-white shadow-2xl flex items-center justify-center overflow-hidden">
             <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-in zoom-in duration-500" />
          </div>
        </div>
        <div className="text-center">
           <h2 className="text-[12px] font-black text-stone-900 uppercase tracking-[0.4em] mb-2 pl-[0.4em]">Asset Refined</h2>
           <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-[0.1em]">Registry update confirmed</p>
        </div>
      </div>
    );
  }

  const inputClass = "h-14 rounded-2xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold placeholder:text-stone-300 transition-all text-base px-6";
  const selectClass = "h-14 w-full px-6 rounded-2xl border border-stone-200 bg-white/60 text-stone-900 font-bold text-base focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all shadow-sm";

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
                 <span className="text-[10px] font-bold uppercase tracking-widest pl-1">Back to Assets</span>
              </div>
           </Link>
           
           <div className="w-20 h-20 rounded-[28px] bg-white border border-white shadow-2xl flex items-center justify-center mb-6 relative group overflow-hidden">
              <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Package className="h-10 w-10 text-stone-900 group-hover:scale-110 transition-transform duration-500" />
           </div>
           
           <h1 className="text-4xl font-black text-stone-900 tracking-tighter mb-4">Refine Asset</h1>
           <p className="text-stone-600 font-semibold max-w-sm leading-relaxed uppercase tracking-wider text-[11px]">
              Modifying registry parameters for <span className="text-stone-900">{form.name}</span>
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          <GlassCard className="p-0 overflow-hidden relative shadow-2xl border-white/80">
             <div className="absolute top-0 left-0 w-full h-1 bg-white/20 z-20" />
             <div className="p-8 sm:p-12 space-y-12">
                {/* Visual Documentation */}
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="pb-4">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-orange-50 text-orange-500 shadow-sm border border-orange-100 flex items-center justify-center">
                         <ImageIcon className="h-5 w-5" />
                      </div>
                      Visual documentation
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Update high-fidelity asset previews</p>
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

                  <CloudinaryDropzone 
                    folder="jimvio/products"
                    onUploadSuccess={handleImageUpload}
                    label="Update Asset Images"
                    sublabel="JPG/PNG/WEBP • Max 10MB"
                  />
                </div>

                {/* Basic Info */}
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                  <div className="pb-4 border-t border-stone-100 pt-8">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-500 shadow-sm border border-sky-100 flex items-center justify-center">
                         <FileText className="h-5 w-5" />
                      </div>
                      Asset metadata
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Core classification update</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Primary Asset Label *</Label>
                      <Input value={form.name} onChange={e => handleChange("name", e.target.value)} className={inputClass} required />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Registry Category</Label>
                        <select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)} className={selectClass}>
                          <option value="">Indexing: Unclassified</option>
                          {categories.map(c => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">State Protocol</Label>
                        <select value={form.status} onChange={e => handleChange("status", e.target.value)} className={selectClass}>
                          <option value="draft">Storage Protocol (Draft)</option>
                          <option value="active">Live Distribution (Active)</option>
                          <option value="paused">Hibernation Mode (Paused)</option>
                          <option value="archived">Decommissioned (Archived)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Brief Abstract</Label>
                      <Textarea value={form.short_description} onChange={e => handleChange("short_description", e.target.value)} className="rounded-2xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold text-sm px-6 py-4 resize-none min-h-[80px]" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Technical Specifications</Label>
                      <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} className="rounded-3xl bg-white/60 border-stone-200 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-stone-900 font-bold text-sm px-7 py-6 resize-none min-h-[160px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.03)]" />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Discovery Tags</Label>
                      <Input value={form.tags} onChange={e => handleChange("tags", e.target.value)} placeholder="tag1, tag2, tag3" className={inputClass} />
                    </div>

                    <label className="flex items-center gap-4 cursor-pointer p-6 rounded-[28px] border-2 border-dashed border-stone-200 bg-white/40 hover:bg-white/80 transition-all group w-fit">
                      <div className="relative flex items-center">
                        <input type="checkbox" checked={form.is_featured} onChange={e => handleChange("is_featured", e.target.checked)} className="peer sr-only" />
                        <div className="w-6 h-6 rounded-lg border-2 border-stone-300 bg-white peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center text-white">
                           <CheckCircle2 className="h-4 w-4 scale-0 peer-checked:scale-100 transition-transform" />
                        </div>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-stone-900">Mark as Featured Asset</span>
                    </label>
                  </div>
                </div>

                {/* Valuation & Inventory */}
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                  <div className="pb-4 border-t border-stone-100 pt-8">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100 flex items-center justify-center">
                         <DollarSign className="h-5 w-5" />
                      </div>
                      Valuation & Inventory
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Economic parameters and stock control</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Unit valuation *</Label>
                        <Input type="number" min="0" step="0.01" value={form.price} onChange={e => handleChange("price", e.target.value)} className={cn(inputClass, "text-xl font-black")} required />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Strike-through Price</Label>
                        <Input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={e => handleChange("compare_at_price", e.target.value)} className={inputClass} />
                      </div>
                    </div>
                    
                    {!form.is_digital && (
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Registry Stock Allocation</Label>
                        <Input type="number" min="0" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} className={cn(inputClass, "max-w-[240px] text-lg font-black")} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Affiliate Node */}
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
                  <div className="pb-4 border-t border-stone-100 pt-8">
                    <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-500 shadow-sm border border-rose-100 flex items-center justify-center">
                         <Rocket className="h-5 w-5" />
                      </div>
                      Propagation incentive
                    </h2>
                    <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mt-2 pl-[60px]">Commission structural parameters</p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-6 p-7 rounded-[32px] border border-stone-200/50 bg-white/40 backdrop-blur-md group hover:bg-stone-900/[0.02] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                           <Zap className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-stone-900 uppercase tracking-widest">Affiliate Node Access</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest leading-relaxed">Let global affiliates earn commissions on this asset</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.affiliate_enabled} onChange={e => handleChange("affiliate_enabled", e.target.checked)} />
                        <div className="w-14 h-8 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" />
                      </label>
                    </div>

                    {form.affiliate_enabled && (
                      <div className="space-y-3 px-1 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-stone-500 pl-1">Distribution Bounty (%)</Label>
                        <Input type="number" min="1" max="90" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} className={cn(inputClass, "max-w-[200px] text-lg font-black")} />
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="rounded-[24px] border-2 border-rose-100 bg-rose-50 px-8 py-5 text-[13px] font-bold text-rose-500">
                    Registry Conflict: {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-stone-100">
                  <Button type="submit" disabled={isPending} className="h-14 px-10 rounded-2xl bg-stone-900 text-white hover:bg-black font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-stone-900/20 active:scale-95 transition-all w-full sm:w-auto">
                    {isPending ? (
                      <div className="flex items-center gap-3">
                         <Loader2 className="h-4 w-4 animate-spin" /> Synchronizing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                         <Save className="h-4 w-4 mr-2" /> Commit Refinements
                      </div>
                    )}
                  </Button>
                  <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-all border border-stone-100 hover:bg-white w-full sm:w-auto" asChild>
                    <Link href="/dashboard/products">Cancel Protocol</Link>
                  </Button>
                </div>
             </div>
          </GlassCard>
        </form>
      </div>
    </div>
  );
}
