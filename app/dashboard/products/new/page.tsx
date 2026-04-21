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

const inputBase = "h-11 w-full rounded-none border bg-[#0D0D0D] border-[#2A2A2A] text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all text-sm px-4";
const selectBase = "h-11 w-full px-4 rounded-none border border-[#2A2A2A] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer";
const labelBase = "text-[12px] font-semibold uppercase tracking-widest text-zinc-500 mb-2 block";
const cardBase = "bg-[#111111] border border-[#222222] rounded-none p-6";

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
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
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-none scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-none bg-[#111] border border-[#222] shadow-none flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-blue-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">Product Published!</p>
          <p className="text-sm text-zinc-500 mt-1">Redirecting to your productsâ€¦</p>
        </div>
      </div>
    );
  }

  // Filtered categories based on product type
  const filteredCategories = categories.filter(c => {
    const catType = c.category_type;
    if (form.product_type === "digital") return catType === "digital";
    // For physical: show physical and 'both', also show uncategorized (no category_type)
    return catType === "physical" || catType === "both" || !catType;
  });

  const steps = ["Type & Info", "Gallery & Pricing", "Delivery & Publish"];

  return (
    <div className="min-h-screen bg-[#060606] text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-6">

        {/* â”€â”€ Header â”€â”€ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/products">
              <div className="p-2 rounded-none bg-[#111] border border-[#222] hover:bg-[#1A1A1A] transition-all">
                <ArrowLeft className="h-4 w-4 text-zinc-400" />
              </div>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">New Product</h1>
              <div className="flex items-center gap-1.5 mt-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn("h-1 rounded-none transition-all duration-300",
                      i + 1 === currentStep ? "w-8 bg-blue-500" :
                      i + 1 < currentStep  ? "w-4 bg-blue-500/40" :
                                             "w-4 bg-[#222]"
                    )}
                  />
                ))}
                <span className="text-[10px] text-zinc-600 ml-1 font-medium">
                  {steps[currentStep - 1]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-sm text-zinc-500 hover:text-white h-9" onClick={() => router.push("/dashboard/products")}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-none px-5 h-9 text-sm font-medium"
                onClick={() => setCurrentStep(s => s + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-none px-5 h-9 text-sm font-medium disabled:opacity-50"
                onClick={() => handleSubmit()}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
              </Button>
            )}
          </div>
        </div>

        {/* â”€â”€ STEP 1: Type & Basic Info â”€â”€ */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Product Type */}
            <div className={cardBase}>
              <SectionHeader title="Product Type" subtitle="What kind of product are you creating?" />
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleChange("product_type", type.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-none border-2 text-left transition-all",
                      form.product_type === type.id
                        ? "border-blue-600 bg-blue-600/5"
                        : "border-[#222] hover:border-[#333]"
                    )}
                  >
                    <div className={cn("p-2 rounded-none shrink-0", form.product_type === type.id ? "bg-blue-600 text-white" : "bg-[#1A1A1A] text-zinc-500")}>
                      <type.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{type.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className={cardBase}>
              <SectionHeader title="Basic Information" subtitle="Name, category, and URL slug." />
              <div className="space-y-5">
                <div>
                  <Label className={labelBase}>Product Name *</Label>
                  <Input
                    value={form.name}
                    onChange={e => handleChange("name", e.target.value)}
                    placeholder={form.product_type === "digital" ? "e.g. Social Media Templates Pack" : "e.g. Wireless Earbuds Pro"}
                    className={inputBase}
                  />
                </div>

                <div>
                  <Label className={labelBase}>Short Description</Label>
                  <Input
                    value={form.short_description}
                    onChange={e => handleChange("short_description", e.target.value)}
                    placeholder="One-line summary shown in search results"
                    className={inputBase}
                  />
                </div>

                <div>
                  <Label className={labelBase}>
                    Category
                    {filteredCategories.length === 0 && (
                      <span className="ml-2 text-amber-500 normal-case font-normal">(Run migration 057 in Supabase to load categories)</span>
                    )}
                  </Label>
                  <SelectWrapper>
                    <select
                      value={form.category_id}
                      onChange={e => handleChange("category_id", e.target.value)}
                      className={selectBase}
                    >
                      <option value="">Select a category</option>
                      {filteredCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <Label className={labelBase}>Product URL</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm select-none">jimvio.com/p/</span>
                    <Input value={form.slug} readOnly className={cn(inputBase, "pl-[115px] opacity-50 cursor-default")} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ STEP 2: Gallery & Pricing â”€â”€ */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Gallery */}
            <div className={cardBase}>
              <SectionHeader title="Gallery" subtitle="Upload product images." />
              <div className="bg-[#0A0A0A] rounded-none border-2 border-dashed border-[#222] hover:border-[#333] transition-colors">
                <CloudinaryDropzone folder="jimvio/products" onUploadSuccess={handleImageUpload} label="Drop images here or click to upload" />
              </div>
              {form.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-none overflow-hidden border border-[#222]">
                      <CloudinaryImage src={img} alt="Preview" fill className="object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-none hover:bg-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className={cardBase}>
              <SectionHeader title="Description" subtitle="Help buyers understand your product." />
              <div className="space-y-4">
                <Textarea
                  value={form.description}
                  onChange={e => handleChange("description", e.target.value)}
                  placeholder="Describe what's included, what problems it solves, and who it's for..."
                  className="min-h-[130px] rounded-none bg-[#0D0D0D] border border-[#2A2A2A] text-white placeholder:text-zinc-600 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none p-4"
                />
                <div>
                  <Label className={labelBase}>Tags</Label>
                  <Input
                    value={form.tags}
                    onChange={e => handleChange("tags", e.target.value)}
                    placeholder="design, template, canva (comma separated)"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className={cardBase}>
              <SectionHeader title="Pricing" subtitle="Choose how people access this product." />

              {/* Free / Paid toggle */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: "Free", value: "0", icon: Globe },
                  { label: "Paid", value: "paid", icon: DollarSign },
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleChange("price", opt.value === "0" ? "0" : (isFree ? "29.99" : form.price))}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-none border-2 transition-all",
                      (opt.value === "0" ? isFree : isPaid)
                        ? "border-blue-600 bg-blue-600/5"
                        : "border-[#222] hover:border-[#333]"
                    )}
                  >
                    <div className="flex items-center gap-3 text-white">
                      <opt.icon className="h-4 w-4 text-zinc-400" />
                      <span className="font-bold text-sm">{opt.label}</span>
                    </div>
                    <div className={cn("w-4 h-4 rounded-none border-2 flex items-center justify-center",
                      (opt.value === "0" ? isFree : isPaid) ? "border-blue-600" : "border-[#333]"
                    )}>
                      {(opt.value === "0" ? isFree : isPaid) && <div className="w-2 h-2 rounded-none bg-blue-600" />}
                    </div>
                  </button>
                ))}
              </div>

              {isPaid && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Price input */}
                  <div>
                    <Label className={labelBase}>Price</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={e => handleChange("price", e.target.value)}
                          className={cn(inputBase, "pl-8 text-lg font-bold")}
                        />
                      </div>
                      <SelectWrapper>
                        <select
                          value={form.currency}
                          onChange={e => handleChange("currency", e.target.value)}
                          className={cn(selectBase, "w-24")}
                        >
                          {["USD", "EUR", "GBP", "RWF"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </SelectWrapper>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {["9.99", "29.99", "49.99", "99.99"].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleChange("price", val)}
                          className="px-3 py-1 rounded-none bg-[#1A1A1A] border border-[#2A2A2A] text-xs font-bold text-zinc-400 hover:border-blue-600 hover:text-blue-400 transition-all"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Digital: show pricing model */}
                  {form.product_type === "digital" && (
                    <div>
                      <Label className={labelBase}>Billing Model</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "one_time", label: "One-time", desc: "Customer pays once" },
                          { value: "recurring", label: "Recurring", desc: "Regular subscription" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleChange("pricing_type", opt.value)}
                            className={cn(
                              "p-3 rounded-none border-2 text-left transition-all",
                              form.pricing_type === opt.value
                                ? "border-blue-600 bg-blue-600/5"
                                : "border-[#222] hover:border-[#333]"
                            )}
                          >
                            <p className="text-sm font-bold text-white">{opt.label}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>

                      {form.pricing_type === "recurring" && (
                        <div className="mt-3">
                          <Label className={labelBase}>Billing Period</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {BILLING_PERIODS.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleChange("billing_period", p)}
                                className={cn(
                                  "py-2 rounded-none text-[11px] font-bold uppercase tracking-wider border transition-all",
                                  form.billing_period === p
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "border-[#222] text-zinc-500 hover:border-[#333]"
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

            {/* Product Settings */}
            <div className={cardBase}>
              <SectionHeader title="Product Settings" subtitle="Button text, affiliates, and visibility." />
              <div className="space-y-4">
                <div>
                  <Label className={labelBase}>Purchase Button Text</Label>
                  <SelectWrapper>
                    <select value={form.button_text} onChange={e => handleChange("button_text", e.target.value)} className={selectBase}>
                      <option value="">-- Select --</option>
                      {BUTTON_TEXTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div className="pt-2 border-t border-[#1A1A1A]">
                  <ToggleRow
                    title="Affiliate Program"
                    description="Let affiliates earn a commission on sales"
                    checked={form.affiliate_enabled}
                    onChange={v => handleChange("affiliate_enabled", v)}
                  />
                  {form.affiliate_enabled && (
                    <div className="mt-3 ml-1">
                      <Label className={labelBase}>Commission Rate</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="1"
                          max="80"
                          value={form.affiliate_commission_rate}
                          onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
                          className={cn(inputBase, "pr-10")}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">%</span>
                      </div>
                    </div>
                  )}
                  <ToggleRow
                    title="Show on Store Page"
                    description="Feature this product publicly"
                    checked={form.is_featured}
                    onChange={v => handleChange("is_featured", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ STEP 3: Delivery & Publish â”€â”€ */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {form.product_type === "digital" ? (
              <div className={cardBase}>
                <SectionHeader title="Digital Delivery" subtitle="Upload the file your customers will receive after purchase." />
                <div className="bg-[#0A0A0A] rounded-none border-2 border-dashed border-[#222] hover:border-[#333] transition-colors p-10 text-center">
                  <Upload className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 mb-4">PDF, ZIP, MP4, or any file type</p>
                  <CloudinaryUploadButton
                    folder="jimvio/digital-files"
                    resourceType="raw"
                    onUploadSuccess={url => handleChange("digital_file_url", url)}
                    buttonText="Choose File to Upload"
                  />
                </div>
                {form.digital_file_url && (
                  <div className="mt-4 p-4 bg-blue-600/10 border border-blue-600/20 rounded-none flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">File uploaded successfully</p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">{form.digital_file_url.split("/").pop()}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={cardBase}>
                <SectionHeader title="Inventory & Shipping" subtitle="Set stock levels and shipping weight." />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className={labelBase}>Stock Quantity</Label>
                    <Input type="number" min="0" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} className={inputBase} />
                  </div>
                  <div>
                    <Label className={labelBase}>Weight (kg)</Label>
                    <Input type="number" min="0" step="0.01" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="0.5" className={inputBase} />
                  </div>
                  <div>
                    <Label className={labelBase}>Dimensions</Label>
                    <Input value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)} placeholder="L Ã— W Ã— H cm" className={inputBase} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
                  <ToggleRow
                    title="Track Inventory"
                    description="Show low stock warnings and prevent overselling"
                    checked={form.track_inventory}
                    onChange={v => handleChange("track_inventory", v)}
                  />
                </div>
              </div>
            )}

            {/* Publish Settings */}
            <div className={cardBase}>
              <SectionHeader title="Publish" subtitle="Set the visibility of this product." />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "draft",  label: "Draft",  desc: "Only visible to you" },
                  { value: "active", label: "Active", desc: "Live on your store" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange("status", opt.value)}
                    className={cn(
                      "p-4 rounded-none border-2 text-left transition-all",
                      form.status === opt.value
                        ? "border-blue-600 bg-blue-600/5"
                        : "border-[#222] hover:border-[#333]"
                    )}
                  >
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className={cn(cardBase, "bg-[#0D0D0D]")}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">Review Summary</p>
              <div className="space-y-2 text-sm">
                {[
                  ["Name", form.name || "â€”"],
                  ["Type", form.product_type],
                  ["Price", isFree ? "Free" : `$${form.price} ${form.currency}`],
                  ["Billing", isPaid && form.product_type === "digital" ? (form.pricing_type === "recurring" ? `Recurring Â· ${form.billing_period}` : "One-time") : "â€”"],
                  ["Status", form.status],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-white font-medium capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={() => setCurrentStep(2)} variant="ghost" className="h-10 px-5 rounded-none font-medium text-zinc-500 hover:text-white">
                â† Back
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

      </div>
    </div>
  );
}
