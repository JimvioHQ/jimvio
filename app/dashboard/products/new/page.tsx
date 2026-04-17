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
  Box,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  Layers,
  FileText,
  Tag,
  Rocket,
  ShoppingBag,
  Globe,
  ToggleLeft,
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
  {
    id: "physical",
    label: "Physical",
    icon: ShoppingBag,
    description: "Tangible goods shipped to customers",
    color: "orange",
  },
  {
    id: "digital",
    label: "Digital",
    icon: Globe,
    description: "Downloads, templates, software & more",
    color: "sky",
  },
];

const inputBase =
  "h-11 rounded-xl border bg-white dark:bg-surface border-zinc-200 dark:border-border text-zinc-900 dark:text-text-primary placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400 transition-all text-sm px-4 shadow-sm";

const selectBase =
  "h-11 w-full px-4 rounded-xl border border-zinc-200 dark:border-border bg-white dark:bg-surface text-zinc-900 dark:text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 transition-all shadow-sm";

const labelBase = "text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-text-muted";

const sectionTitle = "text-base font-bold text-zinc-800 dark:text-text-primary";

function SectionHeader({ icon: Icon, title, subtitle, color = "orange" }: { icon: React.ElementType; title: string; subtitle: string; color?: string }) {
  const colors: Record<string, string> = {
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-500 ring-1 ring-orange-200 dark:ring-orange-500/20",
    sky: "bg-sky-50 dark:bg-sky-500/10 text-sky-500 ring-1 ring-sky-200 dark:ring-sky-500/20",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-200 dark:ring-emerald-500/20",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-500 ring-1 ring-amber-200 dark:ring-amber-500/20",
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-500 ring-1 ring-rose-200 dark:ring-rose-500/20",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-200 dark:ring-indigo-500/20",
  };
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className={cn("p-2 rounded-xl shrink-0", colors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={sectionTitle}>{title}</p>
        <p className="text-[11px] text-zinc-400 dark:text-text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleCard({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  activeColor = "orange",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  activeColor?: string;
}) {
  const bg: Record<string, string> = {
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-500",
    sky: "bg-sky-50 dark:bg-sky-500/10 text-sky-500",
  };
  const track: Record<string, string> = {
    orange: "peer-checked:bg-orange-500",
    sky: "peer-checked:bg-sky-500",
  };
  return (
    <label className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-border bg-zinc-50 dark:bg-surface/60 hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer transition-all group">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bg[activeColor])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-zinc-800 dark:text-text-primary">{title}</p>
          <p className="text-[11px] text-zinc-400 dark:text-text-muted leading-snug">{description}</p>
        </div>
      </div>
      <div className="relative shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div
          className={cn(
            "w-11 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all",
            "after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-[18px] after:h-[18px] after:rounded-full after:bg-white after:shadow after:transition-all",
            "peer-checked:after:translate-x-5",
            track[activeColor]
          )}
        />
      </div>
    </label>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [userVendors, setUserVendors] = useState<Record<string, unknown>[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeType, setActiveType] = useState<"physical" | "digital">("physical");

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
      if (!user) { router.push("/login"); return; }
      const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
      if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
      setUserVendors(vends);
      setVendor(vends[0]);
      setSelectedVendorId(vends[0].id as string);
      const { data: cats } = await supabase.from("product_categories").select("id, name, slug").eq("is_active", true).order("sort_order");
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

  function switchType(type: "physical" | "digital") {
    setActiveType(type);
    handleChange("product_type", type);
    handleChange("is_digital", type === "digital");
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vendor || !form.name || !form.price) { setError("Product name and price are required."); return; }
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
      if (insertErr) { setError(insertErr.message); }
      else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1500); }
    });
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white dark:bg-bg">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-white dark:bg-surface border border-zinc-100 dark:border-border shadow-2xl flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800 dark:text-text-primary">Product Added!</p>
          <p className="text-xs text-zinc-400 mt-1">Redirecting to inventory…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-bg pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/products">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-surface border border-zinc-200 dark:border-border text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all text-xs shadow-sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </div>
          </Link>
          <div className="flex items-center gap-2 text-zinc-400">
            <Package className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-widest">New Product</span>
          </div>
        </div>

        {/* ── PRODUCT TYPE SWITCHER ── */}
        <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-4 shadow-sm">
          <p className={cn(labelBase, "mb-3")}>Product Type</p>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCT_TYPES.map((type) => {
              const active = activeType === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => switchType(type.id as "physical" | "digital")}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200",
                    active
                      ? type.color === "orange"
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-500/10"
                        : "border-sky-400 bg-sky-50 dark:bg-sky-500/10"
                      : "border-zinc-200 dark:border-border bg-zinc-50 dark:bg-surface/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                      active
                        ? type.color === "orange"
                          ? "bg-orange-500 text-white"
                          : "bg-sky-500 text-white"
                        : "bg-zinc-100 dark:bg-surface-secondary text-zinc-400"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", active ? "text-zinc-900 dark:text-text-primary" : "text-zinc-500 dark:text-text-muted")}>
                      {type.label}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-text-muted leading-snug hidden sm:block">{type.description}</p>
                  </div>
                  {active && (
                    <div className={cn("absolute top-2.5 right-2.5 w-2 h-2 rounded-full", type.color === "orange" ? "bg-orange-500" : "bg-sky-500")} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MAIN FORM ── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Images */}
          <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
            <SectionHeader icon={ImageIcon} title="Images" subtitle="Upload high-quality product photos" color="orange" />
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-100 dark:border-border shadow">
                    <CloudinaryImage src={img} alt={`Image ${i + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(i)}
                        className="bg-white/90 hover:bg-rose-500 text-rose-500 hover:text-white rounded-full p-1.5 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {i === 0 && (
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-semibold">Cover</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <CloudinaryDropzone folder="jimvio/products" onUploadSuccess={handleImageUpload} label="Upload Images" sublabel="JPG / PNG / WEBP · Max 10MB" />
          </div>

          {/* Store selector (multi-vendor) */}
          {userVendors.length > 1 && (
            <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
              <div className="space-y-2">
                <Label className={labelBase}>Store</Label>
                <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className={selectBase}>
                  {userVendors.map((v) => (
                    <option key={v.id as string} value={v.id as string}>{v.business_name as string}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
            <SectionHeader icon={FileText} title="Basic Information" subtitle="Product name, category, and description" color="sky" />
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className={cn(labelBase, "mb-2 block")}>Product Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. iPhone 15 Pro Max 256GB" className={inputBase} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id" className={cn(labelBase, "mb-2 block")}>Category</Label>
                  <select id="category_id" value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className={selectBase}>
                    <option value="">Uncategorized</option>
                    {activeType === "physical" && categories.map((cat) => (
                      <option key={cat.id as string} value={cat.id as string}>{cat.name as string}</option>
                    ))}
                    {activeType === "digital" && (
                      <>
                        <option value="template">Templates</option>
                        <option value="ebook">E-Books</option>
                        <option value="software">Software</option>
                        <option value="course">Courses</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <Label className={cn(labelBase, "mb-2 block")}>Slug (auto)</Label>
                  <Input value={form.slug} readOnly className={cn(inputBase, "bg-zinc-50 dark:bg-surface-secondary/60 text-zinc-400 cursor-not-allowed")} placeholder="auto-generated" />
                </div>
              </div>

              <div>
                <Label htmlFor="short_description" className={cn(labelBase, "mb-2 block")}>Short Description</Label>
                <Textarea id="short_description" value={form.short_description} onChange={(e) => handleChange("short_description", e.target.value)}
                  placeholder="One-line summary shown in listings…" rows={2}
                  className="w-full rounded-xl border border-zinc-200 dark:border-border bg-white dark:bg-surface text-zinc-900 dark:text-text-primary placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400 transition-all text-sm px-4 py-3 resize-none shadow-sm" />
              </div>

              <div>
                <Label htmlFor="description" className={cn(labelBase, "mb-2 block")}>Full Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Full details, specs, and features…" rows={5}
                  className="w-full rounded-xl border border-zinc-200 dark:border-border bg-white dark:bg-surface text-zinc-900 dark:text-text-primary placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400 transition-all text-sm px-4 py-3 resize-none shadow-sm" />
              </div>

              <div>
                <Label htmlFor="tags" className={cn(labelBase, "mb-2 block")}>Tags <span className="normal-case font-normal opacity-60">(comma-separated)</span></Label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <Input id="tags" value={form.tags} onChange={(e) => handleChange("tags", e.target.value)}
                    placeholder="e.g. electronics, smartphone, apple" className={cn(inputBase, "pl-10")} />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
            <SectionHeader icon={DollarSign} title="Pricing" subtitle="Set your price and currency" color="emerald" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price" className={cn(labelBase, "mb-2 block")}>Price *</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-text-muted font-semibold text-sm">
                    {form.currency === "RWF" ? "Fr" : "$"}
                  </span>
                  <Input id="price" type="number" placeholder="0.00" min={0} step="0.01" value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                    className={cn(inputBase, "pl-9 font-semibold")} required />
                </div>
              </div>
              <div>
                <Label htmlFor="compare_at_price" className={cn(labelBase, "mb-2 block")}>Compare-at Price</Label>
                <Input id="compare_at_price" type="number" placeholder="Original price" min={0} step="0.01" value={form.compare_at_price}
                  onChange={(e) => handleChange("compare_at_price", e.target.value)} className={inputBase} />
              </div>
              <div>
                <Label htmlFor="currency" className={cn(labelBase, "mb-2 block")}>Currency</Label>
                <select id="currency" value={form.currency} onChange={(e) => handleChange("currency", e.target.value)} className={selectBase}>
                  <option value="USD">USD – US Dollar</option>
                  <option value="RWF">RWF – Rwandan Franc</option>
                </select>
              </div>
            </div>
          </div>

          {/* Physical: Inventory */}
          {activeType === "physical" && (
            <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
              <SectionHeader icon={Layers} title="Inventory" subtitle="Manage stock levels" color="amber" />
              <div className="space-y-4">
                <div className="max-w-xs">
                  <Label htmlFor="inventory_quantity" className={cn(labelBase, "mb-2 block")}>Stock Quantity</Label>
                  <Input id="inventory_quantity" type="number" placeholder="0" min={0} value={form.inventory_quantity}
                    onChange={(e) => handleChange("inventory_quantity", e.target.value)} className={cn(inputBase, "font-semibold")} />
                </div>
                <ToggleCard
                  icon={Box}
                  title="Track Inventory"
                  description="Automatically update stock levels on orders"
                  checked={form.track_inventory}
                  onChange={(v) => handleChange("track_inventory", v)}
                  activeColor="orange"
                />
              </div>
            </div>
          )}

          {/* Digital: File upload */}
          {activeType === "digital" && (
            <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
              <SectionHeader icon={Zap} title="Digital File" subtitle="Upload the file customers will receive" color="indigo" />
              <div className="space-y-3">
                <div className="rounded-xl border border-dashed border-zinc-200 dark:border-border-strong bg-zinc-50 dark:bg-surface/60 overflow-hidden">
                  <CloudinaryUploadButton
                    folder="jimvio/digital-files"
                    resourceType="raw"
                    onUploadSuccess={(url) => handleChange("digital_file_url", url)}
                    buttonText="Upload Product File"
                  />
                </div>
                {form.digital_file_url && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5" /> File uploaded successfully
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Promotion */}
          <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
            <SectionHeader icon={Rocket} title="Promotion" subtitle="Boost sales with affiliates and influencers" color="rose" />
            <div className="space-y-3">
              <ToggleCard
                icon={Zap}
                title="Allow Affiliates"
                description="Let others earn a commission promoting this product"
                checked={form.affiliate_enabled}
                onChange={(v) => handleChange("affiliate_enabled", v)}
                activeColor="orange"
              />
              {form.affiliate_enabled && (
                <div className="ml-12 max-w-[200px] animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="affiliate_commission_rate" className={cn(labelBase, "mb-1.5 block")}>Commission Rate</Label>
                  <div className="relative">
                    <Input id="affiliate_commission_rate" type="number" placeholder="10" min={1} max={90}
                      value={form.affiliate_commission_rate}
                      onChange={(e) => handleChange("affiliate_commission_rate", e.target.value)}
                      className={cn(inputBase, "pr-8 font-semibold")} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">%</span>
                  </div>
                </div>
              )}
              <ToggleCard
                icon={Sparkles}
                title="Allow Influencers"
                description="Enable influencer campaigns for this product"
                checked={form.influencer_enabled}
                onChange={(v) => handleChange("influencer_enabled", v)}
                activeColor="sky"
              />
            </div>
          </div>

          {/* Status + Actions */}
          <div className="bg-white dark:bg-surface rounded-2xl border border-zinc-200 dark:border-border p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="status" className={cn(labelBase, "mb-2 block")}>Visibility</Label>
                <select id="status" value={form.status} onChange={(e) => handleChange("status", e.target.value)}
                  className={selectBase}>
                  <option value="draft">Draft — Private</option>
                  <option value="active">Active — Public</option>
                </select>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button type="button" variant="ghost" className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-border text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all" asChild>
                  <Link href="/dashboard/products">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 sm:flex-none h-11 px-7 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs tracking-wide shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Save className="h-4 w-4" />{form.status === "active" ? "Publish Product" : "Save Draft"}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}