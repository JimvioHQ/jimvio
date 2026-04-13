"use client";
export const dynamic = "force-dynamic";

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
  Sparkles,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Activity,
  Zap,
  Target,
  Rocket,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/use-user-store";
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
  pending: { label: "Pending Review", variant: "warning", icon: Clock, color: "text-amber-500" },
  approved: { label: "Account Approved", variant: "success", icon: CheckCircle, color: "text-emerald-500" },
  rejected: { label: "Application Declined", variant: "destructive", icon: XCircle, color: "text-rose-500" },
  verified: { label: "Account Approved", variant: "success", icon: CheckCircle, color: "text-emerald-500" },
};

const FORM_STEPS = [
  { id: 1, title: "About Business", subtitle: "Name & categories", icon: Building2 },
  { id: 2, title: "Contact Details", subtitle: "Where you handle sales", icon: MapPin },
  { id: 3, title: "Final Review", subtitle: "Check information", icon: CheckCircle },
] as const;

export default function ActivateVendorPage() {
  const router = useRouter();
  const { fetchRoles } = useUserStore();
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

  type ProductCategoryRow = { id: string; name: string; slug: string; sort_order?: number };
  const [existingCategories, setExistingCategories] = useState<ProductCategoryRow[]>([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(new Set());
  const [otherCategories, setOtherCategories] = useState<string[]>([]);
  const [otherCategoryInput, setOtherCategoryInput] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState("support@jimvio.com");

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

  useEffect(() => {
    async function fetchCategories() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, slug, sort_order");
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
        const { data: full } = await supabase
          .from("vendors")
          .select("business_phone, business_address, business_country, business_description, business_email, website, tax_id, business_type, product_categories")
          .eq("id", v.id)
          .maybeSingle();
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
      payout_method: "mtn",
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
    await fetchRoles();
    toast.success("Application submitted successfully.");
    router.refresh();
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">Starting Application...</p>
      </div>
    );
  }

  const statusKey = (vendor?.verification_status === "verified" ? "approved" : vendor?.verification_status) as keyof typeof STATUS_CONFIG;
  const statusInfo = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
         background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-[700px] mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col items-center text-center space-y-4">
           <Button asChild variant="ghost" className="rounded-full bg-white border border-stone-100 shadow-sm hover:bg-stone-50 active:scale-95 transition-all h-10 px-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                 <ArrowLeft className="h-4 w-4 text-stone-400" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Back</span>
              </Link>
           </Button>
           
           <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white border border-stone-50 shadow-sm flex items-center justify-center mx-auto relative group overflow-hidden">
                 <Store className="h-7 w-7 text-stone-900 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Vendor Activation</h1>
              <p className="text-stone-500 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                 Start selling your products globally by completing your vendor profile.
              </p>
           </div>
        </div>

        {vendor ? (
          <div className="space-y-8">
             <GlassCard className="p-8 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                   <div className="md:col-span-4 flex justify-center">
                      <div className={cn(
                        "w-24 h-24 rounded-[32px] flex items-center justify-center shrink-0 border-2 border-white shadow-xl transition-all duration-700",
                        statusKey === "approved" && "bg-emerald-50 text-emerald-500",
                        statusKey === "rejected" && "bg-rose-50 text-rose-500",
                        statusKey === "pending" && "bg-amber-50 text-amber-500"
                      )}>
                        <StatusIcon className="h-10 w-10 animate-in zoom-in spin-in-12 duration-1000" />
                      </div>
                   </div>
                   
                   <div className="md:col-span-8 space-y-4">
                      <div className="space-y-1 text-center md:text-left">
                         <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <h2 className="text-xl font-bold text-stone-900 tracking-tight">{statusInfo.label}</h2>
                            <GlassPill color={statusKey === "approved" ? "emerald" : statusKey === "rejected" ? "rose" : "orange"} className="w-fit mx-auto md:mx-0 px-4 py-1 text-[9px] font-bold border-none shadow-none">
                               {statusKey.toUpperCase()}
                            </GlassPill>
                         </div>
                         <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">{vendor.business_name}</p>
                      </div>

                      {vendor.created_at && (
                        <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                           <Calendar className="h-3.5 w-3.5" /> Applied: {new Date(vendor.created_at).toLocaleDateString()}
                        </div>
                      )}
                   </div>
                </div>

                {vendor.verification_notes && statusKey === "rejected" && (
                   <div className="mt-8 p-6 rounded-2xl bg-rose-50/50 border border-rose-100">
                      <div className="flex items-center gap-3 mb-2 text-rose-500">
                         <XCircle className="h-4 w-4" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Review Comments</span>
                      </div>
                      <p className="text-sm font-medium text-stone-600 leading-relaxed pl-7">{vendor.verification_notes}</p>
                   </div>
                )}

                {statusKey === "pending" && (
                   <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { icon: <ShieldCheck className="h-5 w-5" />, label: "Security Check" },
                        { icon: <Activity className="h-5 w-5" />, label: "Approval" },
                        { icon: <Rocket className="h-5 w-5" />, label: "Live Deployment" },
                      ].map((step, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-white/40 border border-white shadow-sm flex flex-col items-center gap-3 text-center">
                           <div className="w-10 h-10 rounded-xl bg-white border border-stone-50 flex items-center justify-center text-orange-500 shadow-sm">
                              {step.icon}
                           </div>
                           <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{step.label}</span>
                        </div>
                      ))}
                   </div>
                )}

                <div className="mt-10 pt-8 border-t border-stone-100 flex flex-wrap items-center justify-center md:justify-start gap-3">
                   <Button asChild className="h-12 px-8 rounded-xl bg-stone-900 text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black active:scale-95 transition-all border-none">
                      <Link href="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</Link>
                   </Button>
                   
                   {(statusKey === "approved" || statusKey === "verified") && (
                     <>
                        <Button asChild variant="outline" className="h-12 px-8 rounded-xl border-stone-100 text-stone-900 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                           <Link href="/dashboard/vendor/store"><Store className="h-4 w-4 mr-2" /> My Store</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-12 px-8 rounded-xl border-stone-100 text-stone-900 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                           <Link href="/dashboard/products/new"><Plus className="h-4 w-4 mr-2 text-orange-500" /> New Product</Link>
                        </Button>
                     </>
                   )}
                   
                   {statusKey === "rejected" && (
                     <Button asChild variant="outline" className="h-12 px-8 rounded-xl border-stone-100 text-stone-900 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                        <Link href={`mailto:${supportEmail}`}>
                          <Mail className="h-4 w-4 mr-2 text-rose-500" /> Contact Us
                        </Link>
                     </Button>
                   )}
                </div>
             </GlassCard>
          </div>
        ) : (
          <GlassCard className="p-0 rounded-[32px] border-white bg-white/60 shadow-sm overflow-hidden">
             
             {/* Simple Step Bar */}
             <div className="p-8 border-b border-stone-100 bg-white/40 backdrop-blur-2xl">
                <div className="flex items-center justify-between max-w-sm mx-auto relative px-4">
                   {FORM_STEPS.map((s, i) => {
                      const isActive = step === s.id;
                      const isDone = step > s.id;
                      return (
                         <div key={s.id} className="flex flex-col items-center gap-3 relative z-10 basis-1/3">
                            <div className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-700 border-4 border-white shadow-md relative",
                               isActive && "bg-stone-900 text-white scale-110",
                               isDone && "bg-emerald-500 text-white",
                               !isActive && !isDone && "bg-white text-stone-200"
                            )}>
                               {isDone ? <CheckCircle className="h-5 w-5" /> : <span>{s.id}</span>}
                            </div>
                            <p className={cn("text-[9px] font-bold uppercase tracking-widest text-center", isActive ? "text-stone-900" : "text-stone-300")}>{s.title}</p>
                         </div>
                      );
                   })}
                   <div className="absolute top-6 left-0 right-0 h-1 bg-stone-100 -z-0 rounded-full mx-10 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${((step - 1) / (FORM_STEPS.length - 1)) * 100}%` }} />
                   </div>
                </div>
             </div>

             <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8">
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-stone-900 tracking-tight">Business Information</h3>
                        <p className="text-[12px] font-medium text-stone-400">Basic details about your store and products</p>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Store Name</Label>
                           <Input
                             value={form.business_name}
                             onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                             placeholder="Your Business Name"
                             className="h-12 rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-base font-bold px-5 transition-all"
                             required
                           />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Store Type</Label>
                              <Input
                                value={form.business_type}
                                onChange={(e) => setForm((f) => ({ ...f, business_type: e.target.value }))}
                                placeholder="Retail, Wholesaler, etc."
                                className="h-12 rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-sm font-bold px-5 transition-all"
                              />
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Categories</Label>
                              <div className="relative" onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 200)}>
                                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-200 pointer-events-none" />
                                 <input
                                   value={categorySearch}
                                   onChange={(e) => { setCategorySearch(e.target.value); setCategoryDropdownOpen(true); }}
                                   onFocus={() => setCategoryDropdownOpen(true)}
                                   placeholder="Search categories..."
                                   className="w-full h-12 pl-12 pr-6 rounded-xl border border-stone-100 bg-white shadow-sm text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all placeholder:text-stone-100"
                                 />
                                 {categoryDropdownOpen && (
                                   <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-auto rounded-xl border border-stone-100 bg-white shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                      {filteredCategories.map((c) => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => { setSelectedCategorySlugs((prev) => new Set(prev).add(c.slug)); setCategorySearch(""); setCategoryDropdownOpen(false); }}
                                          className={cn("w-full px-4 py-2.5 text-left text-xs font-bold rounded-lg transition-all flex items-center justify-between", selectedCategorySlugs.has(c.slug) ? "bg-orange-500 text-white" : "hover:bg-stone-50 text-stone-500")}
                                        >
                                           {c.name}
                                           {selectedCategorySlugs.has(c.slug) && <CheckCircle className="h-4 w-4" />}
                                        </button>
                                      ))}
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[...selectedCategorySlugs].map(slug => {
                               const cat = existingCategories.find(c => c.slug === slug);
                               return (
                                  <GlassPill key={slug} color="orange" className="h-8 px-4 font-bold text-[9px] items-center gap-2 border-none bg-orange-50 text-orange-600">
                                     {cat?.name || slug}
                                     <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategorySlugs(prev => { const n = new Set(prev); n.delete(slug); return n; })} />
                                  </GlassPill>
                               )
                            })}
                        </div>
                        <div className="space-y-3 pt-2">
                           <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Brief Description</Label>
                           <Textarea
                             value={form.business_description}
                             onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
                             placeholder="What do you plan to sell on Jimvio?"
                             rows={3}
                             className="rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 text-sm font-bold px-5 py-4 transition-all resize-none"
                           />
                        </div>
                     </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-stone-900 tracking-tight">Contact Information</h3>
                        <p className="text-[12px] font-medium text-stone-400">Where customers can reach your business</p>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-3">
                           <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Customer Service Email</Label>
                           <Input
                             type="email"
                             value={form.business_email}
                             onChange={(e) => setForm((f) => ({ ...f, business_email: e.target.value }))}
                             placeholder="support@yourstore.com"
                             className="h-12 rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-sky-500/5 focus:border-sky-400 text-base font-bold px-5"
                           />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Operating Country</Label>
                              <select
                                value={form.business_country}
                                onChange={(e) => setForm((f) => ({ ...f, business_country: e.target.value }))}
                                className="h-12 w-full px-5 rounded-xl border border-stone-100 bg-white shadow-sm text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/5 focus:border-sky-400 transition-all"
                              >
                                <option value="RW">Rwanda</option>
                                <option value="KE">Kenya</option>
                                <option value="UG">Uganda</option>
                                <option value="TZ">Tanzania</option>
                                <option value="US">USA</option>
                              </select>
                           </div>
                           <div className="space-y-3">
                              <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Primary Phone</Label>
                              <Input
                                value={form.business_phone}
                                onChange={(e) => setForm((f) => ({ ...f, business_phone: e.target.value }))}
                                placeholder="+250..."
                                className="h-12 rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-sky-500/5 focus:border-sky-400 text-sm font-bold px-5"
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[11px] font-bold uppercase tracking-widest text-stone-500 pl-1">Street Address</Label>
                           <Input
                             value={form.business_address}
                             onChange={(e) => setForm((f) => ({ ...f, business_address: e.target.value }))}
                             placeholder="City, District, Street"
                             className="h-12 rounded-xl bg-white border-stone-100 shadow-sm focus:ring-4 focus:ring-sky-500/5 focus:border-sky-400 text-sm font-bold px-5"
                           />
                        </div>
                     </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-stone-900 tracking-tight">Review Details</h3>
                        <p className="text-[12px] font-medium text-stone-400">Please confirm your information before submitting</p>
                     </div>
                     <div className="grid grid-cols-1 gap-3">
                        {[
                          { label: "Store Name", value: form.business_name },
                          { label: "Contact Phone", value: form.business_phone || "—" },
                          { label: "Support Email", value: form.business_email || "—" },
                          { label: "Country", value: form.business_country },
                        ].map((row, i) => (
                          <div key={i} className="px-6 py-4 rounded-2xl bg-white border border-stone-100 shadow-sm flex items-center justify-between group hover:border-orange-100 transition-all">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{row.label}</span>
                             <span className="text-sm font-bold text-stone-900">{row.value}</span>
                          </div>
                        ))}
                     </div>
                     <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-emerald-700 leading-relaxed uppercase tracking-widest">
                           We will review your application and get back to you within 48 hours.
                        </p>
                     </div>
                  </div>
                )}

                {/* Footer Nav */}
                <div className="flex items-center justify-between gap-4 pt-8 border-t border-stone-100">
                   <Button
                     type="button"
                     variant="ghost"
                     onClick={() => setStep(s => s - 1)}
                     disabled={step === 1 || submitting}
                     className="h-12 px-6 rounded-xl font-bold text-[11px] uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-all"
                   >
                     <ArrowLeft className="h-4 w-4 mr-2" /> Back
                   </Button>
                   
                   {step < 3 ? (
                     <Button
                       type="button"
                       onClick={() => {
                          if (step === 1 && !form.business_name.trim()) {
                             toast.error("Please enter a business name");
                             return;
                          }
                          setStep(s => s + 1);
                       }}
                       className="h-12 px-8 rounded-xl bg-stone-900 text-white font-bold text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all outline-none border-none"
                     >
                        Continue <ArrowRight className="h-4 w-4 ml-2" />
                     </Button>
                   ) : (
                     <Button
                       type="submit"
                       disabled={submitting}
                       className="h-14 px-10 rounded-xl bg-orange-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all outline-none border-none"
                     >
                        {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Submit Application"}
                     </Button>
                   )}
                </div>
             </form>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
