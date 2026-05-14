"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
   Store, Building2, Globe, Phone, MapPin, FileText, Send,
   CheckCircle, XCircle, Clock, ArrowLeft, ArrowRight, Plus,
   X, Search, Package, LayoutDashboard, Mail, Calendar,
   ChevronRight, ShieldCheck, Loader2, AlertCircle, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function slugify(text: string) {
   return text.toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
}

const STATUS_CONFIG = {
   pending: { label: "Under Review", icon: Clock, bg: "rgba(240,180,41,0.08)", border: "rgba(240,180,41,0.25)", text: "#b45309", dot: "#f0b429" },
   approved: { label: "Application Approved", icon: CheckCircle, bg: "rgba(48,164,108,0.08)", border: "rgba(48,164,108,0.25)", text: "#166534", dot: "#30a46c" },
   rejected: { label: "Application Declined", icon: XCircle, bg: "rgba(229,72,77,0.08)", border: "rgba(229,72,77,0.25)", text: "#991b1b", dot: "#e5484d" },
   verified: { label: "Application Approved", icon: CheckCircle, bg: "rgba(48,164,108,0.08)", border: "rgba(48,164,108,0.25)", text: "#166534", dot: "#30a46c" },
};

const FORM_STEPS = [
   { id: 1, title: "Business", desc: "Name & categories", icon: Building2 },
   { id: 2, title: "Contact", desc: "Location & reach", icon: MapPin },
   { id: 3, title: "Review", desc: "Confirm & submit", icon: CheckCircle },
] as const;

type ProductCategoryRow = { id: string; name: string; slug: string; sort_order?: number };

export default function ActivateVendorPage() {
   const router = useRouter();
   const { fetchRoles } = useUserStore();

   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const [step, setStep] = useState(1);
   const [vendor, setVendor] = useState<{
      id: string; verification_status: string; business_name: string;
      business_slug?: string | null; verification_notes?: string | null; created_at?: string | null;
   } | null>(null);

   const [form, setForm] = useState({
      business_name: "", business_type: "", business_country: "RW",
      business_phone: "", business_address: "", business_email: "",
      website: "", tax_id: "", product_categories: "", business_description: "",
   });

   const [existingCategories, setExistingCategories] = useState<ProductCategoryRow[]>([]);
   const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
   const [otherCategories, setOtherCategories] = useState<string[]>([]);
   const [otherCategoryInput, setOtherCategoryInput] = useState("");
   const [categorySearch, setCategorySearch] = useState("");
   const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
   const [supportEmail, setSupportEmail] = useState("support@jimvio.com");

   const filteredCategories = existingCategories.filter(c =>
      !categorySearch.trim() ||
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
   );

   useEffect(() => {
      (async () => {
         const supabase = createClient();
         const { data } = await supabase.from("platform_settings").select("value").eq("key", "contact").maybeSingle();
         const em = (data?.value as { support_email?: string } | null)?.support_email;
         if (em?.includes("@")) setSupportEmail(em);
      })();
   }, []);

   useEffect(() => {
      (async () => {
         const supabase = createClient();
         const { data } = await supabase.from("product_categories").select("id, name, slug, sort_order");
         const list = (data ?? []).map((c: { sort_order: number | null;[key: string]: unknown }) => ({
            ...c, sort_order: c.sort_order ?? 0
         })).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
         setExistingCategories(list as ProductCategoryRow[]);
      })();
   }, []);

   useEffect(() => {
      async function load() {
         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) { router.push("/login"); return; }

         const { data: v } = await supabase
            .from("vendors")
            .select("id, business_name, business_slug, verification_status, verification_notes, created_at")
            .eq("user_id", user.id).maybeSingle();
         setVendor(v ?? null);

         if (v) {
            const { data: full } = await supabase
               .from("vendors")
               .select("business_phone, business_address, business_country, business_description, business_email, website, tax_id, business_type, product_categories")
               .eq("id", v.id).maybeSingle();
            if (full) {
               const f = full as Record<string, string | null>;
               setForm(prev => ({
                  ...prev,
                  business_name: v.business_name ?? "",
                  business_country: f.business_country ?? "RW",
                  business_phone: f.business_phone ?? "",
                  business_address: f.business_address ?? "",
                  business_email: f.business_email ?? "",
                  website: f.website ?? "",
                  tax_id: f.tax_id ?? "",
                  business_description: f.business_description ?? "",
                  business_type: f.business_type ?? "",
                  product_categories: f.product_categories ?? "",
               }));
            }
         }
         setLoading(false);
      }
      load();
   }, [router]);

   function getProductCategoriesString(): string {
      const names = existingCategories.filter(c => selectedCategorySlugs.has(c.slug)).map(c => c.name);
      return [...names, ...otherCategories].join(", ");
   }

   function addOtherCategory() {
      const name = otherCategoryInput.trim();
      if (!name || otherCategories.includes(name)) return;
      setOtherCategories(prev => [...prev, name]);
      setOtherCategoryInput("");
   }

   function removeCategory(slug: string) {
      setSelectedCategorySlugs(prev => { const n = new Set(prev); n.delete(slug); return n; });
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!form.business_name.trim()) { toast.error("Business name is required"); return; }
      setSubmitting(true);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSubmitting(false); return; }

      let slug = slugify(form.business_name);
      const { data: existing } = await supabase.from("vendors").select("id").eq("business_slug", slug).neq("user_id", user.id).maybeSingle();
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;

      const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
      const businessEmail = (form.business_email.trim() || (profile as { email?: string } | null)?.email) ?? null;
      const productCategoriesValue = getProductCategoriesString();

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
         payout_method: "mtn", payout_account: null,
         affiliate_enabled: true, affiliate_commission_rate: 10, is_active: true,
      };
      if (form.business_type.trim()) payload.business_type = form.business_type.trim();
      if (productCategoriesValue) payload.product_categories = productCategoriesValue;

      const { error } = await supabase.from("vendors").insert(payload);
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }

      await supabase.from("user_roles").upsert(
         { user_id: user.id, role: "vendor", is_active: true },
         { onConflict: "user_id,role" }
      );
      await fetchRoles();
      toast.success("Application submitted successfully.");
      router.refresh();
      router.push("/dashboard");
   }

   /* ── Loading ── */
   if (loading) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
         <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-accent)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
         </div>
      </div>
   );

   /* ── Field helper ── */
   const fieldClass = cn(
      "w-full h-11 px-4 rounded-xl border text-sm font-medium outline-none transition-all duration-150",
      "bg-[var(--color-surface)] border-[var(--color-border)]",
      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
      "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
   );

   const labelClass = "block text-[10px] font-semibold uppercase tracking-wider mb-1.5";

   /* ── Status view ── */
   if (vendor) {
      const statusKey = (vendor.verification_status === "verified" ? "approved" : vendor.verification_status) as keyof typeof STATUS_CONFIG;
      const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
      const StatusIcon = cfg.icon;
      const isApproved = statusKey === "approved" || statusKey === "verified";
      const isRejected = statusKey === "rejected";
      const isPending = statusKey === "pending";

      return (
         <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
            <div className="max-w-lg mx-auto px-4 sm:px-6 pt-10 sm:pt-16">

               <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 mb-10 text-xs font-semibold"
                  style={{ color: "var(--color-text-muted)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
               >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
               </Link>

               {/* Status card */}
               <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
               >
                  {/* Header band */}
                  <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)", background: cfg.bg }}>
                     <div className="flex items-center gap-4">
                        <div
                           className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                           style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                        >
                           <StatusIcon className="h-5 w-5" style={{ color: cfg.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold leading-none" style={{ color: "var(--color-text-primary)" }}>
                              {cfg.label}
                           </p>
                           <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                              {vendor.business_name}
                           </p>
                        </div>
                        {vendor.created_at && (
                           <p className="text-[10px] font-medium shrink-0 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                              {new Date(vendor.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                           </p>
                        )}
                     </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-5">

                     {/* Rejection note */}
                     {isRejected && vendor.verification_notes && (
                        <div
                           className="p-4 rounded-xl"
                           style={{ background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.2)" }}
                        >
                           <div className="flex items-start gap-2.5">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
                              <div>
                                 <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-danger)" }}>
                                    Review feedback
                                 </p>
                                 <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                                    {vendor.verification_notes}
                                 </p>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Pending steps */}
                     {isPending && (
                        <div className="space-y-2">
                           <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                              What happens next
                           </p>
                           {[
                              { icon: ShieldCheck, label: "Identity & business check", desc: "We verify your details" },
                              { icon: CheckCircle, label: "Manual review", desc: "Our team reviews your application" },
                              { icon: Store, label: "Store goes live", desc: "Start listing products immediately" },
                           ].map(({ icon: Icon, label, desc }, i) => (
                              <div
                                 key={i}
                                 className="flex items-center gap-3.5 p-3.5 rounded-xl"
                                 style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
                              >
                                 <div
                                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
                                 >
                                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-none" style={{ color: "var(--color-text-primary)" }}>
                                       {label}
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
                                 </div>
                              </div>
                           ))}
                           <div
                              className="flex items-center gap-2.5 px-4 py-3 rounded-xl mt-3"
                              style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)" }}
                           >
                              <Info className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                 Reviews typically complete within 24–48 hours.
                              </p>
                           </div>
                        </div>
                     )}

                     {/* Approved quick actions */}
                     {isApproved && (
                        <div className="grid grid-cols-2 gap-2">
                           {[
                              { href: "/dashboard/vendor/store", icon: Store, label: "My Store" },
                              { href: "/dashboard/products/new", icon: Plus, label: "New Product" },
                              { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
                              { href: `/marketplace/${vendor.business_slug}`, icon: Globe, label: "Public Page" },
                           ].map(({ href, icon: Icon, label }) => (
                              <Link
                                 key={href}
                                 href={href}
                                 className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all"
                                 style={{
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface-secondary)",
                                    color: "var(--color-text-primary)",
                                 }}
                                 onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                                 onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                              >
                                 <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                                 {label}
                              </Link>
                           ))}
                        </div>
                     )}

                     {/* CTA */}
                     <div className="flex gap-2 pt-1">
                        <Link
                           href="/dashboard"
                           className="flex-1 h-10 flex items-center justify-center rounded-xl text-xs font-semibold transition-all"
                           style={{
                              background: "var(--color-accent)", color: "#fff",
                              boxShadow: "0 4px 14px rgba(253,80,0,0.25)",
                           }}
                           onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                           onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}
                        >
                           <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Dashboard
                        </Link>
                        {isRejected && (
                           <Link
                              href={`mailto:${supportEmail}`}
                              className="flex-1 h-10 flex items-center justify-center rounded-xl text-xs font-semibold transition-all"
                              style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-primary)" }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
                           >
                              <Mail className="h-3.5 w-3.5 mr-2" style={{ color: "var(--color-danger)" }} /> Contact Support
                           </Link>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   }

   /* ── Application form ── */
   return (
      <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
         <div className="max-w-lg mx-auto px-4 sm:px-6 pt-10 sm:pt-16">

            {/* Back */}
            <Link
               href="/dashboard"
               className="inline-flex items-center gap-2 mb-10 text-xs font-semibold"
               style={{ color: "var(--color-text-muted)" }}
               onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
               onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
               <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>

            {/* Header */}
            <div className="mb-8">
               <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)" }}
               >
                  <Store className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
               </div>
               <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
                  Open Your Store
               </h1>
               <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Complete a quick 3-step application to start selling on Jimvio. Reviews typically take 24–48 hours.
               </p>
            </div>

            {/* Card */}
            <div
               className="rounded-xl overflow-hidden"
               style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
            >
               {/* Step bar */}
               <div
                  className="px-6 py-4"
                  style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-secondary)" }}
               >
                  <div className="flex items-center gap-0">
                     {FORM_STEPS.map((s, i) => {
                        const isActive = step === s.id;
                        const isDone = step > s.id;
                        return (
                           <React.Fragment key={s.id}>
                              <div className="flex items-center gap-2.5 shrink-0">
                                 <div
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                                    style={{
                                       background: isDone
                                          ? "var(--color-success)"
                                          : isActive
                                             ? "var(--color-accent)"
                                             : "var(--color-surface)",
                                       border: isDone || isActive
                                          ? "none"
                                          : "1px solid var(--color-border)",
                                       color: isDone || isActive ? "#fff" : "var(--color-text-muted)",
                                    }}
                                 >
                                    {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : s.id}
                                 </div>
                                 <div className="hidden sm:block">
                                    <p
                                       className="text-xs font-semibold leading-none"
                                       style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
                                    >
                                       {s.title}
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{s.desc}</p>
                                 </div>
                              </div>
                              {i < FORM_STEPS.length - 1 && (
                                 <div className="flex-1 h-px mx-3 transition-all duration-500"
                                    style={{ background: step > s.id ? "var(--color-success)" : "var(--color-border)" }}
                                 />
                              )}
                           </React.Fragment>
                        );
                     })}
                  </div>
               </div>

               {/* Form */}
               <form onSubmit={handleSubmit}>
                  <div className="p-5 sm:p-6 space-y-5">

                     {/* Step 1 */}
                     {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                           <div>
                              <p className="text-sm font-bold mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                                 Business Information
                              </p>
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                 Tell us the basics about your store
                              </p>
                           </div>

                           <div className="space-y-4">
                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
                                    Store Name <span style={{ color: "var(--color-accent)" }}>*</span>
                                 </label>
                                 <input
                                    value={form.business_name}
                                    onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                                    placeholder="e.g. Kigali Electronics"
                                    required
                                    className={fieldClass}
                                 />
                              </div>

                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
                                    Store Type
                                 </label>
                                 <input
                                    value={form.business_type}
                                    onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                                    placeholder="e.g. Retailer, Wholesaler, Brand"
                                    className={fieldClass}
                                 />
                              </div>

                              {/* Category picker */}
                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
                                    Product Categories
                                 </label>
                                 <div className="relative" onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}>
                                    <Search
                                       className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                                       style={{ color: "var(--color-text-muted)" }}
                                    />
                                    <input
                                       value={categorySearch}
                                       onChange={e => { setCategorySearch(e.target.value); setCategoryDropdownOpen(true); }}
                                       onFocus={() => setCategoryDropdownOpen(true)}
                                       placeholder="Search and select categories…"
                                       className={cn(fieldClass, "pl-9")}
                                    />
                                    {categoryDropdownOpen && filteredCategories.length > 0 && (
                                       <div
                                          className="absolute top-full left-0 right-0 mt-1.5 max-h-52 overflow-auto rounded-xl z-50 p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150"
                                          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                                       >
                                          {filteredCategories.map(c => (
                                             <button
                                                key={c.id}
                                                type="button"
                                                onMouseDown={e => e.preventDefault()}
                                                onClick={() => { setSelectedCategorySlugs(prev => new Set(prev).add(c.slug)); setCategorySearch(""); setCategoryDropdownOpen(false); }}
                                                className="w-full px-3 py-2.5 text-left text-xs font-medium rounded-lg flex items-center justify-between transition-colors"
                                                style={{
                                                   background: selectedCategorySlugs.has(c.slug) ? "var(--color-accent-light)" : "transparent",
                                                   color: selectedCategorySlugs.has(c.slug) ? "var(--color-accent)" : "var(--color-text-primary)",
                                                }}
                                                onMouseEnter={e => { if (!selectedCategorySlugs.has(c.slug)) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-secondary)"; }}
                                                onMouseLeave={e => { if (!selectedCategorySlugs.has(c.slug)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                             >
                                                {c.name}
                                                {selectedCategorySlugs.has(c.slug) && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                                             </button>
                                          ))}
                                       </div>
                                    )}
                                 </div>

                                 {/* Selected tags */}
                                 {(selectedCategorySlugs.size > 0 || otherCategories.length > 0) && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                       {[...selectedCategorySlugs].map(slug => {
                                          const cat = existingCategories.find(c => c.slug === slug);
                                          return (
                                             <span
                                                key={slug}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                                style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent-subtle)", color: "var(--color-accent)" }}
                                             >
                                                {cat?.name || slug}
                                                <button type="button" onClick={() => removeCategory(slug)}>
                                                   <X className="h-3 w-3" />
                                                </button>
                                             </span>
                                          );
                                       })}
                                       {otherCategories.map(name => (
                                          <span
                                             key={name}
                                             className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                                             style={{ background: "var(--color-surface-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                                          >
                                             {name}
                                             <button type="button" onClick={() => setOtherCategories(p => p.filter(n => n !== name))}>
                                                <X className="h-3 w-3" />
                                             </button>
                                          </span>
                                       ))}
                                    </div>
                                 )}

                                 {/* Custom category */}
                                 <div className="flex gap-2 mt-2">
                                    <input
                                       value={otherCategoryInput}
                                       onChange={e => setOtherCategoryInput(e.target.value)}
                                       onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOtherCategory(); } }}
                                       placeholder="Add custom category…"
                                       className={cn(fieldClass, "flex-1 h-9 text-xs")}
                                    />
                                    <button
                                       type="button"
                                       onClick={addOtherCategory}
                                       disabled={!otherCategoryInput.trim()}
                                       className="h-9 px-3 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                                       style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
                                    >
                                       <Plus className="h-3.5 w-3.5" />
                                    </button>
                                 </div>
                              </div>

                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
                                    What will you sell?
                                 </label>
                                 <textarea
                                    value={form.business_description}
                                    onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))}
                                    placeholder="Briefly describe your products or services…"
                                    rows={3}
                                    className={cn(fieldClass, "h-auto py-3 resize-none")}
                                 />
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Step 2 */}
                     {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                           <div>
                              <p className="text-sm font-bold mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                                 Contact Information
                              </p>
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                 How customers and Jimvio can reach you
                              </p>
                           </div>

                           <div className="space-y-4">
                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>Support Email</label>
                                 <input
                                    type="email"
                                    value={form.business_email}
                                    onChange={e => setForm(f => ({ ...f, business_email: e.target.value }))}
                                    placeholder="support@yourstore.com"
                                    className={fieldClass}
                                 />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                 <div>
                                    <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>Country</label>
                                    <select
                                       value={form.business_country}
                                       onChange={e => setForm(f => ({ ...f, business_country: e.target.value }))}
                                       className={fieldClass}
                                       style={{ appearance: "none" }}
                                    >
                                       {[["RW", "Rwanda"], ["KE", "Kenya"], ["UG", "Uganda"], ["TZ", "Tanzania"], ["US", "USA"]].map(([v, l]) => (
                                          <option key={v} value={v}>{l}</option>
                                       ))}
                                    </select>
                                 </div>
                                 <div>
                                    <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>Phone</label>
                                    <input
                                       value={form.business_phone}
                                       onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))}
                                       placeholder="+250 7xx xxx xxx"
                                       className={fieldClass}
                                    />
                                 </div>
                              </div>

                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>Address</label>
                                 <input
                                    value={form.business_address}
                                    onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))}
                                    placeholder="City, District, Street"
                                    className={fieldClass}
                                 />
                              </div>

                              <div>
                                 <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>Website <span className="normal-case font-normal">(optional)</span></label>
                                 <input
                                    value={form.website}
                                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                                    placeholder="https://yourstore.com"
                                    className={fieldClass}
                                 />
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Step 3 */}
                     {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                           <div>
                              <p className="text-sm font-bold mb-0.5" style={{ color: "var(--color-text-primary)" }}>Review & Submit</p>
                              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Confirm your details before submitting</p>
                           </div>

                           <div
                              // divideColor: "var(--color-border)"
                              className="rounded-xl overflow-hidden divide-y"
                              style={{ border: "1px solid var(--color-border)", }}
                           >
                              {[
                                 { label: "Store Name", value: form.business_name || "—" },
                                 { label: "Store Type", value: form.business_type || "—" },
                                 { label: "Country", value: form.business_country || "—" },
                                 { label: "Phone", value: form.business_phone || "—" },
                                 { label: "Email", value: form.business_email || "—" },
                                 { label: "Categories", value: getProductCategoriesString() || "—" },
                              ].map(({ label, value }) => (
                                 <div
                                    key={label}
                                    className="flex items-center justify-between px-4 py-3"
                                    style={{ borderColor: "var(--color-border)" }}
                                 >
                                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                       {label}
                                    </span>
                                    <span className="text-xs font-medium text-right max-w-[60%] truncate" style={{ color: "var(--color-text-primary)" }}>
                                       {value}
                                    </span>
                                 </div>
                              ))}
                           </div>

                           <div
                              className="flex items-start gap-2.5 p-4 rounded-xl"
                              style={{ background: "rgba(48,164,108,0.06)", border: "1px solid rgba(48,164,108,0.2)" }}
                           >
                              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
                              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                                 By submitting you agree to Jimvio's Vendor Terms. We'll review your application and respond within 24–48 hours.
                              </p>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Footer nav */}
                  <div
                     className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4"
                     style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                     <button
                        type="button"
                        onClick={() => setStep(s => s - 1)}
                        disabled={step === 1 || submitting}
                        className="h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30"
                        style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-secondary)", color: "var(--color-text-muted)" }}
                     >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                     </button>

                     {step < 3 ? (
                        <button
                           type="button"
                           onClick={() => {
                              if (step === 1 && !form.business_name.trim()) { toast.error("Please enter a business name"); return; }
                              setStep(s => s + 1);
                           }}
                           className="h-10 px-6 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                           style={{ background: "var(--color-text-primary)", color: "var(--color-bg)" }}
                        >
                           Continue <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                     ) : (
                        <button
                           type="submit"
                           disabled={submitting}
                           className="h-10 px-6 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-70"
                           style={{
                              background: "var(--color-accent)", color: "#fff",
                              boxShadow: "0 4px 14px rgba(253,80,0,0.25)",
                           }}
                           onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "var(--color-accent-hover)"; }}
                           onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = "var(--color-accent)"; }}
                        >
                           {submitting
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                              : <><Send className="h-3.5 w-3.5" /> Submit Application</>
                           }
                        </button>
                     )}
                  </div>
               </form>
            </div>
         </div>
      </div>
   );
}