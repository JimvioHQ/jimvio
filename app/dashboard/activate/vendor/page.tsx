"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store,
  Building2,
  Globe,
  Phone,
  MapPin,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Search,
  HelpCircle,
  Package,
  LayoutDashboard,
  ExternalLink,
  Mail,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUS_CONFIG = {
  pending: { label: "Pending Review", variant: "warning", icon: Clock },
  approved: { label: "Approved", variant: "success", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  verified: { label: "Approved", variant: "success", icon: CheckCircle },
};

const FORM_STEPS = [
  { id: 1, title: "Business information", subtitle: "Tell us about your business", icon: Building2 },
  { id: 2, title: "Contact & location", subtitle: "How customers can reach you", icon: MapPin },
  { id: 3, title: "Review & submit", subtitle: "Confirm and send your application", icon: CheckCircle },
] as const;

export default function ActivateVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [vendor, setVendor] = useState<{
    id: string;
    verification_status: string;
    business_name: string;
    business_slug?: string | null;
    verification_notes?: string | null;
    created_at?: string | null;
  } | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    business_type: "",
    business_country: "RW",
    business_phone: "",
    business_address: "",
    business_email: "",
    website: "",
    tax_id: "",
    product_categories: "",
    business_description: "",
  });

  // Categories: from product_categories table + custom "other"
  type ProductCategoryRow = { id: string; name: string; slug: string; sort_order?: number };
  const [existingCategories, setExistingCategories] = useState<ProductCategoryRow[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [otherCategories, setOtherCategories] = useState<string[]>([]);
  const [otherCategoryInput, setOtherCategoryInput] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState("support@jimvio.com");

  // Filter categories by quick search (name or slug)
  const filteredCategories = existingCategories.filter(
    (c) =>
      !categorySearch.trim() ||
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(categorySearch.toLowerCase())
  );

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("platform_settings").select("value").eq("key", "contact").maybeSingle();
      const em = (data?.value as { support_email?: string } | null)?.support_email;
      if (em?.includes("@")) setSupportEmail(em);
    })();
  }, []);

  // Fetch categories from product_categories table (runs once when page loads)
  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, slug, sort_order");
      console.log("[Vendor form] product_categories response:", { data, error, count: data?.length ?? 0 });
      if (error) console.error("[Vendor form] product_categories error:", error.message, error.details);
      const list = (data ?? []).map((c) => ({ ...c, sort_order: c.sort_order ?? 0 })).sort((a, b) => a.sort_order - b.sort_order);
      setExistingCategories(list as ProductCategoryRow[]);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: v } = await supabase
        .from("vendors")
        .select("id, business_name, business_slug, verification_status, verification_notes, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setVendor(v ?? null);
      if (v) {
        // Select columns that exist in vendors; business_type/product_categories require migration 008 or 009
        const { data: full } = await supabase
          .from("vendors")
          .select("business_phone, business_address, business_country, business_description, business_email, website, tax_id")
          .eq("id", v.id)
          .single();
        if (full) {
          const f = full as Record<string, string | null>;
          setForm((prev) => ({
            ...prev,
            business_name: v.business_name ?? "",
            business_country: f.business_country ?? "RW",
            business_phone: f.business_phone ?? "",
            business_address: f.business_address ?? "",
            business_email: f.business_email ?? "",
            website: f.website ?? "",
            tax_id: f.tax_id ?? "",
            business_description: f.business_description ?? "",
          }));
        }
        // Load business_type and product_categories only if columns exist (migration 008/009)
        const { data: extra } = await supabase
          .from("vendors")
          .select("business_type, product_categories")
          .eq("id", v.id)
          .single();
        if (extra) {
          const ex = extra as Record<string, string | null>;
          setForm((prev) => ({ ...prev, business_type: ex.business_type ?? "", product_categories: ex.product_categories ?? "" }));
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function getProductCategoriesString(): string {
    const names = existingCategories
      .filter((c) => selectedCategorySlugs.has(c.slug))
      .map((c) => c.name);
    return [...names, ...otherCategories].join(", ");
  }

  function addOtherCategory() {
    const name = otherCategoryInput.trim();
    if (!name || otherCategories.includes(name)) return;
    setOtherCategories((prev) => [...prev, name]);
    setOtherCategoryInput("");
    setShowOtherInput(false);
  }

  function removeOtherCategory(name: string) {
    setOtherCategories((prev) => prev.filter((n) => n !== name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    let slug = slugify(form.business_name);
    const { data: existing } = await supabase.from("vendors").select("id").eq("business_slug", slug).neq("user_id", user.id).maybeSingle();
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
    const businessEmail = (form.business_email.trim() || (profile as { email?: string } | null)?.email) ?? null;

    const productCategoriesValue = getProductCategoriesString();

    // Insert follows public.vendors schema (requires migration 008 or 009 for business_type / product_categories)
    const payload: Record<string, unknown> = {
      user_id: user.id,
      business_name: form.business_name.trim(),
      business_slug: slug,
      business_description: form.business_description.trim() || null,
      business_email: businessEmail,
      business_phone: form.business_phone.trim() || null,
      business_address: form.business_address.trim() || null,
      business_country: form.business_country,
      website: form.website.trim() || null,
      tax_id: form.tax_id.trim() || null,
      verification_status: "pending",
      payout_method: "irembopay",
      payout_account: null,
      affiliate_enabled: true,
      affiliate_commission_rate: 10,
      is_active: true,
    };
    if (form.business_type.trim()) payload.business_type = form.business_type.trim();
    if (productCategoriesValue) payload.product_categories = productCategoriesValue;

    const { error } = await supabase.from("vendors").insert(payload);

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("user_roles").upsert(
      { user_id: user.id, role: "vendor", is_active: true },
      { onConflict: "user_id,role" }
    ).then(() => {});
    toast.success("Application submitted. We'll review it shortly.");
    router.refresh();
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center">
            <Store className="h-5 w-5 text-[var(--color-accent)] animate-pulse" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  const statusKey = (vendor?.verification_status === "verified" ? "approved" : vendor?.verification_status) as keyof typeof STATUS_CONFIG;
  const statusInfo = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-[var(--color-surface-secondary)] to-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5 rounded-full hover:bg-white/80">
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25">
                <Store className="h-5 w-5" />
              </span>
              Become a Vendor
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1.5 text-base">
              Start selling to global buyers. Fill in your business details in a few steps.
            </p>
          </div>
        </div>

        {vendor && (
          <>
            <Card className="border-[var(--color-border)] shadow-[var(--shadow-md)] rounded-2xl overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-2xl shrink-0",
                    statusKey === "approved" && "bg-[var(--color-success-light)] text-[var(--color-success)]",
                    statusKey === "rejected" && "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
                    statusKey === "pending" && "bg-[var(--color-warning-light)] text-[var(--color-warning)]"
                  )}>
                    <StatusIcon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-lg text-[var(--color-text-primary)]">{statusInfo.label}</p>
                    <p className="text-[var(--color-text-secondary)] font-medium">{vendor.business_name}</p>
                    {vendor.created_at && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Applied {new Date(vendor.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                    )}
                    {vendor.verification_notes && statusKey === "rejected" && (
                      <div className="mt-3 p-3 rounded-xl bg-[var(--color-danger-light)]/50 border border-[var(--color-danger)]/20">
                        <p className="text-sm font-medium text-[var(--color-danger)]">Reason</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{vendor.verification_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {statusKey === "pending" && (
                  <div className="mt-6 p-4 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">What happens next?</p>
                    <ul className="text-sm text-[var(--color-text-secondary)] space-y-1.5 list-disc list-inside">
                      <li>Our team will review your application within 1–2 business days.</li>
                      <li>You’ll get an email when your store is approved.</li>
                      <li>Once approved, you can add products and start selling.</li>
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild variant="default" className="rounded-xl gap-2" size="lg">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </Button>
                  {(statusKey === "approved" || statusKey === "verified") && (
                    <>
                      <Button asChild variant="outline" className="rounded-xl gap-2" size="lg">
                        <Link href="/dashboard/vendor/store">
                          <Store className="h-4 w-4" /> My Store
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-xl gap-2" size="lg">
                        <Link href="/dashboard/products/new">
                          <Package className="h-4 w-4" /> Add Product
                        </Link>
                      </Button>
                      {vendor.business_slug && (
                        <Button asChild variant="ghost" className="rounded-xl gap-2" size="lg">
                          <Link href={`/vendors/${vendor.business_slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> View store
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                  {statusKey === "rejected" && (
                    <Button asChild variant="outline" className="rounded-xl gap-2" size="lg">
                      <Link href={`mailto:${supportEmail}?subject=Vendor%20application%20review`}>
                        <Mail className="h-4 w-4" /> Contact support
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface-secondary)]/50">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Need help?</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      Questions about your application or selling on Jimvio?{" "}
                      <a href={`mailto:${supportEmail}`} className="text-[var(--color-accent)] hover:underline">Contact support</a>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!vendor && (
          <Card className="border-[var(--color-border)] shadow-[var(--shadow-md)] rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            {/* Step indicator — vertical on small, horizontal on larger */}
            <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50">
              <div className="flex items-center justify-between gap-2">
                {FORM_STEPS.map((s, i) => {
                  const StepIcon = s.icon;
                  const isActive = step === s.id;
                  const isDone = step > s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200",
                            isActive && "bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/30 scale-105",
                            isDone && "bg-[var(--color-success)] text-white",
                            !isActive && !isDone && "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                          )}
                        >
                          {isDone ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                        </div>
                        <span className={cn(
                          "text-xs font-medium text-center truncate w-full max-w-[80px] sm:max-w-none",
                          isActive ? "text-[var(--color-accent)]" : isDone ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
                        )}>
                          {s.title}
                        </span>
                      </div>
                      {i < FORM_STEPS.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 max-w-[24px] sm:max-w-[48px] rounded-full transition-colors",
                          isDone ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Business information */}
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="pb-2">
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[var(--color-accent)]" />
                        {FORM_STEPS[0].title}
                      </h2>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">{FORM_STEPS[0].subtitle}</p>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="business_name" className="text-[var(--color-text-secondary)] font-medium">Business name</Label>
                        <Input
                          id="business_name"
                          value={form.business_name}
                          onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                          placeholder="e.g. TechZone Rwanda"
                          className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          required
                        />
                        <p className="text-xs text-[var(--color-text-muted)]">Your store name as shown to buyers</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_type" className="text-[var(--color-text-secondary)] font-medium">Business type</Label>
                        <Input
                          id="business_type"
                          value={form.business_type}
                          onChange={(e) => setForm((f) => ({ ...f, business_type: e.target.value }))}
                          placeholder="e.g. Manufacturer, Wholesaler, Retailer"
                          className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product_categories_select" className="text-[var(--color-text-secondary)] font-medium">Product categories (optional)</Label>
                        <p className="text-xs text-[var(--color-text-muted)]">Choose from existing categories or add your own with &quot;Other +&quot;</p>
                        {existingCategories.length === 0 && !loading && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                            No categories loaded from database. Check that the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">product_categories</code> table exists and has rows (or RLS allows read). You can still add categories with &quot;Other +&quot; below.
                          </p>
                        )}
                        {existingCategories.length > 0 && (
                          <div className="relative mt-1" onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)] pointer-events-none z-10" />
                            <input
                              type="text"
                              value={categorySearch}
                              onChange={(e) => {
                                setCategorySearch(e.target.value);
                                setCategoryDropdownOpen(true);
                              }}
                              onFocus={() => setCategoryDropdownOpen(true)}
                              placeholder="Search or select category (optional). All + to add all."
                              className="w-full h-11 pl-9 pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                            />
                            {categorySearch && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setCategorySearch(""); setCategoryDropdownOpen(true); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] z-10"
                                aria-label="Clear search"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            {categoryDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-20 py-1">
                                {filteredCategories.length > 0 && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setSelectedCategorySlugs((prev) => {
                                        const next = new Set(prev);
                                        filteredCategories.forEach((c) => next.add(c.slug));
                                        return next;
                                      });
                                      setCategorySearch("");
                                      setCategoryDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] flex items-center gap-2"
                                  >
                                    <Plus className="h-4 w-4" /> All + ({filteredCategories.length} categories)
                                  </button>
                                )}
                                {filteredCategories.length === 0 && (
                                  <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No match — try another search</p>
                                )}
                                {filteredCategories.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setSelectedCategorySlugs((prev) => new Set(prev).add(c.slug));
                                      setCategorySearch("");
                                      setCategoryDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                                  >
                                    {c.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {existingCategories
                            .filter((c) => selectedCategorySlugs.has(c.slug))
                            .map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-[var(--color-accent)] text-white"
                              >
                                {c.name}
                                <button
                                  type="button"
                                  onClick={() => setSelectedCategorySlugs((prev) => { const n = new Set(prev); n.delete(c.slug); return n; })}
                                  className="p-0.5 rounded-full hover:bg-white/20"
                                  aria-label={`Remove ${c.name}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))}
                          {otherCategories.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]/30 text-[var(--color-accent)]"
                            >
                              {name}
                              <button
                                type="button"
                                onClick={() => removeOtherCategory(name)}
                                className="p-0.5 rounded-full hover:bg-[var(--color-accent)]/20"
                                aria-label={`Remove ${name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                          {showOtherInput ? (
                            <div className="inline-flex items-center gap-2 flex-wrap">
                              <Input
                                value={otherCategoryInput}
                                onChange={(e) => setOtherCategoryInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOtherCategory())}
                                placeholder="Category name"
                                className="h-8 w-32 rounded-lg text-sm"
                                autoFocus
                              />
                              <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" onClick={addOtherCategory}>
                                Add
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => { setShowOtherInput(false); setOtherCategoryInput(""); }}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowOtherInput(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                            >
                              <Plus className="h-4 w-4" /> Other +
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_description" className="text-[var(--color-text-secondary)] font-medium">Short description</Label>
                        <Textarea
                          id="business_description"
                          value={form.business_description}
                          onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
                          placeholder="Describe your business and what you sell..."
                          rows={4}
                          className="rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Contact & location */}
                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="pb-2">
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[var(--color-accent)]" />
                        {FORM_STEPS[1].title}
                      </h2>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">{FORM_STEPS[1].subtitle}</p>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="business_email" className="text-[var(--color-text-secondary)] font-medium">Business email</Label>
                        <Input
                          id="business_email"
                          type="email"
                          value={form.business_email}
                          onChange={(e) => setForm((f) => ({ ...f, business_email: e.target.value }))}
                          placeholder="store@yourcompany.com"
                          className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="business_country" className="text-[var(--color-text-secondary)] font-medium">Country</Label>
                          <select
                            id="business_country"
                            value={form.business_country}
                            onChange={(e) => setForm((f) => ({ ...f, business_country: e.target.value }))}
                            className="h-11 w-full px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          >
                            <option value="RW">Rwanda</option>
                            <option value="KE">Kenya</option>
                            <option value="UG">Uganda</option>
                            <option value="TZ">Tanzania</option>
                            <option value="NG">Nigeria</option>
                            <option value="ZA">South Africa</option>
                            <option value="US">United States</option>
                            <option value="GB">United Kingdom</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="business_phone" className="text-[var(--color-text-secondary)] font-medium">Phone</Label>
                          <Input
                            id="business_phone"
                            type="tel"
                            value={form.business_phone}
                            onChange={(e) => setForm((f) => ({ ...f, business_phone: e.target.value }))}
                            placeholder="+250 700 000 000"
                            className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business_address" className="text-[var(--color-text-secondary)] font-medium">Address</Label>
                        <Input
                          id="business_address"
                          value={form.business_address}
                          onChange={(e) => setForm((f) => ({ ...f, business_address: e.target.value }))}
                          placeholder="City, Street, Building"
                          className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-[var(--color-text-secondary)] font-medium">Website <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></Label>
                          <Input
                            id="website"
                            type="url"
                            value={form.website}
                            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                            placeholder="https://yourwebsite.com"
                            className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax_id" className="text-[var(--color-text-secondary)] font-medium">Tax ID <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></Label>
                          <Input
                            id="tax_id"
                            value={form.tax_id}
                            onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
                            placeholder="e.g. VAT number"
                            className="h-11 rounded-xl border-[var(--color-border)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & submit */}
                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="pb-2">
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-[var(--color-accent)]" />
                        {FORM_STEPS[2].title}
                      </h2>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">{FORM_STEPS[2].subtitle}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 overflow-hidden divide-y divide-[var(--color-border)]">
                      {(
                        [
                          { label: "Business name", value: form.business_name || "—" },
                          form.business_type ? { label: "Business type", value: form.business_type } : null,
                          getProductCategoriesString() ? { label: "Categories", value: getProductCategoriesString() } : null,
                          form.business_description ? { label: "Description", value: form.business_description } : null,
                          { label: "Email", value: form.business_email || "—" },
                          { label: "Country", value: form.business_country },
                          form.business_phone ? { label: "Phone", value: form.business_phone } : null,
                          form.business_address ? { label: "Address", value: form.business_address } : null,
                          form.website ? { label: "Website", value: form.website } : null,
                          form.tax_id ? { label: "Tax ID", value: form.tax_id } : null,
                        ].filter((r): r is { label: string; value: string } => r !== null)
                      ).map((row, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 sm:py-3.5">
                          <span className="text-sm font-medium text-[var(--color-text-muted)] sm:w-36 shrink-0">{row.label}</span>
                          <span className="text-sm text-[var(--color-text-primary)] break-words">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] rounded-xl bg-[var(--color-warning-light)]/50 border border-[var(--color-warning)]/20 px-3 py-2">
                      Your application will be reviewed by our team. You can start adding products after approval.
                    </p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-[var(--color-border)]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((s) => s - 1)}
                    disabled={step === 1 || submitting}
                    className="gap-2 rounded-xl border-[var(--color-border)]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        if (step === 1 && !form.business_name.trim()) {
                          toast.error("Business name is required");
                          return;
                        }
                        setStep((s) => s + 1);
                      }}
                      className="gap-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-md"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="gap-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-md"
                    >
                      <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
