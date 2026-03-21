"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Globe, Mail, Phone, MapPin, FileText,
  CheckCircle, ArrowRight, ArrowLeft, Store, Zap, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

const STEPS = [
  { id: 1, label: "Business Info",  icon: <Building2  className="h-4 w-4" /> },
  { id: 2, label: "Contact",        icon: <Mail       className="h-4 w-4" /> },
  { id: 3, label: "Commission",     icon: <Zap        className="h-4 w-4" /> },
  { id: 4, label: "Review",         icon: <CheckCircle className="h-4 w-4" /> },
];

export default function VendorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    business_name:        "",
    business_slug:        "",
    business_description: "",
    business_type:        "",
    product_categories:   "",
    business_email:       "",
    business_phone:       "",
    business_address:     "",
    business_country:     "RW",
    website:              "",
    tax_id:               "",
    payout_account:       "",
    payout_method:        "irembopay",
    affiliate_enabled:    true,
    affiliate_commission_rate: "10",
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // Check if vendor already exists
      const { data: existingVendor } = await supabase.from("vendors").select("id").eq("user_id", user.id).single();
      if (existingVendor) { router.push("/dashboard"); return; }

      // Pre-fill email from profile
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single();
      if (profile) {
        setForm(prev => ({
          ...prev,
          business_email: profile.email ?? "",
          business_name:  profile.full_name ? `${profile.full_name}'s Store` : "",
          business_slug:  profile.full_name ? slugify(`${profile.full_name} store`) : "",
        }));
      }
    };
    load();
  }, [router]);

  function updateField(field: string, value: string | boolean) {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "business_name") {
        updated.business_slug = slugify(value as string);
        setSlugAvailable(null);
      }
      return updated;
    });
  }

  async function checkSlug(slug: string) {
    if (!slug || slug.length < 3) return;
    setCheckingSlug(true);
    const supabase = createClient();
    const { data } = await supabase.from("vendors").select("id").eq("business_slug", slug).maybeSingle();
    setSlugAvailable(!data);
    setCheckingSlug(false);
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.business_name.trim() && form.business_slug.trim() && slugAvailable !== false);
    if (step === 2) return !!(form.business_email.trim());
    if (step === 3) return !!(form.payout_account.trim());
    return true;
  }

  async function submit() {
    if (!userId) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      // Create vendor record (follows public.vendors schema; rest use DB defaults)
      const { data: vendor, error: vendorErr } = await supabase.from("vendors").insert({
        user_id:                   userId,
        business_name:             form.business_name,
        business_slug:             form.business_slug,
        business_description:      form.business_description || null,
        business_type:             form.business_type || null,
        product_categories:        form.product_categories || null,
        business_email:            form.business_email,
        business_phone:            form.business_phone || null,
        business_address:          form.business_address || null,
        business_country:          form.business_country,
        website:                   form.website || null,
        tax_id:                    form.tax_id || null,
        payout_method:             form.payout_method,
        payout_account:            form.payout_account || null,
        affiliate_enabled:         form.affiliate_enabled,
        affiliate_commission_rate: parseFloat(form.affiliate_commission_rate) || 10,
        verification_status:       "pending",
        is_active:                 true,
      }).select().single();

      if (vendorErr) {
        setError(vendorErr.message);
        return;
      }

      // Add vendor role to user_roles
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "vendor", is_active: true },
        { onConflict: "user_id,role" }
      );

      router.push("/dashboard?welcome=vendor");
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-icon">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Store className="h-6 w-6 text-[var(--color-accent)]" />
            Set Up Your Vendor Store
          </h1>
          <p className="text-sm text-muted-c">Fill in your business details to start selling on Jimvio</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                step === s.id
                  ? "bg-[var(--color-accent)] text-white shadow-primary"
                  : step > s.id
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-subtle text-muted-c"
              }`}
            >
              {step > s.id ? <CheckCircle className="h-3.5 w-3.5" /> : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${step > s.id ? "bg-emerald-400" : "bg-border-base"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Business Information</h2>
            <p className="text-sm text-muted-c">Tell customers about your store</p>
          </div>
          <Input
            label="Business / Store Name *"
            placeholder="e.g. TechZone Rwanda"
            value={form.business_name}
            onChange={e => updateField("business_name", e.target.value)}
            required
          />
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Store URL (Slug) *</label>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-c bg-subtle border border-r-0 border-base px-3 h-10 flex items-center rounded-l-lg shrink-0">
                jimvio.com/vendors/
              </div>
              <input
                value={form.business_slug}
                onChange={e => { updateField("business_slug", e.target.value); setSlugAvailable(null); }}
                onBlur={e => checkSlug(e.target.value)}
                placeholder="your-store-name"
                className="flex-1 h-10 px-3 border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-muted-c focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] rounded-r-lg transition-all min-w-0"
              />
            </div>
            {checkingSlug && <p className="text-xs text-muted-c mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking availability...</p>}
            {slugAvailable === true  && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Available!</p>}
            {slugAvailable === false && <p className="text-xs text-red-500 mt-1">This slug is taken. Try another.</p>}
          </div>
          <Textarea
            label="Business Description"
            placeholder="Describe your store and what you sell..."
            value={form.business_description}
            onChange={e => updateField("business_description", e.target.value)}
            className="min-h-[100px]"
          />
          <Input
            label="Business Type (optional)"
            placeholder="e.g. Manufacturer, Wholesaler, Retailer"
            value={form.business_type}
            onChange={e => updateField("business_type", e.target.value)}
          />
          <Input
            label="Product Categories (optional)"
            placeholder="e.g. Electronics, Apparel, Home & Garden"
            value={form.product_categories}
            onChange={e => updateField("product_categories", e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Country</label>
            <select
              value={form.business_country}
              onChange={e => updateField("business_country", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all"
            >
              <option value="RW">🇷🇼 Rwanda</option>
              <option value="KE">🇰🇪 Kenya</option>
              <option value="UG">🇺🇬 Uganda</option>
              <option value="TZ">🇹🇿 Tanzania</option>
              <option value="NG">🇳🇬 Nigeria</option>
              <option value="GH">🇬🇭 Ghana</option>
              <option value="ZA">🇿🇦 South Africa</option>
              <option value="ET">🇪🇹 Ethiopia</option>
              <option value="US">🇺🇸 United States</option>
              <option value="GB">🇬🇧 United Kingdom</option>
              <option value="FR">🇫🇷 France</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 2: Contact */}
      {step === 2 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Contact & Location</h2>
            <p className="text-sm text-muted-c">How customers and Jimvio can reach you</p>
          </div>
          <Input
            label="Business Email *"
            type="email"
            placeholder="store@yourcompany.com"
            icon={<Mail className="h-4 w-4" />}
            value={form.business_email}
            onChange={e => updateField("business_email", e.target.value)}
            required
          />
          <Input
            label="Business Phone"
            type="tel"
            placeholder="+250 700 000 000"
            icon={<Phone className="h-4 w-4" />}
            value={form.business_phone}
            onChange={e => updateField("business_phone", e.target.value)}
          />
          <Input
            label="Business Address"
            placeholder="Kigali, Rwanda"
            icon={<MapPin className="h-4 w-4" />}
            value={form.business_address}
            onChange={e => updateField("business_address", e.target.value)}
          />
          <Input
            label="Website (optional)"
            type="url"
            placeholder="https://yourwebsite.com"
            icon={<Globe className="h-4 w-4" />}
            value={form.website}
            onChange={e => updateField("website", e.target.value)}
          />
          <Input
            label="Tax ID (optional)"
            placeholder="e.g. VAT number"
            icon={<FileText className="h-4 w-4" />}
            value={form.tax_id}
            onChange={e => updateField("tax_id", e.target.value)}
          />
        </div>
      )}

      {/* Step 3: Commission & Payouts */}
      {step === 3 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Payouts & Affiliate Settings</h2>
            <p className="text-sm text-muted-c">Configure how you get paid and how affiliates earn</p>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Payout Method</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "irembopay", label: "Irembopay",     icon: "💳", desc: "Fast mobile money payouts" },
                { value: "mtn",       label: "MTN MoMo",       icon: "📱", desc: "MTN Mobile Money" },
                { value: "airtel",    label: "Airtel Money",   icon: "📱", desc: "Airtel Money" },
                { value: "bank",      label: "Bank Transfer",  icon: "🏦", desc: "Direct bank transfer" },
              ].map(m => (
                <div
                  key={m.value}
                  onClick={() => updateField("payout_method", m.value)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    form.payout_method === m.value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
                      : "border-base hover:border-[var(--color-border-strong)] hover:bg-subtle"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">{m.label}</p>
                  <p className="text-xs text-muted-c">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Input
            label={`${form.payout_method === "bank" ? "Bank Account Number" : "Mobile Money Number"} *`}
            placeholder={form.payout_method === "bank" ? "1234567890" : "+250 700 000 000"}
            value={form.payout_account}
            onChange={e => updateField("payout_account", e.target.value)}
            required
          />

          <div className="h-px bg-border-base" />

          <div className="flex items-center justify-between p-3 bg-subtle rounded-lg border border-base">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Enable Affiliate Marketing</p>
              <p className="text-xs text-muted-c mt-0.5">Let affiliates earn commissions promoting your products</p>
            </div>
            <label className="cursor-pointer">
              <input type="checkbox" className="sr-only" checked={form.affiliate_enabled} onChange={e => updateField("affiliate_enabled", e.target.checked)} />
              <div className={`w-11 h-6 rounded-full transition-colors ${form.affiliate_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm m-1 transition-transform ${form.affiliate_enabled ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </label>
          </div>

          {form.affiliate_enabled && (
            <Input
              label="Default Affiliate Commission Rate (%)"
              type="number"
              min="1" max="90"
              placeholder="10"
              value={form.affiliate_commission_rate}
              onChange={e => updateField("affiliate_commission_rate", e.target.value)}
              hint="Default commission rate for affiliates promoting your products (can be set per-product)"
            />
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Review Your Store</h2>
            <p className="text-sm text-muted-c">Confirm your details before going live</p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Store Name",     value: form.business_name,   icon: <Building2 className="h-4 w-4" /> },
              { label: "Store URL",      value: `jimvio.com/vendors/${form.business_slug}`, icon: <Globe className="h-4 w-4" /> },
              ...(form.business_type ? [{ label: "Business Type", value: form.business_type, icon: <Building2 className="h-4 w-4" /> }] : []),
              ...(form.product_categories ? [{ label: "Categories", value: form.product_categories, icon: <FileText className="h-4 w-4" /> }] : []),
              { label: "Business Email", value: form.business_email,   icon: <Mail className="h-4 w-4" /> },
              { label: "Phone",          value: form.business_phone || "Not provided", icon: <Phone className="h-4 w-4" /> },
              { label: "Country",        value: form.business_country, icon: <MapPin className="h-4 w-4" /> },
              ...(form.tax_id ? [{ label: "Tax ID", value: form.tax_id, icon: <FileText className="h-4 w-4" /> }] : []),
              { label: "Payout",         value: `${form.payout_method} — ${form.payout_account}`, icon: <FileText className="h-4 w-4" /> },
              { label: "Affiliate",      value: form.affiliate_enabled ? `Enabled (${form.affiliate_commission_rate}% default)` : "Disabled", icon: <Zap className="h-4 w-4" /> },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-subtle rounded-lg">
                <div className="p-1.5 rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-c">{item.label}</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {form.business_description && (
            <div className="p-3 bg-subtle rounded-lg border border-base">
              <p className="text-xs text-muted-c mb-1">Description</p>
              <p className="text-sm text-[var(--color-text-primary)]">{form.business_description}</p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your store will be created and pending verification. You can start adding products immediately. Full visibility comes after admin approval.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 1 || isPending}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => { if (step === 1 && !slugAvailable) { checkSlug(form.business_slug).then(() => setStep(s => s + 1)); } else { setStep(s => s + 1); } }}
            disabled={!canProceed()}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} loading={isPending} size="lg">
            <Store className="h-4 w-4" /> Launch My Store!
          </Button>
        )}
      </div>
    </div>
  );
}
