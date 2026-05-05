"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, DollarSign, Loader2, CheckCircle2,
  ShoppingBag, Globe, Upload, AlertTriangle,
  X, Image as ImageIcon, Zap,
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
  { id: "digital", label: "Digital", icon: Globe, hint: "Instant download" },
];

const BILLING_PERIODS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

const STATUS_OPTIONS = [
  { id: "draft", label: "Draft", dot: "bg-[var(--color-text-muted)]" },
  { id: "active", label: "Active", dot: "bg-emerald-500" },
  { id: "paused", label: "Paused", dot: "bg-amber-500" },
  { id: "archived", label: "Archived", dot: "bg-rose-500" },
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
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </h2>
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
        "relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
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
          <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ── main ── */
export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [vendor, setVendor] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", slug: "", short_description: "", description: "",
    product_type: "physical" as "physical" | "digital",
    price: "0", currency: "USD", category_id: "", is_digital: false,
    pricing_type: "one_time" as "one_time" | "recurring",
    billing_period: "monthly", digital_file_url: "", track_inventory: true,
    inventory_quantity: "0", affiliate_enabled: false,
    affiliate_commission_rate: "10", is_featured: false,
    status: "draft", button_text: "", tags: "",
    weight: "", dimensions: "", images: [] as string[],
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
    setForm(prev => {
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
    setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
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

  /* ── success screen ── */
  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "var(--color-bg)" }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(48,164,108,0.1)", border: "1px solid rgba(48,164,108,0.2)" }}
      >
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Product created!</p>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to your products…</p>
      </div>
    </div>
  );

  const inputStyle = "pl-3 h-10";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/products"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-all"
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
                {form.name || "New product"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              onClick={() => router.push("/dashboard/products")}
              className="hidden sm:flex h-8 px-4 rounded-md text-xs font-semibold transition-all"
              style={{
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              Discard
            </button>

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 h-8 px-4 rounded-md text-xs font-semibold text-white transition-all"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 16px rgba(253,80,0,0.25)",
              }}
              onMouseEnter={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent-hover)"); }}
              onMouseLeave={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent)"); }}
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isPending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.2)" }}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-500">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-rose-500/60 hover:text-rose-500 transition-colors">
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
                      className="h-10 flex items-center px-3 border border-r-0 rounded-l-sm text-[11px] whitespace-nowrap"
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
                      className={cn(inputStyle, "rounded-l-none text-xs")}
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
                className="border-2 border-dashed rounded-md p-8 text-center group cursor-pointer transition-colors"
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
                        className="w-10 h-10 rounded-md flex items-center justify-center"
                        style={{ background: "var(--color-surface-secondary)" }}
                      >
                        <ImageIcon className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
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
                      className="relative aspect-square rounded-md overflow-hidden group"
                      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                    >
                      <CloudinaryImage
                        src={url} alt={`Image ${i + 1}`} fill
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

                {/* Type + category */}
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
                            className="flex items-center gap-3 p-3.5 rounded-md text-left transition-all"
                            style={{
                              border: sel ? "1px solid rgba(253,80,0,0.4)" : "1px solid var(--color-border)",
                              background: sel ? "rgba(253,80,0,0.05)" : "var(--color-surface-secondary)",
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                              style={sel
                                ? { background: "var(--color-accent)", color: "#fff" }
                                : { background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                                {type.label}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
                                {type.hint}
                              </p>
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
                <div
                  className="space-y-5"
                  style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "2rem" }}
                >
                  <div>
                    <FieldLabel label="Pricing model" />
                    <div className="grid grid-cols-2 gap-2">
                      {[{ id: "free", label: "Free" }, { id: "paid", label: "Paid" }].map(opt => {
                        const sel = opt.id === "free" ? isFree : !isFree;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
                            className="h-9 rounded-md text-xs font-semibold transition-all"
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
                            className="pl-8 h-10 font-semibold"
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
                                  className="h-9 rounded-md text-xs font-semibold transition-all"
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
                        className="flex items-center gap-3 p-3 rounded-md"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="text-xs truncate flex-1" style={{ color: "var(--color-text-muted)" }}>
                          {form.digital_file_url}
                        </p>
                        <button
                          onClick={() => handleChange("digital_file_url", "")}
                          className="text-rose-400 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <CloudinaryUploadButton
                        folder="jimvio/digital-files"
                        resourceType="raw"
                        onUploadSuccess={url => handleChange("digital_file_url", url)}
                        className="px-5 h-9 rounded-md text-xs font-semibold transition-all"
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
                    className="p-4 rounded-md"
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
              <FieldLabel label="Visibility / Status" />
              <div className="space-y-1">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleChange("status", opt.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-left transition-all"
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
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Affiliate program
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    Let others earn by promoting this
                  </p>
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
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        %
                      </span>
                    </div>
                  </Field>
                </div>
              )}
            </SectionCard>

            {/* Publish */}
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 20px rgba(253,80,0,0.2)",
                opacity: isPending ? 0.8 : 1,
              }}
              onMouseEnter={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent-hover)"); }}
              onMouseLeave={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent)"); }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isPending ? "Publishing…" : "Publish product"}
            </button>

            <p className="text-[10px] text-center" style={{ color: "var(--color-text-muted)" }}>
              Draft products are saved but not visible to buyers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import {
//   ArrowLeft, DollarSign, Loader2, CheckCircle2,
//   ShoppingBag, Globe, Upload, AlertTriangle, X,
//   Image as ImageIcon, Zap, ChevronRight, Sparkles,
//   Star, Users, Video, BookOpen, Layers, Package,
//   Cpu, FileText, UsersRound, Lock, MapPin, Search, Globe2,
// } from "lucide-react";
// import { createClient } from "@/lib/supabase/client";
// import Link from "next/link";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";
// import { FieldInput } from "@/components/ui/field-input";
// import { Field, FieldLabel } from "@/components/ui/field";
// import CustomSelect from "@/components/ui/select-2";
// import { StyledTextarea } from "@/components/ui/textarea";

// /* ─── helpers ─── */
// function slugify(t: string) {
//   return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
// }

// /* ─── constants ─── */
// const STEPS = [
//   { id: 1, label: "Product details" },
//   { id: 2, label: "Pricing" },
//   { id: 3, label: "Settings" },
//   { id: 4, label: "Publish" },
// ];

// const BILLING_PERIODS = [
//   { id: "weekly", label: "Weekly" },
//   { id: "monthly", label: "Monthly" },
//   { id: "quarterly", label: "Quarterly" },
//   { id: "yearly", label: "Yearly" },
// ];

// const STATUS_OPTIONS = [
//   { id: "draft", label: "Draft" },
//   { id: "active", label: "Active" },
//   { id: "paused", label: "Paused" },
//   { id: "archived", label: "Archived" },
// ];

// const PRODUCT_SUBTYPES = [
//   { id: "course", label: "Course", icon: BookOpen },
//   { id: "coaching", label: "Coaching", icon: UsersRound },
//   { id: "ebook", label: "E-book", icon: FileText },
//   { id: "software", label: "Software", icon: Cpu },
//   { id: "templates", label: "Templates", icon: Layers },
//   { id: "community", label: "Community", icon: Users },
//   { id: "bundle", label: "Bundle", icon: Package },
// ];

// const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join now"];

// const ADVANCED_ITEMS = [
//   { label: "Drip content", icon: Layers },
//   { label: "Access rules", icon: Lock },
//   { label: "Localization", icon: MapPin },
//   { label: "SEO settings", icon: Search },
// ];

// /* ─── micro-components ─── */

// function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
//   return (
//     <button
//       type="button" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
//       className="relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none"
//       style={{ background: checked ? "var(--color-accent)" : "var(--color-border-strong)" }}
//     >
//       <span className={cn(
//         "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
//         checked ? "translate-x-[18px]" : "translate-x-[3px]"
//       )} />
//     </button>
//   );
// }

// function CharCount({ val, max }: { val: string; max: number }) {
//   const len = val.length;
//   const near = len >= max * 0.85;
//   return (
//     <span className="text-[10px] tabular-nums font-mono"
//       style={{ color: near ? (len >= max ? "#ef4444" : "#f59e0b") : "var(--color-text-muted)" }}>
//       {len}/{max}
//     </span>
//   );
// }

// function Divider() {
//   return <div style={{ borderTop: "1px solid var(--color-border)", margin: "1.75rem 0" }} />;
// }

// function SectionBox({ title, description, action, children }: {
//   title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
// }) {
//   return (
//     <div className="space-y-4">
//       <div className="flex items-start justify-between gap-4">
//         <div>
//           <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
//           {description && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</p>}
//         </div>
//         {action}
//       </div>
//       {children}
//     </div>
//   );
// }

// /* ─── Tag input ─── */
// function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
//   const [input, setInput] = useState("");
//   const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];

//   function add(t: string) {
//     const trimmed = t.trim();
//     if (!trimmed || tags.includes(trimmed)) return;
//     onChange([...tags, trimmed].join(", "));
//     setInput("");
//   }
//   function remove(i: number) { onChange(tags.filter((_, idx) => idx !== i).join(", ")); }

//   return (
//     <div className="flex flex-wrap gap-1.5 min-h-10 p-2 px-3 rounded-sm"
//       style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
//       {tags.map((t, i) => (
//         <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
//           style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}>
//           {t}
//           <button onClick={() => remove(i)} className="opacity-50 hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
//         </span>
//       ))}
//       <input value={input} onChange={e => setInput(e.target.value)}
//         onKeyDown={e => {
//           if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
//           if (e.key === "Backspace" && !input && tags.length) remove(tags.length - 1);
//         }}
//         onBlur={() => { if (input) add(input); }}
//         placeholder={tags.length === 0 ? "+ Add tag" : ""}
//         className="flex-1 min-w-20 bg-transparent text-xs outline-none"
//         style={{ color: "var(--color-text-primary)" }}
//       />
//     </div>
//   );
// }

// /* ─── Live Preview ─── */
// function LivePreview({ form }: { form: any }) {
//   const price = parseFloat(form.price) || 0;
//   const isFree = price === 0;
//   return (
//     <div className="rounded-lg overflow-hidden sticky top-20"
//       style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//       <div className="px-4 py-3 flex items-center justify-between"
//         style={{ borderBottom: "1px solid var(--color-border)" }}>
//         <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Live preview</p>
//         <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
//           style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//           Buyer view
//         </span>
//       </div>
//       <div className="p-4">
//         {/* Cover */}
//         <div className="w-full rounded-lg overflow-hidden mb-3 flex items-center justify-center"
//           style={{
//             aspectRatio: "16/9",
//             background: form.images.length ? "transparent" : "linear-gradient(135deg, var(--color-surface-secondary), var(--color-border))",
//             border: "1px solid var(--color-border)",
//           }}>
//           {form.images.length > 0 ? (
//             <div className="relative w-full h-full">
//               <CloudinaryImage src={form.images[0]} alt="cover" fill className="object-cover" />
//               <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
//                 style={{ background: "var(--color-accent)", color: "#fff" }}>Best Seller</div>
//             </div>
//           ) : (
//             <div className="flex flex-col items-center gap-2 opacity-25">
//               <ImageIcon className="w-8 h-8" style={{ color: "var(--color-text-muted)" }} />
//               <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>No cover yet</span>
//             </div>
//           )}
//         </div>
//         {/* Stats */}
//         <div className="flex items-center gap-2 mb-2">
//           <div className="flex -space-x-1">
//             {["#6366f1", "#ec4899", "#f59e0b"].map((c, i) => (
//               <div key={i} className="w-5 h-5 rounded-full border-2" style={{ borderColor: "var(--color-surface)", background: c }} />
//             ))}
//           </div>
//           <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>2.8k+ students</span>
//           <span className="ml-auto flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
//             <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 4.9 (320 reviews)
//           </span>
//         </div>
//         {/* Name */}
//         <p className="text-sm font-bold leading-snug mb-1"
//           style={{ color: form.name ? "var(--color-text-primary)" : "var(--color-text-muted)", fontStyle: form.name ? "normal" : "italic" }}>
//           {form.name || "Your product name"}
//         </p>
//         {form.short_description && (
//           <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{form.short_description}</p>
//         )}
//         {/* Price */}
//         <div className="flex items-baseline gap-1 mb-3">
//           <span className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
//             {isFree ? "Free" : `$${price.toFixed(2)}`}
//           </span>
//           {!isFree && form.pricing_type === "recurring" && (
//             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>/ {form.billing_period || "month"}</span>
//           )}
//         </div>
//         {/* CTA */}
//         <button className="w-full h-9 rounded-lg text-xs font-semibold text-white"
//           style={{ background: "var(--color-accent)" }}>
//           {form.button_text || "Join now"}
//         </button>
//         {/* Tags preview */}
//         {form.tags && (
//           <div className="flex flex-wrap gap-1 mt-3">
//             {form.tags.split(",").slice(0, 3).map((t: string) => t.trim()).filter(Boolean).map((t: string, i: number) => (
//               <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
//                 style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//                 {t}
//               </span>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ─── Right Sidebar ─── */
// function RightSidebar({ form, handleChange }: { form: any; handleChange: (f: string, v: any) => void }) {
//   return (
//     <div className="space-y-4 sticky top-20">
//       {/* Product status */}
//       <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//         <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//           <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Product status</p>
//         </div>
//         <div className="p-3 space-y-2">
//           <CustomSelect value={form.status} onChange={v => handleChange("status", v)}
//             options={STATUS_OPTIONS.map(s => ({ value: s.id, label: s.label }))} />
//           <div className="flex items-center gap-2 text-[10px] rounded-lg px-3 py-2"
//             style={{ background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//             <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
//             Unsaved changes — Last saved just now
//           </div>
//         </div>
//       </div>

//       {/* Sales page options */}
//       <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//         <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//           <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Sales page options</p>
//         </div>
//         <div className="p-4 space-y-3.5">
//           {[
//             { key: "custom_domain", label: "Use custom domain" },
//             { key: "show_author", label: "Show author bio" },
//             { key: "show_reviews", label: "Show reviews" },
//             { key: "enable_discussions", label: "Enable discussions" },
//           ].map(item => (
//             <div key={item.key} className="flex items-center justify-between gap-3">
//               <span className="text-xs" style={{ color: "var(--color-text-primary)" }}>{item.label}</span>
//               <Toggle checked={!!(form as any)[item.key]} onChange={v => handleChange(item.key, v)} />
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Product type */}
//       <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//         <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//           <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Product type</p>
//         </div>
//         <div className="p-2">
//           {PRODUCT_SUBTYPES.map(type => {
//             const Icon = type.icon;
//             const sel = form.product_subtype === type.id;
//             return (
//               <button key={type.id} onClick={() => handleChange("product_subtype", type.id)}
//                 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
//                 style={sel
//                   ? { background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }
//                   : { background: "transparent", border: "1px solid transparent" }
//                 }
//                 onMouseEnter={e => { if (!sel) (e.currentTarget.style.background = "var(--color-surface-secondary)"); }}
//                 onMouseLeave={e => { if (!sel) (e.currentTarget.style.background = "transparent"); }}
//               >
//                 <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
//                   style={sel
//                     ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }
//                     : { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }
//                   }>
//                   <Icon className="w-3 h-3" style={{ color: sel ? "#6366f1" : "var(--color-text-muted)" }} />
//                 </div>
//                 <span className="text-xs font-medium flex-1"
//                   style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
//                   {type.label}
//                 </span>
//                 {sel && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       {/* Advanced */}
//       <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//         <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//           <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Advanced</p>
//         </div>
//         <div>
//           {ADVANCED_ITEMS.map((item, i) => {
//             const Icon = item.icon;
//             return (
//               <button key={item.label}
//                 className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-[var(--color-surface-secondary)]"
//                 style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : "none" }}>
//                 <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
//                 <span className="text-xs font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>{item.label}</span>
//                 <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
//               </button>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ─── Step 1: Product Details ─── */
// function StepProductDetails({ form, handleChange, handleImageUpload, removeImage, categories }: any) {
//   const filteredCats = categories.filter((c: any) => {
//     const ct = c.category_type;
//     if (form.product_type === "digital") return ct === "digital";
//     return ct === "physical" || ct === "both" || !ct;
//   });

//   return (
//     <div className="space-y-0">
//       <SectionBox title="Basic information" description="Add essential details about your product"
//         action={
//           <button className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all"
//             style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#6366f1" }}>
//             <Sparkles className="w-3 h-3" /> AI Assist
//           </button>
//         }>
//         <div className="space-y-4">
//           {/* Name */}
//           <div>
//             <div className="flex items-center justify-between mb-1.5">
//               <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                 Product name <span className="text-rose-500">*</span>
//               </label>
//               <CharCount val={form.name} max={80} />
//             </div>
//             <FieldInput value={form.name} onChange={e => handleChange("name", e.target.value)}
//               placeholder="How to Build a Viral App: 0 to $100k/mo" className="h-10 pl-3" maxLength={80} />
//           </div>
//           {/* Headline */}
//           <div>
//             <div className="flex items-center justify-between mb-1.5">
//               <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                 Headline <span className="text-rose-500">*</span>
//               </label>
//               <CharCount val={form.short_description} max={80} />
//             </div>
//             <FieldInput value={form.short_description} onChange={e => handleChange("short_description", e.target.value)}
//               placeholder="Step-by-step blueprint to build, launch & monetize your app" className="h-10 pl-3" maxLength={80} />
//           </div>
//           {/* Description */}
//           <div>
//             <div className="flex items-center justify-between mb-1.5">
//               <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
//                 Short description <span className="text-rose-500">*</span>
//               </label>
//               <CharCount val={form.description || ""} max={200} />
//             </div>
//             <StyledTextarea value={form.description || ""} onChange={e => handleChange("description", e.target.value)}
//               rows={4} placeholder="A complete guide to validate, build and launch your app…" maxLength={200} />
//           </div>
//           {/* Category */}
//           <div>
//             <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>
//               Category <span className="text-rose-500">*</span>
//             </label>
//             <CustomSelect value={form.category_id} onChange={v => handleChange("category_id", v)}
//               options={[{ value: "", label: "Select a category…" }, ...filteredCats.map((c: any) => ({ value: c.id, label: c.name }))]} />
//           </div>
//           {/* Tags */}
//           <div>
//             <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>Tags</label>
//             <TagInput value={form.tags} onChange={v => handleChange("tags", v)} />
//             <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Press Enter or comma to add</p>
//           </div>
//         </div>
//       </SectionBox>

//       <Divider />

//       <SectionBox title="Media & preview" description="Upload your product media and see it in preview">
//         <div className="flex gap-3 items-start flex-wrap">
//           {/* Cover */}
//           <CloudinaryDropzone folder="jimvio/products" onUploadSuccess={handleImageUpload}
//             label={
//               <div className="flex flex-col items-center justify-center gap-2 rounded-md cursor-pointer transition-all"
//                 style={{ width: 160, height: 120, background: "var(--color-surface-secondary)", border: "2px dashed var(--color-border)" }}>
//                 {form.images[0] ? (
//                   <div className="relative w-full h-full rounded-md overflow-hidden">
//                     <CloudinaryImage src={form.images[0]} alt="cover" fill className="object-cover" />
//                   </div>
//                 ) : (
//                   <>
//                     <div className="w-8 h-8 rounded-lg flex items-center justify-center"
//                       style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
//                       <Upload className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
//                     </div>
//                     <div className="text-center px-2">
//                       <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>Upload cover image</p>
//                       <p className="text-[9px] mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
//                         PNG, JPG or WEBP. Max 5MB<br />Recommended: 1280×720
//                       </p>
//                     </div>
//                   </>
//                 )}
//               </div>
//             } />

//           {/* Gallery */}
//           <div className="flex gap-2 flex-wrap items-start">
//             {form.images.slice(1).map((url: string, i: number) => (
//               <div key={url} className="relative rounded-lg overflow-hidden group"
//                 style={{ width: 80, height: 60, border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
//                 <CloudinaryImage src={url} alt={`img-${i}`} fill className="object-cover" />
//                 <button onClick={() => removeImage(i + 1)}
//                   className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
//                   <X className="w-2.5 h-2.5" />
//                 </button>
//               </div>
//             ))}
//             <CloudinaryDropzone folder="jimvio/products" onUploadSuccess={handleImageUpload}
//               label={
//                 <div className="flex flex-col items-center justify-center gap-1 rounded-lg cursor-pointer"
//                   style={{ width: 80, height: 60, border: "1px dashed var(--color-border)", background: "var(--color-surface-secondary)" }}>
//                   <ImageIcon className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
//                   <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>Add gallery</span>
//                 </div>
//               } />
//             <div className="flex flex-col items-center justify-center gap-1 rounded-lg cursor-pointer"
//               style={{ width: 80, height: 60, border: "1px dashed var(--color-border)", background: "var(--color-surface-secondary)" }}>
//               <Video className="w-3.5 h-3.5" style={{ color: "var(--color-text-muted)" }} />
//               <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>Add teaser video</span>
//             </div>
//           </div>
//         </div>
//       </SectionBox>

//       <Divider />

//       <SectionBox title="Product URL" description="Customize your product's permalink">
//         <div className="flex items-center">
//           <span className="h-10 flex items-center px-3 border border-r-0 rounded-l-lg text-[11px] font-mono whitespace-nowrap shrink-0"
//             style={{ background: "var(--color-surface-secondary)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
//             /product/
//           </span>
//           <FieldInput value={form.slug} onChange={e => handleChange("slug", e.target.value)}
//             className="h-10 pl-3 rounded-l-none font-mono text-xs" placeholder="my-product-name" />
//         </div>
//       </SectionBox>
//     </div>
//   );
// }

// /* ─── Step 2: Pricing ─── */
// function StepPricing({ form, handleChange }: any) {
//   const isFree = parseFloat(form.price) === 0;
//   return (
//     <div>
//       <SectionBox title="Pricing model" description="Set how customers will pay for your product">
//         <div className="grid grid-cols-2 gap-3">
//           {[{ id: "free", hint: "No charge" }, { id: "paid", hint: "Charge customers" }].map(opt => {
//             const sel = opt.id === "free" ? isFree : !isFree;
//             return (
//               <button key={opt.id} onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
//                 className="flex flex-col gap-1 p-4 rounded-md text-left transition-all"
//                 style={sel
//                   ? { border: "1.5px solid var(--color-accent)", background: "rgba(253,80,0,0.04)" }
//                   : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
//                 <div className="flex items-center justify-between">
//                   <span className="text-sm font-semibold capitalize"
//                     style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>{opt.id}</span>
//                   {sel && <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-accent)" }} />}
//                 </div>
//                 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{opt.hint}</span>
//               </button>
//             );
//           })}
//         </div>

//         {!isFree && (
//           <div className="mt-5 space-y-4">
//             <div className="grid grid-cols-3 gap-3">
//               <Field label="Currency">
//                 <CustomSelect value={form.currency} onChange={v => handleChange("currency", v)}
//                   options={[{ value: "USD", label: "USD – $" }, { value: "EUR", label: "EUR – €" }, { value: "GBP", label: "GBP – £" }]} />
//               </Field>
//               <div className="col-span-2">
//                 <Field label="Price" icon={<DollarSign className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />}>
//                   <FieldInput type="number" value={form.price} onChange={e => handleChange("price", e.target.value)}
//                     className="pl-8 h-10 font-bold tabular-nums text-base" min={0} step="0.01" />
//                 </Field>
//               </div>
//             </div>
//             <Divider />
//             <div>
//               <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>BILLING TYPE</p>
//               <div className="grid grid-cols-2 gap-2">
//                 {[{ id: "one_time", label: "One-time payment" }, { id: "recurring", label: "Recurring subscription" }].map(opt => {
//                   const sel = form.pricing_type === opt.id;
//                   return (
//                     <button key={opt.id} onClick={() => handleChange("pricing_type", opt.id)}
//                       className="h-10 rounded-md text-xs font-semibold transition-all"
//                       style={sel
//                         ? { border: "1.5px solid var(--color-accent)", background: "rgba(253,80,0,0.08)", color: "var(--color-accent)" }
//                         : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//                       {opt.label}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//             {form.pricing_type === "recurring" && (
//               <div>
//                 <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>BILLING PERIOD</p>
//                 <div className="flex gap-2 flex-wrap">
//                   {BILLING_PERIODS.map(p => (
//                     <button key={p.id} onClick={() => handleChange("billing_period", p.id)}
//                       className="px-4 h-9 rounded-lg text-xs font-semibold transition-all"
//                       style={form.billing_period === p.id
//                         ? { border: "1px solid var(--color-accent)", background: "var(--color-accent)", color: "#fff" }
//                         : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}>
//                       {p.label}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SectionBox>

//       <Divider />

//       <SectionBox title="Affiliate program" description="Let others earn by promoting your product">
//         <div className="flex items-center justify-between">
//           <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>Enable affiliate program</span>
//           <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
//         </div>
//         {form.affiliate_enabled && (
//           <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--color-border)" }}>
//             <Field label="Commission rate" hint="% per sale">
//               <div className="relative">
//                 <FieldInput type="number" value={form.affiliate_commission_rate}
//                   onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
//                   className="h-10 pl-3 pr-8 font-mono tabular-nums" min="1" max="100" />
//                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
//                   style={{ color: "var(--color-text-muted)" }}>%</span>
//               </div>
//             </Field>
//             <div className="text-xs px-3 py-2 rounded-lg"
//               style={{ background: "rgba(253,80,0,0.06)", border: "1px solid rgba(253,80,0,0.15)", color: "var(--color-accent)" }}>
//               Affiliates earn <strong>{form.affiliate_commission_rate || 10}%</strong> per sale
//               (~${((parseFloat(form.price) || 0) * (parseFloat(form.affiliate_commission_rate) || 10) / 100).toFixed(2)} per conversion)
//             </div>
//           </div>
//         )}
//       </SectionBox>
//     </div>
//   );
// }

// /* ─── Step 3: Settings ─── */
// function StepSettings({ form, handleChange }: any) {
//   return (
//     <div>
//       <SectionBox title="Call-to-action" description="Text shown on the buy button">
//         <Field label="Button label">
//           <FieldInput value={form.button_text} onChange={e => handleChange("button_text", e.target.value)}
//             placeholder="e.g. Join now" className="h-10 pl-3" />
//         </Field>
//         <div className="flex flex-wrap gap-1.5 mt-2.5">
//           {BUTTON_TEXTS.map(txt => (
//             <button key={txt} onClick={() => handleChange("button_text", txt)}
//               className="px-3 h-7 rounded-full text-[11px] font-semibold transition-all"
//               style={form.button_text === txt
//                 ? { background: "rgba(253,80,0,0.1)", border: "1px solid rgba(253,80,0,0.3)", color: "var(--color-accent)" }
//                 : { background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//               {txt}
//             </button>
//           ))}
//         </div>
//       </SectionBox>

//       <Divider />

//       <SectionBox title="Fulfillment" description="How this product is delivered">
//         <div className="grid grid-cols-2 gap-3">
//           {[
//             { id: "physical", label: "Physical", icon: Package, hint: "Ships to customer" },
//             { id: "digital", label: "Digital", icon: Globe2, hint: "Instant download" },
//           ].map(type => {
//             const Icon = type.icon;
//             const sel = form.product_type === type.id;
//             return (
//               <button key={type.id} onClick={() => handleChange("product_type", type.id)}
//                 className="flex items-center gap-3 p-3.5 rounded-md text-left transition-all"
//                 style={sel
//                   ? { border: "1.5px solid var(--color-accent)", background: "rgba(253,80,0,0.04)" }
//                   : { border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}>
//                 <div className="w-8 h-8 rounded-lg flex items-center justify-center"
//                   style={sel
//                     ? { background: "var(--color-accent)", color: "#fff" }
//                     : { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//                   <Icon className="w-4 h-4" />
//                 </div>
//                 <div>
//                   <p className="text-xs font-semibold" style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>{type.label}</p>
//                   <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>{type.hint}</p>
//                 </div>
//               </button>
//             );
//           })}
//         </div>

//         {form.product_type === "physical" && (
//           <div className="mt-4 space-y-4">
//             <div className="flex items-center justify-between p-3.5 rounded-md"
//               style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}>
//               <div>
//                 <p className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>Track inventory</p>
//                 <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Auto-reduce stock on purchase</p>
//               </div>
//               <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
//             </div>
//             <div className="grid grid-cols-3 gap-3">
//               <Field label="Stock qty">
//                 <FieldInput type="number" value={form.inventory_quantity}
//                   onChange={e => handleChange("inventory_quantity", e.target.value)}
//                   disabled={!form.track_inventory}
//                   className={cn("h-10 pl-3", !form.track_inventory && "opacity-40 cursor-not-allowed")} placeholder="0" />
//               </Field>
//               <Field label="Weight" hint="kg">
//                 <FieldInput type="number" step="0.01" value={form.weight}
//                   onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" className="h-10 pl-3" />
//               </Field>
//               <Field label="Dimensions">
//                 <FieldInput value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)}
//                   placeholder="L×W×H" className="h-10 pl-3" />
//               </Field>
//             </div>
//           </div>
//         )}

//         {form.product_type === "digital" && (
//           <div className="mt-4 space-y-3">
//             {form.digital_file_url ? (
//               <div className="flex items-center gap-3 p-3 rounded-md"
//                 style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
//                 <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
//                 <p className="text-xs font-mono truncate flex-1" style={{ color: "var(--color-text-muted)" }}>{form.digital_file_url}</p>
//                 <button onClick={() => handleChange("digital_file_url", "")} className="text-rose-400 hover:text-rose-500 transition-colors">
//                   <X className="w-3.5 h-3.5" />
//                 </button>
//               </div>
//             ) : (
//               <CloudinaryUploadButton folder="jimvio/digital-files" resourceType="raw"
//                 onUploadSuccess={url => handleChange("digital_file_url", url)}
//                 className="h-9 px-5 rounded-lg text-xs font-semibold transition-all" />
//             )}
//             <Field label="Or paste a file URL" hint="Direct link to your hosted file">
//               <FieldInput placeholder="https://your-cdn.com/file.zip" value={form.digital_file_url}
//                 onChange={e => handleChange("digital_file_url", e.target.value)}
//                 className="font-mono text-xs h-10 pl-3" />
//             </Field>
//           </div>
//         )}
//       </SectionBox>

//       <Divider />

//       <SectionBox title="Visibility">
//         <div className="flex items-center justify-between">
//           <div>
//             <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Feature in store showcase</p>
//             <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Pin to top of your store</p>
//           </div>
//           <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
//         </div>
//       </SectionBox>
//     </div>
//   );
// }

// /* ─── Step 4: Publish ─── */
// function StepPublish({ form, isPending, handleSubmit }: any) {
//   const price = parseFloat(form.price) || 0;
//   const checks = [
//     { label: "Product name added", done: !!form.name.trim() },
//     { label: "Cover image uploaded", done: form.images.length > 0 },
//     { label: "Category selected", done: !!form.category_id },
//     { label: "Pricing configured", done: true },
//     { label: "Fulfillment set up", done: form.product_type === "physical" || !!form.digital_file_url },
//   ];
//   const allDone = checks.every(c => c.done);
//   return (
//     <div className="space-y-6">
//       <SectionBox title="Pre-launch checklist" description="Make sure everything looks good">
//         <div className="space-y-2">
//           {checks.map(item => (
//             <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg"
//               style={{ background: item.done ? "rgba(16,185,129,0.04)" : "var(--color-surface-secondary)", border: `1px solid ${item.done ? "rgba(16,185,129,0.15)" : "var(--color-border)"}` }}>
//               <CheckCircle2 className={cn("w-4 h-4 shrink-0", item.done ? "text-emerald-500" : "opacity-20")}
//                 style={!item.done ? { color: "var(--color-text-muted)" } : undefined} />
//               <span className="text-xs font-medium flex-1" style={{ color: item.done ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
//                 {item.label}
//               </span>
//               {!item.done && (
//                 <span className="text-[10px] px-2 py-0.5 rounded-full"
//                   style={{ background: "rgba(253,80,0,0.1)", color: "var(--color-accent)" }}>Required</span>
//               )}
//             </div>
//           ))}
//         </div>
//       </SectionBox>
//       <Divider />
//       <SectionBox title="Summary" description="Final review before going live">
//         <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
//           {[
//             { label: "Name", value: form.name || "—" },
//             { label: "Price", value: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
//             { label: "Type", value: form.product_type === "digital" ? "Digital" : "Physical" },
//             { label: "Status after publish", value: "Active" },
//           ].map((row, i) => (
//             <div key={row.label} className="flex items-center justify-between px-4 py-3"
//               style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : "none" }}>
//               <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
//               <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{row.value}</span>
//             </div>
//           ))}
//         </div>
//       </SectionBox>
//       <button onClick={handleSubmit} disabled={isPending || !allDone}
//         className="w-full h-11 rounded-md text-sm font-bold flex items-center justify-center gap-2 text-white transition-all"
//         style={{ background: allDone ? "var(--color-accent)" : "var(--color-border-strong)", opacity: isPending ? 0.8 : 1, cursor: !allDone ? "not-allowed" : "pointer" }}>
//         {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
//         {isPending ? "Publishing…" : allDone ? "Publish product" : "Complete required fields first"}
//       </button>
//       <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
//         {allDone ? "Your product will go live immediately" : "Fill in all required fields above to publish"}
//       </p>
//     </div>
//   );
// }

// /* ─────────────────── MAIN ─────────────────── */
// export default function NewProductPage() {
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [step, setStep] = useState(1);
//   const [vendor, setVendor] = useState<any>(null);
//   const [categories, setCategories] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);

//   const [form, setForm] = useState({
//     name: "", slug: "", short_description: "", description: "",
//     product_type: "digital" as "physical" | "digital",
//     product_subtype: "course",
//     price: "29.99", currency: "USD", category_id: "", is_digital: true,
//     pricing_type: "recurring" as "one_time" | "recurring",
//     billing_period: "monthly", digital_file_url: "", track_inventory: true,
//     inventory_quantity: "0", affiliate_enabled: false, affiliate_commission_rate: "10",
//     is_featured: false, status: "draft", button_text: "Join now", tags: "",
//     weight: "", dimensions: "", images: [] as string[],
//     custom_domain: false, show_author: true, show_reviews: true, enable_discussions: false,
//   });

//   useEffect(() => {
//     async function load() {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) { router.push("/login"); return; }
//       const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
//       if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
//       setVendor(vends[0]);
//       const { data: cats } = await supabase.from("product_categories")
//         .select("id, name, slug, category_type").eq("is_active", true).order("sort_order");
//       setCategories(cats ?? []);
//     }
//     load();
//   }, [router]);

//   function handleChange(field: string, value: any) {
//     setForm(prev => {
//       const updated = { ...prev, [field]: value };
//       if (field === "name") updated.slug = slugify(value);
//       if (field === "product_type") {
//         updated.is_digital = value === "digital";
//         if (value !== "digital") updated.pricing_type = "one_time";
//         const cat = categories.find(c => c.id === updated.category_id);
//         if (cat) {
//           if (value === "digital" && cat.category_type === "physical") updated.category_id = "";
//           if (value !== "digital" && cat.category_type === "digital") updated.category_id = "";
//         }
//       }
//       return updated;
//     });
//   }

//   function handleImageUpload(url: string) {
//     setForm(prev => ({ ...prev, images: [...prev.images, url] }));
//   }
//   function removeImage(index: number) {
//     setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
//   }

//   async function handleSubmit() {
//     setError(null);
//     if (!vendor || !form.name.trim()) { setError("Product name is required."); return; }
//     const price = parseFloat(form.price) || 0;
//     if (price < 0) { setError("Price cannot be negative."); return; }
//     startTransition(async () => {
//       const supabase = createClient();
//       let slug = form.slug || slugify(form.name);
//       const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
//       if (existing) slug = `${slug}-${Date.now()}`;
//       const { error: insertErr } = await supabase.from("products").insert({
//         vendor_id: vendor.id, name: form.name, slug,
//         short_description: form.short_description || null, description: form.description || null,
//         product_type: form.product_type, status: "active", price, currency: form.currency,
//         pricing_type: form.pricing_type,
//         billing_period: form.pricing_type === "recurring" ? form.billing_period : null,
//         category_id: form.category_id || null, is_digital: form.is_digital,
//         digital_file_url: form.is_digital ? (form.digital_file_url || null) : null,
//         track_inventory: !form.is_digital && form.track_inventory,
//         inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity || "0"),
//         weight: !form.is_digital ? (parseFloat(form.weight) || null) : null,
//         dimensions: !form.is_digital ? (form.dimensions || null) : null,
//         affiliate_enabled: form.affiliate_enabled,
//         affiliate_commission_rate: form.affiliate_enabled ? parseFloat(form.affiliate_commission_rate || "10") : null,
//         is_featured: form.is_featured, button_text: form.button_text || null,
//         tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
//         images: form.images,
//       });
//       if (insertErr) { setError(insertErr.message); }
//       else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
//     });
//   }

//   if (success) return (
//     <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--color-bg)" }}>
//       <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
//         style={{ background: "rgba(48,164,108,0.1)", border: "1px solid rgba(48,164,108,0.2)" }}>
//         <CheckCircle2 className="h-6 w-6 text-emerald-500" />
//       </div>
//       <div className="text-center">
//         <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Product created!</p>
//         <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to your products…</p>
//       </div>
//     </div>
//   );

//   const nextStep = STEPS.find(s => s.id === step + 1);

//   return (
//     <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

//       {/* TOP BAR */}
//       <div className="sticky top-0 z-40 backdrop-blur-md"
//         style={{ background: "color-mix(in srgb, var(--color-bg) 90%, transparent)", borderBottom: "1px solid var(--color-border)" }}>
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
//           {/* Left */}
//           <div className="flex items-center gap-3 min-w-0 flex-1">
//             <Link href="/dashboard/products"
//               className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
//               style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
//               onMouseEnter={e => { (e.currentTarget.style.borderColor = "var(--color-border-strong)"); (e.currentTarget.style.color = "var(--color-text-primary)"); }}
//               onMouseLeave={e => { (e.currentTarget.style.borderColor = "var(--color-border)"); (e.currentTarget.style.color = "var(--color-text-muted)"); }}>
//               <ArrowLeft className="w-3.5 h-3.5" />
//             </Link>
//             <div className="min-w-0">
//               <div className="flex items-center gap-2">
//                 <h1 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>Create product</h1>
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
//                   style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//                   Draft
//                 </span>
//               </div>
//               <p className="text-[11px] hidden sm:block" style={{ color: "var(--color-text-muted)" }}>
//                 Fill in the details to create your digital product
//               </p>
//             </div>
//           </div>

//           {/* Center: steps */}
//           <div className="hidden md:flex items-center gap-1">
//             {STEPS.map((s, i) => (
//               <React.Fragment key={s.id}>
//                 <button onClick={() => setStep(s.id)}
//                   className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-semibold transition-all"
//                   style={step === s.id
//                     ? { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#6366f1" }
//                     : s.id < step
//                       ? { background: "transparent", border: "1px solid transparent", color: "var(--color-text-muted)" }
//                       : { background: "transparent", border: "1px solid transparent", color: "var(--color-text-muted)", opacity: 0.45 }
//                   }>
//                   <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
//                     style={step === s.id
//                       ? { background: "#6366f1", color: "#fff" }
//                       : s.id < step
//                         ? { background: "rgba(16,185,129,0.15)", color: "#10b981" }
//                         : { background: "var(--color-surface-secondary)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
//                     }>
//                     {s.id < step ? "✓" : s.id}
//                   </span>
//                   {s.label}
//                 </button>
//                 {i < STEPS.length - 1 && (
//                   <ChevronRight className="w-3.5 h-3.5 opacity-25" style={{ color: "var(--color-text-muted)" }} />
//                 )}
//               </React.Fragment>
//             ))}
//           </div>

//           {/* Right: CTA */}
//           <div className="flex items-center gap-2 shrink-0">
//             {nextStep ? (
//               <button onClick={() => setStep(step + 1)}
//                 className="flex items-center gap-2 h-9 px-5 rounded-lg text-xs font-bold text-white transition-all"
//                 style={{ background: "#6366f1" }}
//                 onMouseEnter={e => (e.currentTarget.style.background = "#4f46e5")}
//                 onMouseLeave={e => (e.currentTarget.style.background = "#6366f1")}>
//                 Next: {nextStep.label} <ChevronRight className="w-3.5 h-3.5" />
//               </button>
//             ) : (
//               <button onClick={handleSubmit} disabled={isPending}
//                 className="flex items-center gap-2 h-9 px-5 rounded-full text-xs font-bold text-white transition-all"
//                 style={{ background: "var(--color-accent)" }}
//                 onMouseEnter={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent-hover)"); }}
//                 onMouseLeave={e => { if (!isPending) (e.currentTarget.style.background = "var(--color-accent)"); }}>
//                 {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 font-bold h-3.5" />}
//                 {isPending ? "Publishing…" : "Publish"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ERROR */}
//       {error && (
//         <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4">
//           <div className="flex items-center gap-3 p-3.5 rounded-md"
//             style={{ background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.2)" }}>
//             <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
//             <p className="text-sm text-rose-500 flex-1">{error}</p>
//             <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-500 transition-colors">
//               <X className="w-4 h-4" />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* 3-COLUMN LAYOUT */}
//       <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
//         <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px_256px] gap-5 items-start">

//           {/* FORM */}
//           <div className="rounded-md" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
//             {/* Mobile steps */}
//             <div className="flex md:hidden overflow-x-auto gap-1 p-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//               {STEPS.map(s => (
//                 <button key={s.id} onClick={() => setStep(s.id)}
//                   className="shrink-0 flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-semibold transition-all"
//                   style={step === s.id
//                     ? { background: "#6366f1", color: "#fff" }
//                     : { background: "var(--color-surface-secondary)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
//                   {s.id}. {s.label}
//                 </button>
//               ))}
//             </div>

//             <div className="p-6 sm:p-8">
//               {step === 1 && <StepProductDetails form={form} handleChange={handleChange} handleImageUpload={handleImageUpload} removeImage={removeImage} categories={categories} />}
//               {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
//               {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
//               {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} />}
//             </div>

//             {/* Bottom nav */}
//             <div className="flex items-center justify-between px-6 sm:px-8 py-4"
//               style={{ borderTop: "1px solid var(--color-border)" }}>
//               <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
//                 className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold transition-all"
//                 style={step === 1
//                   ? { opacity: 0.3, cursor: "not-allowed", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }
//                   : { border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
//                 <ArrowLeft className="w-3.5 h-3.5" /> Back
//               </button>
//               {/* Dot progress */}
//               <div className="flex items-center gap-1.5">
//                 {STEPS.map(s => (
//                   <div key={s.id} className="rounded-full transition-all duration-300 cursor-pointer" onClick={() => setStep(s.id)}
//                     style={{ width: step === s.id ? 20 : 6, height: 6, background: step === s.id ? "#6366f1" : s.id < step ? "rgba(99,102,241,0.35)" : "var(--color-border)" }} />
//                 ))}
//               </div>
//               {nextStep ? (
//                 <button onClick={() => setStep(s => Math.min(4, s + 1))}
//                   className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white transition-all"
//                   style={{ background: "#6366f1" }}
//                   onMouseEnter={e => (e.currentTarget.style.background = "#4f46e5")}
//                   onMouseLeave={e => (e.currentTarget.style.background = "#6366f1")}>
//                   Next <ChevronRight className="w-3.5 h-3.5" />
//                 </button>
//               ) : (
//                 <button onClick={handleSubmit} disabled={isPending}
//                   className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white transition-all"
//                   style={{ background: "var(--color-accent)" }}>
//                   {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Publish
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* LIVE PREVIEW */}
//           <div className="hidden xl:block">
//             <LivePreview form={form} />
//           </div>

//           {/* RIGHT SIDEBAR */}
//           <div className="hidden xl:block">
//             <RightSidebar form={form} handleChange={handleChange} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }