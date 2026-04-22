"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  DollarSign,
  Loader2,
  CheckCircle2,
  Trash2,
  Layers,
  ShoppingBag,
  Globe,
  ChevronRight,
  Upload,
  Tag,
  FileText,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

const PRODUCT_TYPES = [
  { id: "physical", label: "Physical", icon: ShoppingBag, description: "Tangible goods shipped to customers" },
  { id: "digital",  label: "Digital",  icon: Globe,       description: "Downloads, templates, software & more" },
];

const BILLING_PERIODS = ["weekly", "monthly", "quarterly", "yearly"];

const BUTTON_TEXTS = ["Join", "Get access", "Order now", "Purchase", "Sign up", "Download", "Subscribe"];

const inputBase = "h-10 w-full rounded-none border border-border bg-white dark:bg-zinc-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus-visible:ring-1 focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all text-sm px-3.5";
const selectBase = "h-10 w-full px-3.5 rounded-none border border-border bg-white dark:bg-zinc-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all appearance-none cursor-pointer";
const labelBase = "text-[11px] font-bold uppercase tracking-tight text-stone-500 mb-1.5 block";
const cardBase = "bg-white dark:bg-zinc-900 border border-border rounded-none p-6 shadow-sm";

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[15px] font-bold text-stone-900 dark:text-white tracking-tight">{title}</h2>
      {subtitle && <p className="text-[12px] text-stone-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-none transition-colors focus:outline-none",
        checked ? "bg-blue-600" : "bg-[#2A2A2A]"
      )}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-none bg-white transition-transform shadow-none", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1A1A1A] last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 rotate-90 pointer-events-none" />
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    product_type: "physical" as "physical" | "digital",
    price: "0",           // "0" = Free, anything else = Paid
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
      setSelectedVendorId(vends[0].id);
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
        // Reset pricing_type for physical (always one_time)
        if (!isDigital) updated.pricing_type = "one_time";
        // Reset category if it doesn't match new type
        const currentCat = categories.find(c => c.id === updated.category_id);
        if (currentCat) {
          const catType = currentCat.category_type;
          if (isDigital && catType === "physical") updated.category_id = "";
          if (!isDigital && catType === "digital") updated.category_id = "";
        }
      }

      // Auto-set button_text & pricing when a digital category is picked
      if (field === "category_id" && updated.is_digital) {
        const cat = categories.find(c => c.id === value);
        const slug = cat?.slug?.toLowerCase() || "";
        if (slug.includes("course") || slug.includes("ebook") || slug.includes("training")) {
          updated.pricing_type = "recurring";
          updated.button_text = updated.button_text || "Join";
        } else if (slug.includes("software") || slug.includes("saas")) {
          updated.pricing_type = "one_time";
          updated.button_text = updated.button_text || "Get access";
        } else if (slug.includes("template") || slug.includes("graphics") || slug.includes("photo")) {
          updated.pricing_type = "one_time";
          updated.button_text = updated.button_text || "Download";
        }
      }

      return updated;
    });
  }

  const isFree = form.price === "0";
  const isPaid = !isFree;

  function handleImageUpload(url: string) {
    setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
  }
  function removeImage(index: number) {
    setForm((prev) => {
      const next = [...prev.images];
      next.splice(index, 1);
      return { ...prev, images: next };
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    if (!vendor || !form.name) { setError("Product name is required."); return; }
    if (isPaid && (!form.price || parseFloat(form.price) <= 0)) { setError("Please enter a valid price."); return; }

    startTransition(async () => {
      const supabase = createClient();
      let slug = form.slug || slugify(form.name);
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
      if (existing) slug = `${slug}-${Date.now()}`;

      const price = isFree ? 0 : parseFloat(form.price);

      const payload = {
        vendor_id: selectedVendorId,
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

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#060606]">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-none bg-[#111] border border-[#222] shadow-none flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-orange-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">Product Successfully Created!</p>
          <p className="text-sm text-zinc-500 mt-1">Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredCategories = categories.filter(c => {
    const catType = c.category_type;
    if (form.product_type === "digital") return catType === "digital";
    return catType === "physical" || catType === "both" || !catType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#222]">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="w-10 h-10 flex items-center justify-center rounded-none border border-[#222] bg-[#111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Product</h1>
            <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest font-semibold font-mono">Environment: PRODUCTION</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/products")}
            className="text-zinc-400 hover:text-white h-10 px-6 rounded-none underline-offset-4 hover:underline"
          >
            Discard
          </Button>
          <Button
            onClick={() => handleSubmit()}
            disabled={isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white px-8 h-10 rounded-none font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.2)] transition-all active:scale-95"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Publish to Store
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border-l-2 border-red-500 text-red-500 text-xs font-mono">
          <span className="font-bold mr-2">[ERROR_EXECUTION_FAILURE]:</span> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* General Details */}
          <div className={cardBase}>
            <SectionHeader title="01. General Details" subtitle="Fundamental identification for your product asset." />
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label className={labelBase}>Product Name</Label>
                <Input
                  placeholder="e.g. Premium Digital Template v1.0"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={inputBase}
                />
              </div>

              <div className="grid gap-2">
                <Label className={labelBase}>Slug / Endpoint</Label>
                <div className="relative flex">
                  <div className="h-10 bg-[#0A0A0A] border border-[#222] border-r-0 px-4 flex items-center text-[11px] font-mono text-zinc-600 select-none">
                    jimvio.com/p/
                  </div>
                  <Input
                    value={form.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    className={cn(inputBase, "font-mono text-zinc-400")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className={labelBase}>Tagline</Label>
                <Input
                  placeholder="The primary hook for your customers"
                  value={form.short_description}
                  onChange={(e) => handleChange("short_description", e.target.value)}
                  className={inputBase}
                />
              </div>

              <div className="grid gap-2">
                <Label className={labelBase}>Detailed Documentation / Description</Label>
                <Textarea
                  placeholder="Full Markdown support enabled. Describe your assets, technical specs, or physical dimensions..."
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className={cn(inputBase, "min-h-[200px] py-4 leading-relaxed resize-none")}
                />
              </div>
            </div>
          </div>

          {/* Media Assets */}
          <div className={cardBase}>
            <SectionHeader title="02. Media Gallery" subtitle="Visual representation of the product payload." />
            <div className="bg-[#0A0A0A] border-2 border-dashed border-[#222] hover:border-orange-500/50 hover:bg-[#111] transition-all p-8 text-center group cursor-pointer">
              <CloudinaryDropzone 
                folder="jimvio/products" 
                onUploadSuccess={handleImageUpload} 
                label={
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-orange-500 transition-colors" />
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">Select Visual Assets</p>
                    <p className="text-[10px] text-zinc-600 mt-1 font-mono">Supports: JPG, PNG, WEBP (MAX 10MB)</p>
                  </div>
                }
              />
            </div>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                {form.images.map((url, i) => (
                  <div key={url} className="relative aspect-square border border-[#222] bg-[#0A0A0A] group overflow-hidden">
                    <CloudinaryImage
                      src={url}
                      alt={`Asset ${i}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 scale-90 group-hover:scale-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Classification & Pricing */}
          <div className={cardBase}>
            <SectionHeader title="03. Configuration & Pricing" subtitle="Logic injection and monetization model." />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className={labelBase}>Product Architecture</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCT_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = form.product_type === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleChange("product_type", type.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 border transition-all text-left group",
                            isSelected 
                              ? "border-orange-500 bg-orange-500/[0.03]" 
                              : "border-[#222] bg-[#0A0A0A] hover:border-[#333]"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-none transition-colors",
                            isSelected ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={cn("text-[11px] font-bold uppercase tracking-wider", isSelected ? "text-white" : "text-zinc-400")}>{type.label}</p>
                            <p className="text-[9px] text-zinc-600 leading-tight">NODE_TYPE: {type.id.toUpperCase()}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className={labelBase}>Category Index</Label>
                  <SelectWrapper>
                    <select
                      value={form.category_id}
                      onChange={(e) => handleChange("category_id", e.target.value)}
                      className={selectBase}
                    >
                      <option value="">UNCATEGORIZED_ASSET</option>
                      {filteredCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                  {filteredCategories.length === 0 && (
                     <p className="text-[10px] text-orange-400/80 font-mono mt-1">WARN: CATEGORY_LOOKUP_EMPTY. Run migration 057.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6 border-l border-[#222] pl-8">
                <div className="grid gap-4">
                  <Label className={labelBase}>Payment Protocol</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange("price", "0")}
                      className={cn(
                        "flex-1 h-10 border text-[10px] font-bold uppercase tracking-widest transition-all",
                        isFree ? "border-orange-500 bg-orange-600 text-white" : "border-[#222] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Gratis
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("price", "29.99")}
                      className={cn(
                        "flex-1 h-10 border text-[10px] font-bold uppercase tracking-widest transition-all",
                        isPaid ? "border-orange-500 bg-orange-600 text-white" : "border-[#222] bg-[#0A0A0A] text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Premium
                    </button>
                  </div>
                </div>

                {isPaid && (
                  <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className={labelBase}>Currency</Label>
                        <SelectWrapper>
                          <select
                            value={form.currency}
                            onChange={(e) => handleChange("currency", e.target.value)}
                            className={selectBase}
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </SelectWrapper>
                      </div>
                      <div className="grid gap-2">
                        <Label className={labelBase}>Unit Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
                          <Input
                            type="number"
                            value={form.price}
                            onChange={(e) => handleChange("price", e.target.value)}
                            className={cn(inputBase, "pl-9 font-mono font-bold text-base")}
                          />
                        </div>
                      </div>
                    </div>

                    {form.product_type === "digital" && (
                      <div className="grid gap-4">
                        <div>
                          <Label className={labelBase}>Billing System</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleChange("pricing_type", "one_time")}
                              className={cn(
                                "flex-1 px-4 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all",
                                form.pricing_type === "one_time" ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-[#222] text-zinc-600"
                              )}
                            >
                              Once
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChange("pricing_type", "recurring")}
                              className={cn(
                                "flex-1 px-4 py-2 border text-[9px] font-bold uppercase tracking-widest transition-all",
                                form.pricing_type === "recurring" ? "border-orange-500 text-orange-500 bg-orange-500/5" : "border-[#222] text-zinc-600"
                              )}
                            >
                              Subs
                            </button>
                          </div>
                        </div>
                        {form.pricing_type === "recurring" && (
                          <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label className={labelBase}>Cycle Period</Label>
                            <div className="flex flex-wrap gap-2">
                              {BILLING_PERIODS.map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => handleChange("billing_period", p)}
                                  className={cn(
                                    "px-3 py-1.5 border text-[9px] font-bold uppercase transition-all",
                                    form.billing_period === p ? "border-orange-500 text-white bg-orange-600" : "border-[#222] text-zinc-500"
                                  )}
                                >
                                  {p}
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
          </div>

          {/* Fulfillment details */}
          <div className={cardBase}>
            <SectionHeader title="04. Fulfillment Strategy" subtitle="Delivery and stock management parameters." />
            
            {form.product_type === "digital" ? (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label className={labelBase}>Payload Access URL</Label>
                  <div className="bg-[#0A0A0A] border border-[#222] p-6 text-center space-y-4">
                     <Upload className="w-6 h-6 text-zinc-700 mx-auto" />
                     <p className="text-[10px] text-zinc-500 font-mono">Upload the direct delivery asset</p>
                     <CloudinaryUploadButton
                      folder="jimvio/digital-files"
                      resourceType="raw"
                      onUploadSuccess={url => handleChange("digital_file_url", url)}
                      className="px-6 h-9 rounded-none bg-orange-500 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition-colors"
                    />
                  </div>
                  {form.digital_file_url && (
                    <p className="text-[10px] font-mono text-orange-500 break-all">{form.digital_file_url}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1">Manual delivery URL option:</p>
                  <Input
                    placeholder="https://..."
                    value={form.digital_file_url}
                    onChange={(e) => handleChange("digital_file_url", e.target.value)}
                    className={cn(inputBase, "font-mono")}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-8">
                <div className="p-4 bg-orange-500/[0.02] border border-orange-500/10">
                  <ToggleRow
                    title="Real-time Inventory Tracking"
                    description="Automated depletion of stock units upon successful checkout."
                    checked={form.track_inventory}
                    onChange={(v) => handleChange("track_inventory", v)}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="grid gap-2">
                    <Label className={labelBase}>Unit Count</Label>
                    <Input
                      type="number"
                      value={form.inventory_quantity}
                      onChange={(e) => handleChange("inventory_quantity", e.target.value)}
                      className={inputBase}
                      disabled={!form.track_inventory}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelBase}>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelBase}>Dimensions</Label>
                    <Input
                      placeholder="e.g. 10x10x10 cm"
                      value={form.dimensions}
                      onChange={(e) => handleChange("dimensions", e.target.value)}
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar Actions & Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-6">
            {/* Status Panel */}
            <div className={cn(cardBase, "border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)]")}>
              <SectionHeader title="Status & Visibility" subtitle="Deployment state of this product." />
              <div className="space-y-4">
                <div className="flex gap-2">
                  {["draft", "published", "archived"].map((stat) => (
                    <button
                      key={stat}
                      onClick={() => handleChange("status", stat)}
                      className={cn(
                        "flex-1 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all",
                        form.status === stat 
                          ? "border-orange-500 bg-orange-600 text-white" 
                          : "border-[#222] bg-[#0A0A0A] text-zinc-600 hover:text-zinc-400"
                      )}
                    >
                      {stat}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#222]">
                  <ToggleRow
                    title="Featured Status"
                    description="Pin to store showcase."
                    checked={form.is_featured}
                    onChange={(v) => handleChange("is_featured", v)}
                  />
                </div>
              </div>
            </div>

            {/* Presentation Panel */}
            <div className={cardBase}>
              <SectionHeader title="Presentation" subtitle="How buyers interact with the listing." />
              <div className="space-y-6">
                <div className="grid gap-2">
                  <Label className={labelBase}>Interface Button (CTA)</Label>
                  <Input
                    placeholder="Enter Custom Text..."
                    value={form.button_text}
                    onChange={(e) => handleChange("button_text", e.target.value)}
                    className={inputBase}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BUTTON_TEXTS.map(txt => (
                      <button
                        key={txt}
                        type="button"
                        onClick={() => handleChange("button_text", txt)}
                        className={cn(
                          "px-2 py-1 text-[9px] font-bold uppercase border transition-all",
                          form.button_text === txt ? "border-orange-500 text-orange-500 bg-orange-500/10" : "border-[#222] text-zinc-600 hover:border-[#333]"
                        )}
                      >
                        {txt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2">
                   <Label className={labelBase}>Metadata Tags</Label>
                   <Input
                    placeholder="tech, music, art (Comma separated)"
                    value={form.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Affiliate Matrix */}
            <div className={cardBase}>
              <SectionHeader title="Affiliate Matrix" subtitle="Commission-base growth logic." />
              <div className="space-y-4">
                <ToggleRow
                  title="Enabled"
                  checked={form.affiliate_enabled}
                  onChange={(v) => handleChange("affiliate_enabled", v)}
                />
                
                {form.affiliate_enabled && (
                  <div className="grid gap-2 animate-in slide-in-from-right-2 duration-300">
                    <Label className={labelBase}>Commission Rate (%)</Label>
                    <div className="relative">
                       <Input
                        type="number"
                        value={form.affiliate_commission_rate}
                        onChange={(e) => handleChange("affiliate_commission_rate", e.target.value)}
                        className={cn(inputBase, "pr-10 font-mono")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-1 bg-orange-600">
               <Button
                onClick={() => handleSubmit()}
                disabled={isPending}
                className="w-full bg-black hover:bg-zinc-900 border-0 text-white rounded-none h-14 font-bold text-xs uppercase tracking-[0.2em] shadow-xl group"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3 text-orange-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-3 text-orange-500 group-hover:scale-110 transition-transform" />
                )}
                Finalize Product
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
