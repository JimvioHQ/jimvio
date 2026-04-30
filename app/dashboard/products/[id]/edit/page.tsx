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
                      className="h-10 flex items-center px-3 border border-r-0 rounded-l-sm text-[11px]  whitespace-nowrap"
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
                      className={cn(inputStyle, "rounded-l-none  text-xs")}
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
                            className="pl-8 "
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
                    className="p-4 rounded-md"
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
                        <p className="text-xs  truncate flex-1" style={{ color: "var(--color-text-muted)" }}>
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
                      className=" text-xs h-10 pl-3"
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
                        className="h-10 pl-3 pr-8 "
                        min="1" max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs " style={{ color: "var(--color-text-muted)" }}>%</span>
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