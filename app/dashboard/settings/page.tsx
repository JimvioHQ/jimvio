// "use client";
// export const dynamic = "force-dynamic";

// import React, { useEffect, useState, useTransition } from "react";
// import {
//    User,
//    Store,
//    Bell,
//    Shield,
//    Loader2,
//    Save,
//    CheckCircle,
//    Camera,
//    Globe,
//    Smartphone,
//    MapPin,
//    Mail,
//    Zap,
//    CreditCard,
//    Building,
//    Image as ImageIcon,
//    CheckCircle2,
//    RefreshCw,
//    MoreVertical,
//    ArrowLeft,
// } from "lucide-react";
// import { Textarea } from "@/components/ui/textarea";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
// import { createClient } from "@/lib/supabase/client";
// import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryAvatar, CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";
// import Link from "next/link";
// import { Field, FieldLabel } from "@/components/ui/field";
// import { FieldInput } from "@/components/ui/field-input";

// export default function SettingsPage() {
//    const [isPending, startTransition] = useTransition();
//    const [loading, setLoading] = useState(true);
//    const [saved, setSaved] = useState<string | null>(null);
//    const [userId, setUserId] = useState<string | null>(null);
//    const [userEmail, setUserEmail] = useState<string | null>(null);

//    const [profile, setProfile] = useState({ full_name: "", username: "", avatar_url: "", bio: "", website: "", phone: "", city: "", country: "RW" });
//    const [vendor, setVendor] = useState<{
//       id: string; business_name: string; business_description: string; business_email: string;
//       business_logo: string; business_banner: string;
//       business_phone: string; business_address: string; website: string;
//       payout_method: string; payout_account: string; affiliate_enabled: boolean; affiliate_commission_rate: string;
//    } | null>(null);

//    useEffect(() => {
//       async function load() {
//          const supabase = createClient();
//          const { data: { user } } = await supabase.auth.getUser();
//          if (!user) return;
//          setUserId(user.id);
//          setUserEmail(user.email ?? null);

//          const [profRes, vendRes] = await Promise.all([
//             supabase.from("profiles").select("*").eq("id", user.id).single(),
//             supabase.from("vendors").select("*").eq("user_id", user.id).single(),
//          ]);

//          if (profRes.data) setProfile({
//             full_name: profRes.data.full_name ?? "", username: profRes.data.username ?? "",
//             avatar_url: profRes.data.avatar_url ?? "",
//             bio: profRes.data.bio ?? "", website: profRes.data.website ?? "",
//             phone: profRes.data.phone ?? "", city: profRes.data.city ?? "", country: profRes.data.country ?? "RW",
//          });

//          if (vendRes.data) setVendor({
//             id: vendRes.data.id,
//             business_name: vendRes.data.business_name ?? "",
//             business_description: vendRes.data.business_description ?? "",
//             business_logo: vendRes.data.business_logo ?? "",
//             business_banner: vendRes.data.business_banner ?? "",
//             business_email: vendRes.data.business_email ?? "",
//             business_phone: vendRes.data.business_phone ?? "",
//             business_address: vendRes.data.business_address ?? "",
//             website: vendRes.data.website ?? "",
//             payout_method: normalizeVendorPayoutMethod(vendRes.data.payout_method),
//             payout_account: vendRes.data.payout_account ?? "",
//             affiliate_enabled: vendRes.data.affiliate_enabled ?? true,
//             affiliate_commission_rate: String(vendRes.data.affiliate_commission_rate ?? 10),
//          });

//          setLoading(false);
//       }
//       load();
//    }, []);

//    function saveProfile() {
//       if (!userId) return;
//       startTransition(async () => {
//          const supabase = createClient();
//          await supabase.from("profiles").update({
//             full_name: profile.full_name,
//             username: profile.username || null,
//             avatar_url: profile.avatar_url || null,
//             bio: profile.bio || null,
//             website: profile.website || null,
//             phone: profile.phone || null,
//             city: profile.city || null,
//             country: profile.country,
//          }).eq("id", userId);
//          setSaved("profile");
//          setTimeout(() => setSaved(null), 2500);
//       });
//    }

//    function saveVendor() {
//       if (!vendor) return;
//       startTransition(async () => {
//          const supabase = createClient();
//          await supabase.from("vendors").update({
//             business_name: vendor.business_name,
//             business_description: vendor.business_description || null,
//             business_logo: vendor.business_logo || null,
//             business_banner: vendor.business_banner || null,
//             business_email: vendor.business_email,
//             business_phone: vendor.business_phone || null,
//             business_address: vendor.business_address || null,
//             website: vendor.website || null,
//             payout_method: vendor.payout_method,
//             payout_account: vendor.payout_account,
//             affiliate_enabled: vendor.affiliate_enabled,
//             affiliate_commission_rate: parseFloat(vendor.affiliate_commission_rate) || 10,
//          }).eq("id", vendor.id);
//          setSaved("vendor");
//          setTimeout(() => setSaved(null), 2500);
//       });
//    }

//    if (loading) {
//       return (
//          <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "var(--color-bg)" }}>
//             <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
//             <p className="text-[11px] font-bold text-stone-400 dark:text-text-muted capitalize pl-1">Loading Settings...</p>
//          </div>
//       );
//    }

//    const inputClass = "h-12 rounded-sm bg-surface dark:bg-surface-secondary/80 border border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 text-stone-900 dark:text-white font-bold placeholder:text-stone-300 dark:placeholder:text-stone-600 transition-all text-sm px-4 sm:px-6 shadow-sm disabled:opacity-50";
//    const selectClass = "h-12 w-full px-4 sm:px-6 rounded-sm border border-border bg-surface dark:bg-surface-secondary/80 text-stone-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all shadow-sm appearance-none cursor-pointer";

//    return (
//       <div
//          className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
//          style={{
//             background: "var(--color-bg)",
//          }}
//       >
//          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-10 px-4 sm:px-6 pt-6 sm:pt-12 relative z-10">

//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
//                <div className="flex items-center gap-3 sm:gap-4">
//                   <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-sm bg-surface dark:bg-surface-secondary border border-border shadow-sm hover:bg-surface dark:hover:bg-zinc-700 active:scale-95 transition-all text-stone-500 dark:text-text-muted">
//                      <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
//                   </Button>
//                   <div className="space-y-0.5">
//                      <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Account Settings</h1>
//                      <p className="text-[10px] sm:text-[11px] font-nomr
//                       text-stone-600 dark:text-text-muted uppercase tracking-widest leading-none pl-0.5 opacity-80">Manage your profile and business</p>
//                   </div>
//                </div>

//                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-sm bg-surface dark:bg-surface-secondary border border-border shadow-sm opacity-80 w-fit">
//                   <span className="text-[9px] sm:text-[10px] font-normal uppercase tracking-widest text-stone-600 dark:text-text-muted truncate max-w-[150px] sm:max-w-xs">{userEmail}</span>
//                </div>
//             </div>

//             <Tabs defaultValue="profile" className="space-y-6 sm:space-y-8">
//                <TabsList className="flex items-center gap-1 p-1 sm:p-1.5 rounded-sm bg-surface/60 dark:bg-surface-secondary/40 border border-border w-fit overflow-x-auto no-scrollbar max-sm:w-full">
//                   <TabsTrigger value="profile" className="px-4 sm:px-6 py-2 rounded-lg text-[9px] sm:text-[10px] font-black  tracking-widest data-[state=active]:bg-stone-900 dark:data-[state=active]:bg-white dark:bg-surface dark:data-[state=active]:text-stone-900 dark:text-white data-[state=active]:text-white shadow-none transition-all flex items-center gap-2">
//                      <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Profile
//                   </TabsTrigger>
//                   {vendor && (
//                      <TabsTrigger value="vendor" className="px-4 sm:px-6 py-2 rounded-lg text-[9px] sm:text-[10px] font-black  tracking-widest data-[state=active]:bg-stone-900 dark:data-[state=active]:bg-white dark:bg-surface dark:data-[state=active]:text-stone-900 dark:text-white data-[state=active]:text-white shadow-none transition-all flex items-center gap-2">
//                         <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Business
//                      </TabsTrigger>
//                   )}
//                   <TabsTrigger value="notifications" className="px-4 sm:px-6 py-2 rounded-lg text-[9px] sm:text-[10px] font-black  tracking-widest data-[state=active]:bg-stone-900 dark:data-[state=active]:bg-white dark:bg-surface dark:data-[state=active]:text-stone-900 dark:text-white data-[state=active]:text-white shadow-none transition-all flex items-center gap-2">
//                      <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Alerts
//                   </TabsTrigger>
//                   <TabsTrigger value="security" className="px-4 sm:px-6 py-2 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest data-[state=active]:bg-stone-900 dark:data-[state=active]:bg-white dark:bg-surface dark:data-[state=active]:text-stone-900 dark:text-white data-[state=active]:text-white shadow-none transition-all flex items-center gap-2">
//                      <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Security
//                   </TabsTrigger>
//                </TabsList>

//                <TabsContent value="profile" className="mt-0 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
//                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
//                      <div className="lg:col-span-4 space-y-6">
//                         <GlassCard className="p-6 sm:p-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 text-center space-y-6 overflow-hidden relative">
//                            <div className="relative group w-24 h-24 sm:w-32 sm:h-32 mx-auto">
//                               <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity" />
//                               <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-surface dark:bg-surface border-4 border-surface dark:border-border shadow-sm overflow-hidden shrink-0 mx-auto">
//                                  <CloudinaryAvatar src={profile.avatar_url} alt={profile.full_name} size={128} className="w-full h-full object-cover" />
//                                  <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
//                                     <CloudinaryUploadButton
//                                        folder="jimvio/avatars"
//                                        onUploadSuccess={(url) => setProfile(p => ({ ...p, avatar_url: url }))}
//                                        buttonText=""
//                                        className="absolute inset-0 opacity-0 cursor-pointer"
//                                     />
//                                     <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
//                                  </div>
//                               </div>
//                            </div>
//                            <div>
//                               <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">{profile.full_name || "New Member"}</h3>
//                               <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted capitalize">@{profile.username || "unset"}</p>
//                            </div>
//                            <p className="text-[11px] sm:text-[12px] font-medium text-stone-500 dark:text-text-muted leading-relaxed">
//                               Update your personal details and how you appear to the community.
//                            </p>
//                         </GlassCard>
//                      </div>

//                      <div className="lg:col-span-8">
//                         <GlassCard className="p-6 sm:p-8 space-y-6 sm:space-y-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 shadow-sm relative overflow-hidden">
//                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
//                               <Field label="Full Name">
//                                  <FieldInput value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Enter your name" />
//                               </Field>
//                               <Field label={"Username"} icon={<div>@</div>}>
//                                  <FieldInput value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
//                               </Field>
//                            </div>

//                            <div className="space-y-1.5 sm:space-y-2">
//                               <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Bio</Label>
//                               <Textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..."
//                                  className="rounded-sm bg-surface dark:bg-surface/60 border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 text-stone-900
//                            dark:text-white font-bold text-sm px-4 sm:px-6 py-4
//                            resize-none min-h-[100px] sm:min-h-[120px] shadow-sm shadow-stone-100/10 placeholder:text-stone-300 dark:placeholder:text-stone-700" />
//                            </div>

//                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
//                               <div className="space-y-1.5 sm:space-y-2">
//                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Website</Label>
//                                  <div className="relative">
//                                     <Globe className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700" />
//                                     <Input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} className={cn(inputClass, "pl-10 sm:pl-12")} placeholder="https://..." />
//                                  </div>
//                               </div>
//                               <div className="space-y-1.5 sm:space-y-2">
//                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Phone Number</Label>
//                                  <div className="relative">
//                                     <Smartphone className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700" />
//                                     <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={cn(inputClass, "pl-10 sm:pl-12")} placeholder="+1..." />
//                                  </div>
//                               </div>
//                            </div>

//                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 border-t border-border">
//                               <div className="flex items-center gap-3">
//                                  {saved === "profile" ? (
//                                     <div className="flex items-center gap-2 text-emerald-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest animate-in slide-in-from-top-1">
//                                        <CheckCircle2 className="h-4 w-4" /> Profile Updated
//                                     </div>
//                                  ) : (
//                                     <p className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-widest">Global visibility is ON</p>
//                                  )}
//                               </div>
//                               <Button onClick={saveProfile} disabled={isPending} className="w-full md:w-auto h-11 sm:h-12 px-8 sm:px-10 rounded-sm bg-orange-500 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:bg-orange-600 active:scale-95 transition-all border-none">
//                                  {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
//                                  Synchronize Profile
//                               </Button>
//                            </div>
//                         </GlassCard>
//                      </div>
//                   </div>
//                </TabsContent>

//                {vendor && (
//                   <TabsContent value="vendor" className="mt-0 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
//                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
//                         <div className="lg:col-span-4 space-y-6">
//                            <GlassCard className="p-6 sm:p-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 text-center space-y-6 relative overflow-hidden">
//                               <div className="relative group w-24 h-24 sm:w-32 sm:h-32 mx-auto">
//                                  <div className="absolute inset-0 bg-stone-950/5 dark:bg-black/20 rounded-2xl border-2 border-dashed border-border transition-all opacity-0 group-hover:opacity-100" />
//                                  <div className="relative w-full h-full rounded-2xl bg-surface dark:bg-surface border border-border shadow-sm overflow-hidden flex flex-col items-center justify-center p-2">
//                                     {vendor.business_logo ? (
//                                        <CloudinaryImage src={vendor.business_logo} alt={vendor.business_name} fill className="object-cover" />
//                                     ) : (
//                                        <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-stone-300 dark:text-stone-700" />
//                                     )}
//                                     <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
//                                        <CloudinaryUploadButton
//                                           folder="jimvio/vendor-logos"
//                                           onUploadSuccess={(url) => setVendor(v => v ? ({ ...v, business_logo: url }) : null)}
//                                           buttonText=""
//                                           className="absolute inset-0 opacity-0 cursor-pointer"
//                                        />
//                                        <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
//                                     </div>
//                                  </div>
//                               </div>
//                               <div>
//                                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">{vendor.business_name || "New Store"}</h3>
//                                  <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted capitalize">Active Vendor</p>
//                               </div>
//                               <p className="text-[11px] sm:text-[12px] font-medium text-stone-500 dark:text-text-muted leading-relaxed">
//                                  Manage your business information and payout preferences.
//                               </p>
//                            </GlassCard>
//                         </div>

//                         <div className="lg:col-span-8">
//                            <GlassCard className="p-6 sm:p-8 space-y-6 sm:space-y-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 shadow-sm relative overflow-hidden">
//                               <section className="space-y-4 sm:space-y-6">
//                                  <h3 className="text-[10px] sm:text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
//                                     <Building className="h-3.5 w-3.5 text-stone-400" /> Business Details
//                                  </h3>
//                                  <div className="space-y-4 sm:space-y-6">
//                                     <div className="space-y-1.5 sm:space-y-2">
//                                        <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Store Name *</Label>
//                                        <Input value={vendor.business_name} onChange={e => setVendor(v => v ? ({ ...v, business_name: e.target.value }) : null)} className={inputClass} />
//                                     </div>
//                                     <div className="space-y-1.5 sm:space-y-2">
//                                        <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Description</Label>
//                                        <Textarea value={vendor.business_description} onChange={e => setVendor(v => v ? ({ ...v, business_description: e.target.value }) : null)} className="rounded-sm bg-surface dark:bg-surface/60 border-border focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 text-stone-900 dark:text-white font-bold text-sm px-4 sm:px-6 py-4 resize-none min-h-[100px] placeholder:text-stone-300 dark:placeholder:text-stone-700 shadow-sm" />
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
//                                        <div className="space-y-1.5 sm:space-y-2">
//                                           <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Support Email *</Label>
//                                           <div className="relative">
//                                              <Mail className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700" />
//                                              <Input value={vendor.business_email} onChange={e => setVendor(v => v ? ({ ...v, business_email: e.target.value }) : null)} className={cn(inputClass, "pl-10 sm:pl-12")} />
//                                           </div>
//                                        </div>
//                                        <div className="space-y-1.5 sm:space-y-2">
//                                           <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Business Address</Label>
//                                           <div className="relative">
//                                              <MapPin className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700" />
//                                              <Input value={vendor.business_address} onChange={e => setVendor(v => v ? ({ ...v, business_address: e.target.value }) : null)} className={cn(inputClass, "pl-10 sm:pl-12")} />
//                                           </div>
//                                        </div>
//                                     </div>
//                                  </div>
//                               </section>

//                               <section className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 border-t border-border">
//                                  <h3 className="text-[10px] sm:text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
//                                     <CreditCard className="h-3.5 w-3.5 text-stone-400" /> Payout Settings
//                                  </h3>
//                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
//                                     <div className="space-y-1.5 sm:space-y-2 relative">
//                                        <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Method</Label>
//                                        <select value={vendor.payout_method} onChange={e => setVendor(v => v ? ({ ...v, payout_method: e.target.value }) : null)} className={selectClass}>
//                                           <option value="bank" className="bg-surface dark:bg-surface">Bank Transfer</option>
//                                           <option value="momo" className="bg-surface dark:bg-surface">Mobile Money</option>
//                                           <option value="paypal" className="bg-surface dark:bg-surface">PayPal</option>
//                                        </select>
//                                        <div className="absolute right-4 sm:right-6 top-[38px] sm:top-[42px] pointer-events-none text-stone-300"><MoreVertical className="h-3.5 w-3.5" /></div>
//                                     </div>
//                                     <div className="space-y-1.5 sm:space-y-2">
//                                        <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Account Number / ID</Label>
//                                        <div className="relative">
//                                           <CreditCard className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300 dark:text-stone-700" />
//                                           <Input value={vendor.payout_account} onChange={e => setVendor(v => v ? ({ ...v, payout_account: e.target.value }) : null)}
//                                              className={cn(inputClass, "pl-10 sm:pl-12 font-mono")} placeholder="Enter ID" />
//                                        </div>
//                                     </div>
//                                  </div>
//                               </section>

//                               <section className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 border-t border-border">
//                                  <h3 className="text-[10px] sm:text-[11px] font-bold text-stone-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
//                                     <Zap className="h-3.5 w-3.5 text-stone-400" /> Affiliate Program
//                                  </h3>
//                                  <div className="flex items-center justify-between p-4 sm:p-6 rounded-sm bg-surface dark:bg-surface/60 border border-border shadow-sm transition-all group">
//                                     <div className="space-y-1 pr-4">
//                                        <p className="text-[12px] sm:text-[13px] font-bold text-stone-900 dark:text-white">Enable Affiliates</p>
//                                        <p className="text-[9px] sm:text-[10px] font-medium text-stone-400 dark:text-text-muted">Allow partners to promote your products</p>
//                                     </div>
//                                     <label className="relative inline-flex items-center cursor-pointer shrink-0">
//                                        <input type="checkbox" className="sr-only peer" checked={vendor.affiliate_enabled} onChange={e => setVendor(v => v ? ({ ...v, affiliate_enabled: e.target.checked }) : null)} />
//                                        <div className="w-11 sm:w-12 h-6 sm:h-7 bg-stone-200 dark:bg-surface-secondary rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] sm:after:top-[4px] after:left-[2px] sm:after:left-[4px] after:bg-white dark:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all" />
//                                     </label>
//                                  </div>

//                                  {vendor.affiliate_enabled && (
//                                     <div className="space-y-1.5 sm:space-y-2 p-1 animate-in slide-in-from-top-1">
//                                        <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600 ml-1">Base Commission (%)</Label>
//                                        <Input type="number" value={vendor.affiliate_commission_rate} onChange={e => setVendor(v => v ? ({ ...v, affiliate_commission_rate: e.target.value }) : null)} className={cn(inputClass, "max-w-[120px] text-lg")} />
//                                     </div>
//                                  )}
//                               </section>

//                               <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 pt-6 border-t border-border">
//                                  <div className="flex items-center gap-3">
//                                     {saved === "vendor" ? (
//                                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest animate-in slide-in-from-top-1">
//                                           <CheckCircle2 className="h-4 w-4" /> Store Updated
//                                        </div>
//                                     ) : (
//                                        <p className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-widest">Business status: ACTIVE</p>
//                                     )}
//                                  </div>
//                                  <Button onClick={saveVendor} disabled={isPending} className="w-full md:w-auto h-11 sm:h-12 px-8 sm:px-10 rounded-sm bg-orange-500 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:bg-orange-600 active:scale-95 transition-all border-none">
//                                     {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
//                                     Save Protocol
//                                  </Button>
//                               </div>
//                            </GlassCard>
//                         </div>
//                      </div>
//                   </TabsContent>
//                )}

//                <TabsContent value="notifications" className="mt-0 animate-in fade-in duration-500">
//                   <div className="max-w-2xl">
//                      <GlassCard className="p-6 sm:p-8 space-y-6 sm:space-y-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 shadow-sm relative overflow-hidden">
//                         <div className="space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
//                            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Notification Preferences</h3>
//                            <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Choose when you want to be alerted</p>
//                         </div>

//                         <div className="space-y-4 sm:space-y-6">
//                            {[
//                               { label: "New Sales", desc: "Notify me when a customer buys a product" },
//                               { label: "Affiliate Activity", desc: "Notify me when a partner earns a commission" },
//                               { label: "Withdrawals", desc: "Notify me when a payout is processed" },
//                               { label: "System Updates", desc: "Critical alerts about your account" }
//                            ].map((item, i) => (
//                               <div key={i} className="flex items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-border last:border-0 last:pb-0">
//                                  <div className="space-y-0.5 sm:space-y-1 pr-4">
//                                     <p className="text-[13px] sm:text-sm font-bold text-stone-900 dark:text-white tracking-tight">{item.label}</p>
//                                     <p className="text-[10px] sm:text-[11px] font-medium text-stone-400 dark:text-stone-600">{item.desc}</p>
//                                  </div>
//                                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
//                                     <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
//                                     <div className="w-11 sm:w-12 h-6 sm:h-7 bg-stone-200 dark:bg-surface-secondary rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] sm:after:top-[3px] after:left-[2px] sm:after:left-[3px] after:bg-white dark:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
//                                  </label>
//                               </div>
//                            ))}
//                         </div>
//                      </GlassCard>
//                   </div>
//                </TabsContent>

//                <TabsContent value="security" className="mt-0 animate-in fade-in duration-500">
//                   <div className="max-w-2xl">
//                      <GlassCard className="p-6 sm:p-8 space-y-6 sm:space-y-8 rounded-2xl border-border bg-surface/60 dark:bg-surface-secondary/40 shadow-sm relative overflow-hidden">
//                         <div className="space-y-1.5 sm:space-y-2 mb-6 sm:mb-8">
//                            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">Account Security</h3>
//                            <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 dark:text-text-muted uppercase tracking-widest">Protect your account and assets</p>
//                         </div>

//                         <div className="space-y-4 sm:space-y-6">
//                            <div className="space-y-1.5 sm:space-y-2">
//                               <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">Current Password</Label>
//                               <Input type="password" value="••••••••••••" className={cn(inputClass, "opacity-40")} disabled />
//                            </div>
//                            <div className="space-y-1.5 sm:space-y-2">
//                               <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-text-muted ml-1">New Password</Label>
//                               <Input type="password" className={inputClass} placeholder="Leave blank to keep current" />
//                            </div>
//                            <Button className="h-11 sm:h-12 px-8 sm:px-10 rounded-sm bg-stone-900 dark:bg-surface text-white dark:text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm hover:bg-black dark:hover:bg-stone-200 active:scale-95 transition-all border-none w-full">
//                               Update Password
//                            </Button>
//                         </div>

//                         <div className="p-5 sm:p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3 mt-8 sm:mt-12">
//                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
//                               <Shield className="h-4 w-4" />
//                               <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Delete Account</span>
//                            </div>
//                            <p className="text-[10px] sm:text-[11px] font-medium text-rose-400/80 leading-relaxed">
//                               Deleting your account will permanently erase all your data, including products, orders, and earnings. This action cannot be undone.
//                            </p>
//                            <Button variant="ghost" className="h-10 px-6 rounded-sm border border-rose-500/20 text-rose-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all w-full md:w-auto mt-2">
//                               Permanently Delete Account
//                            </Button>
//                         </div>
//                      </GlassCard>
//                   </div>
//                </TabsContent>
//             </Tabs>
//          </div>
//       </div>
//    );
// }

"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import {
   User, Store, Bell, Shield, Loader2, Save, CheckCircle, Camera, Globe,
   Smartphone, MapPin, Mail, Zap, CreditCard, Building, Image as ImageIcon,
   CheckCircle2, RefreshCw, MoreVertical, ArrowLeft, AlertCircle, Eye, EyeOff,
   Info, X, ChevronDown,
   Edit,
} from "lucide-react";
import { StyledTextarea, Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { CloudinaryAvatar, CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FieldInput } from "@/components/ui/field-input";
import CustomSelect from "@/components/ui/select-2";

type FieldError = string | null;

const validators = {
   required: (v: string, label = "This field") =>
      v.trim() ? null : `${label} is required`,
   minLength: (v: string, min: number, label = "This field") =>
      v.trim().length >= min ? null : `${label} must be at least ${min} characters`,
   maxLength: (v: string, max: number, label = "This field") =>
      v.trim().length <= max ? null : `${label} must be under ${max} characters`,
   email: (v: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address",
   url: (v: string) =>
      !v || /^https?:\/\/.+/.test(v.trim()) ? null : "URL must start with https://",
   phone: (v: string) =>
      !v || /^\+?[\d\s\-()]{7,20}$/.test(v.trim()) ? null : "Enter a valid phone number",
   username: (v: string) =>
      !v || /^[a-z0-9_]{3,30}$/.test(v.trim())
         ? null : "Username: 3–30 chars, lowercase letters, numbers, underscores only",
   commission: (v: string) => {
      const n = parseFloat(v);
      return n >= 1 && n <= 100 ? null : "Commission must be between 1% and 100%";
   },
   password: (v: string) =>
      !v || v.length >= 8 ? null : "Password must be at least 8 characters",
   passwordMatch: (a: string, b: string) =>
      a === b ? null : "Passwords do not match",
};

function validateProfile(p: typeof defaultProfile) {
   return {
      full_name: validators.required(p.full_name, "Full name") ??
         validators.maxLength(p.full_name, 80, "Full name"),
      username: validators.username(p.username),
      bio: validators.maxLength(p.bio, 300, "Bio"),
      website: validators.url(p.website),
      phone: validators.phone(p.phone),
   };
}

function validateVendor(v: NonNullable<typeof defaultVendor>) {
   return {
      business_name: validators.required(v.business_name, "Store name") ??
         validators.maxLength(v.business_name, 80, "Store name"),
      business_email: validators.required(v.business_email, "Support email") ??
         validators.email(v.business_email),
      business_description: validators.maxLength(v.business_description, 500, "Description"),
      payout_account: validators.required(v.payout_account, "Account number"),
      affiliate_commission_rate: v.affiliate_enabled
         ? validators.commission(v.affiliate_commission_rate)
         : null,
   };
}

function validateSecurity(s: typeof defaultSecurity) {
   return {
      new_password: validators.password(s.new_password),
      confirm_password: s.new_password
         ? validators.passwordMatch(s.new_password, s.confirm_password)
         : null,
   };
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultProfile = {
   full_name: "", username: "", avatar_url: "", bio: "",
   website: "", phone: "", city: "", country: "RW",
};

const defaultVendor = {
   id: "", business_name: "", business_description: "", business_email: "",
   business_logo: "", business_banner: "", business_phone: "", business_address: "",
   website: "", payout_method: "bank", payout_account: "",
   affiliate_enabled: true, affiliate_commission_rate: "10",
};

const defaultSecurity = { current_password: "", new_password: "", confirm_password: "" };

// ─── Field Components ──────────────────────────────────────────────────────────

function FieldWrapper({ label, error, children, hint }: {
   label: string; error?: FieldError; children: React.ReactNode; hint?: string;
}) {
   return (
      <div className="space-y-1.5">
         <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 pl-0.5">
               {label}
            </label>
            {hint && !error && (
               <span className="text-[9px] text-stone-400 dark:text-stone-600 flex items-center gap-1">
                  <Info className="h-2.5 w-2.5" />{hint}
               </span>
            )}
         </div>
         {children}
         {error && (
            <p className="text-[10px] font-medium text-rose-500 flex items-center gap-1.5 pl-0.5 animate-in slide-in-from-top-1 duration-200">
               <AlertCircle className="h-3 w-3 shrink-0" />{error}
            </p>
         )}
      </div>
   );
}

const inputBase =
   "h-11 w-full rounded-sm border transition-all duration-200 text-sm font-medium px-4 shadow-none outline-none " +
   "bg-white dark:bg-zinc-900 " +
   "border-stone-200 dark:border-zinc-700 " +
   "text-stone-900 dark:text-white " +
   "placeholder:text-stone-300 dark:placeholder:text-zinc-600 " +
   "focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 " +
   "disabled:opacity-40 disabled:cursor-not-allowed";

const inputError =
   "border-rose-400 dark:border-rose-500 focus:border-rose-400 focus:ring-rose-400/20";

function StyledInput({ error, className, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
   error?: FieldError; icon?: React.ReactNode;
}) {
   return (
      <div className="relative">
         {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 dark:text-zinc-600 pointer-events-none">
               {icon}
            </span>
         )}
         <input
            className={cn(inputBase, error && inputError, icon && "pl-9", className)}
            {...props}
         />
         {error && (
            <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
         )}
      </div>
   );
}



// ─── Toast Notification ────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
   return (
      <div className={cn(
         "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl",
         "animate-in slide-in-from-bottom-4 duration-300 font-medium text-sm",
         type === "success"
            ? "bg-emerald-500 text-white"
            : "bg-rose-500 text-white"
      )}>
         {type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
         {message}
      </div>
   );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, desc }: {
   checked: boolean; onChange: (v: boolean) => void; label: string; desc: string;
}) {
   return (
      <label className="flex items-center justify-between p-4 rounded-md bg-stone-50 dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 cursor-pointer group hover:border-orange-300 dark:hover:border-orange-500/40 transition-all">
         <div className="space-y-0.5 pr-4">
            <p className="text-[13px] font-bold text-stone-900 dark:text-white">{label}</p>
            <p className="text-[10px] font-medium text-stone-400 dark:text-zinc-500">{desc}</p>
         </div>
         <div className="relative shrink-0">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={cn(
               "w-11 h-6 rounded-full transition-colors duration-200",
               checked ? "bg-orange-500" : "bg-stone-200 dark:bg-zinc-700"
            )}>
               <div className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200",
                  checked && "translate-x-5"
               )} />
            </div>
         </div>
      </label>
   );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
   return (
      <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100 dark:border-zinc-800">
         <div className="h-7 w-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
            {icon}
         </div>
         <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-700 dark:text-white">{title}</h3>
      </div>
   );
}

// ─── Character Counter ────────────────────────────────────────────────────────

function CharCount({ value, max }: { value: string; max: number }) {
   const len = value.length;
   const pct = len / max;
   return (
      <span className={cn(
         "text-[9px] font-bold tabular-nums",
         pct > 0.9 ? "text-rose-400" : pct > 0.7 ? "text-amber-400" : "text-stone-300 dark:text-zinc-600"
      )}>
         {len}/{max}
      </span>
   );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
   const [isPending, startTransition] = useTransition();
   const [loading, setLoading] = useState(true);
   const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
   const [userId, setUserId] = useState<string | null>(null);
   const [userEmail, setUserEmail] = useState<string | null>(null);
   const [showCurrentPw, setShowCurrentPw] = useState(false);
   const [showNewPw, setShowNewPw] = useState(false);
   const [showConfirmPw, setShowConfirmPw] = useState(false);

   const [profile, setProfile] = useState(defaultProfile);
   const [profileErrors, setProfileErrors] = useState<Record<string, FieldError>>({});
   const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});

   const [vendor, setVendor] = useState<typeof defaultVendor | null>(null);
   const [vendorErrors, setVendorErrors] = useState<Record<string, FieldError>>({});
   const [vendorTouched, setVendorTouched] = useState<Record<string, boolean>>({});

   const [security, setSecurity] = useState(defaultSecurity);
   const [securityErrors, setSecurityErrors] = useState<Record<string, FieldError>>({});
   const [securityTouched, setSecurityTouched] = useState<Record<string, boolean>>({});

   const [notifications, setNotifications] = useState({
      new_sales: true, affiliate_activity: true, withdrawals: false, system_updates: true,
   });

   const showToast = (msg: string, type: "success" | "error") => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
   };

   useEffect(() => {
      async function load() {
         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;
         setUserId(user.id);
         setUserEmail(user.email ?? null);

         const [profRes, vendRes] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", user.id).single(),
            supabase.from("vendors").select("*").eq("user_id", user.id).single(),
         ]);

         if (profRes.data) setProfile({
            full_name: profRes.data.full_name ?? "",
            username: profRes.data.username ?? "",
            avatar_url: profRes.data.avatar_url ?? "",
            bio: profRes.data.bio ?? "",
            website: profRes.data.website ?? "",
            phone: profRes.data.phone ?? "",
            city: profRes.data.city ?? "",
            country: profRes.data.country ?? "RW",
         });

         if (vendRes.data) setVendor({
            id: vendRes.data.id,
            business_name: vendRes.data.business_name ?? "",
            business_description: vendRes.data.business_description ?? "",
            business_logo: vendRes.data.business_logo ?? "",
            business_banner: vendRes.data.business_banner ?? "",
            business_email: vendRes.data.business_email ?? "",
            business_phone: vendRes.data.business_phone ?? "",
            business_address: vendRes.data.business_address ?? "",
            website: vendRes.data.website ?? "",
            payout_method: normalizeVendorPayoutMethod(vendRes.data.payout_method),
            payout_account: vendRes.data.payout_account ?? "",
            affiliate_enabled: vendRes.data.affiliate_enabled ?? true,
            affiliate_commission_rate: String(vendRes.data.affiliate_commission_rate ?? 10),
         });

         setLoading(false);
      }
      load();
   }, []);

   // ── Profile Handlers ─────────────────────────────────────────────────────

   const touchProfile = (field: string) =>
      setProfileTouched(t => ({ ...t, [field]: true }));

   const updateProfile = (field: keyof typeof defaultProfile, value: string) => {
      const next = { ...profile, [field]: value };
      setProfile(next);
      const errs = validateProfile(next);
      setProfileErrors(e => ({ ...e, [field]: errs[field as keyof typeof errs] ?? null }));
   };

   function saveProfile() {
      const errs = validateProfile(profile);
      setProfileErrors(errs);
      setProfileTouched({ full_name: true, username: true, bio: true, website: true, phone: true });
      const hasErrors = Object.values(errs).some(Boolean);
      if (hasErrors || !userId) return;

      startTransition(async () => {
         try {
            const supabase = createClient();
            const { error } = await supabase.from("profiles").update({
               full_name: profile.full_name,
               username: profile.username || null,
               avatar_url: profile.avatar_url || null,
               bio: profile.bio || null,
               website: profile.website || null,
               phone: profile.phone || null,
               city: profile.city || null,
               country: profile.country,
            }).eq("id", userId);
            if (error) throw error;
            showToast("Profile updated successfully", "success");
         } catch {
            showToast("Failed to save profile. Please try again.", "error");
         }
      });
   }

   // ── Vendor Handlers ──────────────────────────────────────────────────────

   const touchVendor = (field: string) =>
      setVendorTouched(t => ({ ...t, [field]: true }));

   const updateVendor = (field: string, value: string | boolean) => {
      const next = { ...vendor!, [field]: value };
      setVendor(next);
      const errs = validateVendor(next);
      setVendorErrors(e => ({ ...e, [field]: errs[field as keyof typeof errs] ?? null }));
   };

   function saveVendor() {
      if (!vendor) return;
      const errs = validateVendor(vendor);
      setVendorErrors(errs);
      setVendorTouched({
         business_name: true, business_email: true, business_description: true,
         payout_account: true, affiliate_commission_rate: true,
      });
      if (Object.values(errs).some(Boolean)) return;

      startTransition(async () => {
         try {
            const supabase = createClient();
            const { error } = await supabase.from("vendors").update({
               business_name: vendor.business_name,
               business_description: vendor.business_description || null,
               business_logo: vendor.business_logo || null,
               business_banner: vendor.business_banner || null,
               business_email: vendor.business_email,
               business_phone: vendor.business_phone || null,
               business_address: vendor.business_address || null,
               website: vendor.website || null,
               payout_method: vendor.payout_method,
               payout_account: vendor.payout_account,
               affiliate_enabled: vendor.affiliate_enabled,
               affiliate_commission_rate: parseFloat(vendor.affiliate_commission_rate) || 10,
            }).eq("id", vendor.id);
            if (error) throw error;
            showToast("Business settings saved", "success");
         } catch {
            showToast("Failed to save business settings.", "error");
         }
      });
   }

   // ── Security Handlers ────────────────────────────────────────────────────

   const touchSecurity = (field: string) =>
      setSecurityTouched(t => ({ ...t, [field]: true }));

   const updateSecurity = (field: keyof typeof defaultSecurity, value: string) => {
      const next = { ...security, [field]: value };
      setSecurity(next);
      const errs = validateSecurity(next);
      setSecurityErrors(e => ({ ...e, [field]: errs[field as keyof typeof errs] ?? null }));
   };

   function savePassword() {
      const errs = validateSecurity(security);
      setSecurityErrors(errs);
      setSecurityTouched({ current_password: true, new_password: true, confirm_password: true });
      if (!security.current_password.trim()) {
         setSecurityErrors(e => ({ ...e, current_password: "Current password is required" }));
         return;
      }
      if (Object.values(errs).some(Boolean)) return;

      startTransition(async () => {
         try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password: security.new_password });
            if (error) throw error;
            setSecurity(defaultSecurity);
            showToast("Password updated successfully", "success");
         } catch {
            showToast("Failed to update password. Check your current password.", "error");
         }
      });
   }

   // ─────────────────────────────────────────────────────────────────────────

   if (loading) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--color-bg)" }}>
            <div className="h-10 w-10 rounded-2xl bg-transparent flex items-center justify-center">
               <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            </div>
            <p className="text-[11px] font-bold text-stone-600 tracking-widest">Loading Settings…</p>
         </div>
      );
   }

   const profileErrs = validateProfile(profile);
   const vendorErrs = vendor ? validateVendor(vendor) : {};
   const profileHasErrors = Object.keys(profileErrs).filter(k => profileTouched[k]).some(k => profileErrs[k as keyof typeof profileErrs]);
   const vendorHasErrors = Object.keys(vendorErrs).filter(k => vendorTouched[k]).some(k => vendorErrs[k as keyof typeof vendorErrs]);

   return (
      <div className="min-h-screen pb-24 relative" style={{ background: "var(--color-bg)" }}>
         {toast && <Toast message={toast.msg} type={toast.type} />}

         {/* Subtle ambient bg */}
         <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-400/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-300/5 rounded-full blur-3xl" />
         </div>

         <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-8 relative z-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <Button asChild variant="ghost" size="icon"
                     className="h-9 w-9 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm hover:border-orange-300 transition-all">
                     <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                  </Button>
                  <div>
                     <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">Account Settings</h1>
                     <p className="text-[10px] text-stone-600 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Manage your profile and business</p>
                  </div>
               </div>

               <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-stone-600 dark:text-zinc-400 truncate max-w-[200px]">{userEmail}</span>
               </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="space-y-6">
               <TabsList className="flex items-center gap-1 p-1 rounded-full bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 w-fit max-sm:w-full overflow-x-auto no-scrollbar">
                  {[
                     { value: "profile", icon: <User className="h-3.5 w-3.5" />, label: "Profile" },
                     ...(vendor ? [{ value: "vendor", icon: <Store className="h-3.5 w-3.5" />, label: "Business" }] : []),
                     { value: "notifications", icon: <Bell className="h-3.5 w-3.5" />, label: "Alerts" },
                     { value: "security", icon: <Shield className="h-3.5 w-3.5" />, label: "Security" },
                  ].map(tab => (
                     <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5
                           data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800
                           data-[state=active]:text-orange-500 dark:data-[state=active]:text-orange-400
                           data-[state=active]:shadow-sm
                           text-stone-600 dark:text-zinc-500
                           hover:text-stone-700 dark:hover:text-zinc-300"
                     >
                        {tab.icon} {tab.label}
                     </TabsTrigger>
                  ))}
               </TabsList>

               {/* ── Profile Tab ── */}
               <TabsContent value="profile" className="mt-0 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                     {/* Avatar Card */}
                     <div className="lg:col-span-4">
                        <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-center space-y-5 shadow-sm">
                           <div className="relative group w-28 h-28 mx-auto">
                              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-md">
                                 <CloudinaryAvatar src={profile.avatar_url} alt={profile.full_name} size={112} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <CloudinaryUploadButton
                                    folder="jimvio/avatars"
                                    onUploadSuccess={(url) => setProfile(p => ({ ...p, avatar_url: url }))}
                                    buttonText=""
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                 />
                                 <Camera className="h-5 w-5 text-white" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-orange-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-sm">
                                 <Camera className="h-3 w-3 text-white" />
                              </div>
                           </div>
                           <div>
                              <p className="font-bold text-stone-900 dark:text-white text-base">{profile.full_name || "New Member"}</p>
                              <p className="text-[11px] text-stone-400 dark:text-zinc-500 mt-0.5">@{profile.username || "unset"}</p>
                           </div>
                           <div className="text-[10px] text-stone-400 dark:text-zinc-600 leading-relaxed border-t border-stone-100 dark:border-zinc-800 pt-4">
                              Tap the photo to update your profile picture
                           </div>
                        </div>
                     </div>

                     {/* Profile Form */}
                     <div className="lg:col-span-8">
                        <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <Field label="Full Name" required error={profileErrors.full_name ?? ""}>
                                 <FieldInput
                                    value={profile.full_name}
                                    onChange={e => updateProfile("full_name", e.target.value)}
                                    onBlur={() => touchProfile("full_name")}
                                    placeholder="Jane Doe"
                                    hasError={!!profileErrors.full_name}
                                    className="pl-3"
                                 />
                              </Field>
                              <Field
                                 label="Username"
                                 error={profileErrors.username ?? ""}
                                 hint="optional"
                                 icon={<span className="text-lg font-bold">@</span>}
                              >
                                 <FieldInput
                                    value={profile.username}
                                    onChange={e => updateProfile("username", e.target.value.toLowerCase())}
                                    onBlur={() => touchProfile("username")}
                                    placeholder="jane_doe"
                                    hasError={!!profileErrors.username}
                                 />
                              </Field>
                           </div>

                           <Field label="Bio" error={profileErrors.bio ?? ""} hint="optional">
                              <div className="relative">
                                 <StyledTextarea
                                    value={profile.bio}
                                    onChange={e => updateProfile("bio", e.target.value)}
                                    onBlur={() => touchProfile("bio")}
                                    placeholder="Tell us about yourself…"
                                    maxLength={300}
                                    error={profileTouched.bio ? profileErrors.bio : null}
                                 />
                                 <div className="absolute bottom-2.5 right-3">
                                    <CharCount value={profile.bio} max={300} />
                                 </div>
                              </div>
                           </Field>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <Field label="Website" icon={<Globe className="h-4 w-4" />} error={profileErrors.website ?? ""} hint="optional">
                                 <FieldInput
                                    value={profile.website}
                                    onChange={e => updateProfile("website", e.target.value)}
                                    onBlur={() => touchProfile("website")}
                                    placeholder="https://yoursite.com"
                                    hasError={!!profileErrors.website}
                                 />
                              </Field>

                              <Field label="Phone Number" icon={<Smartphone className="h-4 w-4" />} error={profileErrors.phone ?? ""} hint="optional">
                                 <FieldInput
                                    value={profile.phone}
                                    onChange={e => updateProfile("phone", e.target.value)}
                                    onBlur={() => touchProfile("phone")}
                                    placeholder="+250 7XX XXX XXX"
                                    hasError={!!profileErrors.phone}
                                 />
                              </Field>
                           </div>

                           {/* Validation summary */}
                           {profileHasErrors && (
                              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium animate-in slide-in-from-top-1">
                                 <AlertCircle className="h-4 w-4 shrink-0" />
                                 Please fix the errors above before saving.
                              </div>
                           )}

                           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100 dark:border-zinc-800">
                              <p className="text-[9px] font-normal text-stone-600 dark:text-zinc-600 tracking-normal leading-relaxed">
                                 Changes auto-validate on blur
                              </p>
                              <Button
                                 onClick={saveProfile}
                                 disabled={isPending}
                                 className="w-full sm:w-auto h-11 px-8 rounded-xl bg-orange-500 text-white font-bold text-[10px] tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 border-none"
                              >
                                 {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                                 Save Profile
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               {/* ── Business Tab ── */}
               {vendor && (
                  <TabsContent value="vendor" className="mt-0 animate-in fade-in duration-300">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Logo Card */}
                        <div className="lg:col-span-4">
                           <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-center space-y-5 shadow-sm">
                              <div className="relative group w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-stone-100 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900">
                                 {vendor.business_logo
                                    ? <CloudinaryImage src={vendor.business_logo} alt={vendor.business_name} fill className="object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-stone-200 dark:text-zinc-700" /></div>
                                 }
                                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <CloudinaryUploadButton
                                       folder="jimvio/vendor-logos"
                                       onUploadSuccess={(url) => setVendor(v => v ? { ...v, business_logo: url } : null)}
                                       buttonText=""
                                       className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Camera className="h-5 w-5 text-white" />
                                 </div>
                              </div>
                              <div>
                                 <p className="font-bold text-stone-900 dark:text-white text-base">{vendor.business_name || "New Store"}</p>
                                 <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                                 </span>
                              </div>
                              <p className="text-[10px] text-stone-400 dark:text-zinc-600 leading-relaxed border-t border-stone-100 dark:border-zinc-800 pt-4">
                                 Tap logo to upload a new image
                              </p>
                           </div>
                        </div>

                        {/* Business Form */}
                        <div className="lg:col-span-8 space-y-6">
                           <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm">
                              <SectionHeader icon={<Building className="h-3.5 w-3.5" />} title="Business Details" />

                              <Field label="Store Name" required error={vendorTouched.business_name ? vendorErrors.business_name : null}>
                                 <FieldInput
                                    value={vendor.business_name}
                                    onChange={e => updateVendor("business_name", e.target.value)}
                                    onBlur={() => touchVendor("business_name")}
                                    placeholder="Acme Digital Co."
                                    hasError={!!vendorErrors.business_name}
                                 />
                              </Field>

                              <Field label="Description" error={vendorTouched.business_description ? vendorErrors.business_description : null} hint="optional">
                                 <div className="relative">
                                    <StyledTextarea
                                       value={vendor.business_description}
                                       onChange={e => updateVendor("business_description", e.target.value)}
                                       onBlur={() => touchVendor("business_description")}
                                       placeholder="What does your business do?"
                                       maxLength={500}
                                       error={vendorTouched.business_description ? vendorErrors.business_description : null}
                                    />
                                    <div className="absolute bottom-2.5 right-3">
                                       <CharCount value={vendor.business_description} max={500} />
                                    </div>
                                 </div>
                              </Field>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <Field label="Support Email" required icon={<Mail className="h-4 w-4" />} error={vendorTouched.business_email ? vendorErrors.business_email : null}>
                                    <FieldInput
                                       value={vendor.business_email}
                                       onChange={e => updateVendor("business_email", e.target.value)}
                                       onBlur={() => touchVendor("business_email")}
                                       placeholder="support@yourstore.com"
                                       type="email"
                                       hasError={!!vendorErrors.business_email}
                                    />
                                 </Field>

                                 <Field label="Business Address" icon={<MapPin className="h-4 w-4" />} hint="optional">
                                    <FieldInput
                                       value={vendor.business_address}
                                       onChange={e => updateVendor("business_address", e.target.value)}
                                       placeholder="Kigali, Rwanda"
                                       hasError={!!vendorErrors.business_address}
                                    />
                                 </Field>
                              </div>
                           </div>

                           {/* Payout */}
                           <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm">
                              <SectionHeader icon={<CreditCard className="h-3.5 w-3.5" />} title="Payout Settings" />

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 <Field label="Payment Method">
                                    <CustomSelect
                                       options={[
                                          { value: "bank", label: "Bank Transfer" },
                                          { value: "momo", label: "Mobile Money" },
                                          { value: "paypal", label: "PayPal" },
                                       ]}
                                       searchable
                                       value={vendor.payout_method}
                                       onChange={v => updateVendor("payout_method", v)}
                                       className="w-full"
                                    />
                                 </Field>

                                 <Field label="Account Number / ID Number" icon error={vendorTouched.payout_account ? vendorErrors.payout_account : null}>
                                    <FieldInput
                                       value={vendor.payout_account}
                                       onChange={e => updateVendor("payout_account", e.target.value)}
                                       onBlur={() => touchVendor("payout_account")}
                                       placeholder={vendor.payout_method === "paypal" ? "email@paypal.com" : "Enter account number"}
                                       className="pl-3"
                                       hasError={!!vendorErrors.payout_account}
                                    />
                                 </Field>
                              </div>
                           </div>

                           {/* Affiliate */}
                           <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-5 shadow-sm">
                              <SectionHeader icon={<Zap className="h-3.5 w-3.5" />} title="Affiliate Program" />

                              <Toggle
                                 checked={vendor.affiliate_enabled}
                                 onChange={v => updateVendor("affiliate_enabled", v)}
                                 label="Enable Affiliates"
                                 desc="Allow partners to earn commission promoting your products"
                              />

                              {vendor.affiliate_enabled && (
                                 <div className="animate-in slide-in-from-top-1 duration-200">
                                    <Field
                                       label="Base Commission Rate (%)"
                                       error={vendorTouched.affiliate_commission_rate ? vendorErrors.affiliate_commission_rate : null}
                                       hint="1–100"
                                    >
                                       <div className="flex items-center gap-3">
                                          <FieldInput
                                             type="number"
                                             value={vendor.affiliate_commission_rate}
                                             onChange={e => updateVendor("affiliate_commission_rate", e.target.value)}
                                             onBlur={() => touchVendor("affiliate_commission_rate")}
                                             min={1} max={100}
                                             className="max-w-[130px] text-lg font-bold text-center"
                                             hasError={!!vendorErrors.affiliate_commission_rate}
                                          />
                                          <span className="text-stone-400 dark:text-zinc-500 text-sm font-medium">% per sale</span>
                                       </div>
                                    </Field>
                                 </div>
                              )}
                           </div>

                           {/* Error summary */}
                           {vendorHasErrors && (
                              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                                 <AlertCircle className="h-4 w-4 shrink-0" />
                                 Please fix all required fields before saving.
                              </div>
                           )}

                           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                              <p className="text-[9px] font-bold text-stone-300 dark:text-zinc-600 uppercase tracking-widest">
                                 * Required fields
                              </p>
                              <Button
                                 onClick={saveVendor}
                                 disabled={isPending}
                                 className="w-full sm:w-auto h-11 px-8 rounded-xl bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 border-none"
                              >
                                 {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                 Save Business
                              </Button>
                           </div>
                        </div>
                     </div>
                  </TabsContent>
               )}

               {/* ── Notifications Tab ── */}
               <TabsContent value="notifications" className="mt-0 animate-in fade-in duration-300">
                  <div className="max-w-2xl">
                     <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div>
                           <h3 className="text-base font-bold text-stone-900 dark:text-white">Notification Preferences</h3>
                           <p className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Choose when you want to be alerted</p>
                        </div>

                        <div className="space-y-3">
                           {[
                              { key: "new_sales", label: "New Sales", desc: "Notify me when a customer buys a product" },
                              { key: "affiliate_activity", label: "Affiliate Activity", desc: "Notify me when a partner earns a commission" },
                              { key: "withdrawals", label: "Withdrawals", desc: "Notify me when a payout is processed" },
                              { key: "system_updates", label: "System Updates", desc: "Critical alerts about your account" },
                           ].map(item => (
                              <Toggle
                                 key={item.key}
                                 checked={notifications[item.key as keyof typeof notifications]}
                                 onChange={v => setNotifications(n => ({ ...n, [item.key]: v }))}
                                 label={item.label}
                                 desc={item.desc}
                              />
                           ))}
                        </div>

                        <div className="pt-2 border-t border-stone-100 dark:border-zinc-800">
                           <Button
                              className="h-11 px-8 rounded-xl bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 border-none"
                              onClick={() => showToast("Notification preferences saved", "success")}
                           >
                              <Save className="h-4 w-4 mr-2" /> Save Preferences
                           </Button>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               {/* ── Security Tab ── */}
               <TabsContent value="security" className="mt-0 animate-in fade-in duration-300">
                  <div className="max-w-2xl space-y-6">
                     <div className="rounded-2xl border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-sm">
                        <div>
                           <h3 className="text-base font-bold text-stone-900 dark:text-white">Change Password</h3>
                           <p className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Protect your account and assets</p>
                        </div>

                        <Field label="Current Password" error={securityTouched.current_password ? securityErrors.current_password : null}>
                           <div className="relative">
                              <FieldInput
                                 type={showCurrentPw ? "text" : "password"}
                                 value={security.current_password}
                                 onChange={e => updateSecurity("current_password", e.target.value)}
                                 onBlur={() => touchSecurity("current_password")}
                                 placeholder="Enter current password"
                                 className={"pl-4"}
                                 hasError={!!securityErrors.current_password}
                              />
                              <button
                                 type="button"
                                 onClick={() => setShowCurrentPw(!showCurrentPw)}
                                 className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300 dark:text-zinc-600 hover:text-stone-500 transition-colors"
                              >
                                 {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                           </div>
                        </Field>

                        <Field label="New Password" error={securityTouched.new_password ? securityErrors.new_password : null} hint="min 8 chars">
                           <div className="relative">
                              <FieldInput
                                 type={showNewPw ? "text" : "password"}
                                 value={security.new_password}
                                 onChange={e => updateSecurity("new_password", e.target.value)}
                                 onBlur={() => touchSecurity("new_password")}
                                 placeholder="Enter new password"
                                 className={"pl-4"}
                                 hasError={!!securityErrors.new_password}
                              />
                              <button
                                 type="button"
                                 onClick={() => setShowNewPw(!showNewPw)}
                                 className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300 dark:text-zinc-600 hover:text-stone-500 transition-colors"
                              >
                                 {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                           </div>

                           {/* Password strength */}
                           {security.new_password && (
                              <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-1">
                                 <div className="flex gap-1">
                                    {[8, 12, 16, 20].map((len, i) => (
                                       <div key={i} className={cn(
                                          "h-1 flex-1 rounded-full transition-colors duration-300",
                                          security.new_password.length >= len
                                             ? i < 1 ? "bg-rose-400" : i < 2 ? "bg-amber-400" : i < 3 ? "bg-yellow-400" : "bg-emerald-400"
                                             : "bg-stone-100 dark:bg-zinc-800"
                                       )} />
                                    ))}
                                 </div>
                                 <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                    {security.new_password.length < 8 ? "Too short"
                                       : security.new_password.length < 12 ? "Weak"
                                          : security.new_password.length < 16 ? "Good"
                                             : "Strong"}
                                 </p>
                              </div>
                           )}
                        </Field>

                        <Field label="Confirm New Password" error={securityTouched.confirm_password ? securityErrors.confirm_password : null}>
                           <div className="relative">
                              <FieldInput
                                 type={showConfirmPw ? "text" : "password"}
                                 value={security.confirm_password}
                                 onChange={e => updateSecurity("confirm_password", e.target.value)}
                                 onBlur={() => touchSecurity("confirm_password")}
                                 placeholder="Re-enter new password"
                                 className={"pl-4"}
                                 hasError={!!securityErrors.confirm_password}
                              />
                              <button
                                 type="button"
                                 onClick={() => setShowConfirmPw(!showConfirmPw)}
                                 className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300 dark:text-zinc-600 hover:text-stone-500 transition-colors"
                              >
                                 {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                           </div>
                        </Field>

                        <Button
                           onClick={savePassword}
                           disabled={isPending}
                           className="h-11 px-8 rounded-xl bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20 border-none w-full"
                        >
                           {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                           Update Password
                        </Button>
                     </div>

                     {/* Danger Zone */}
                     <div className="rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                           <Shield className="h-4 w-4" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Danger Zone</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 dark:text-rose-400/60 leading-relaxed">
                           Deleting your account permanently erases all data — products, orders, and earnings. This cannot be undone.
                        </p>
                        <Button
                           variant="ghost"
                           className="h-10 px-6 rounded-xl border border-rose-300 dark:border-rose-500/30 text-rose-500 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all w-full sm:w-auto"
                        >
                           Permanently Delete Account
                        </Button>
                     </div>
                  </div>
               </TabsContent>
            </Tabs>
         </div>
      </div>
   );
}