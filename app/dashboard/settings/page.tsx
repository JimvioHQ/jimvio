"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useTransition } from "react";
import {
  User,
  Store,
  Bell,
  Shield,
  Loader2,
  Save,
  CheckCircle,
  Camera,
  Globe,
  Smartphone,
  MapPin,
  Mail,
  Zap,
  CreditCard,
  Building,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard, GlassPill, GlassAmbientGlow } from "@/components/ui/glass";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryAvatar, CloudinaryImage } from "@/components/ui/cloudinary-image";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading]    = useState(true);
  const [saved, setSaved]        = useState<string | null>(null);
  const [userId, setUserId]      = useState<string | null>(null);
  const [userEmail, setUserEmail]  = useState<string | null>(null);

  const [profile, setProfile] = useState({ full_name: "", username: "", avatar_url: "", bio: "", website: "", phone: "", city: "", country: "RW" });
  const [vendor, setVendor]   = useState<{
    id: string; business_name: string; business_description: string; business_email: string;
    business_logo: string; business_banner: string;
    business_phone: string; business_address: string; website: string;
    payout_method: string; payout_account: string; affiliate_enabled: boolean; affiliate_commission_rate: string;
  } | null>(null);

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
        full_name: profRes.data.full_name ?? "", username: profRes.data.username ?? "",
        avatar_url: profRes.data.avatar_url ?? "",
        bio: profRes.data.bio ?? "", website: profRes.data.website ?? "",
        phone: profRes.data.phone ?? "", city: profRes.data.city ?? "", country: profRes.data.country ?? "RW",
      });

      if (vendRes.data) setVendor({
        id:                       vendRes.data.id,
        business_name:            vendRes.data.business_name ?? "",
        business_description:     vendRes.data.business_description ?? "",
        business_logo:            vendRes.data.business_logo ?? "",
        business_banner:          vendRes.data.business_banner ?? "",
        business_email:           vendRes.data.business_email ?? "",
        business_phone:           vendRes.data.business_phone ?? "",
        business_address:         vendRes.data.business_address ?? "",
        website:                  vendRes.data.website ?? "",
        payout_method:            normalizeVendorPayoutMethod(vendRes.data.payout_method),
        payout_account:           vendRes.data.payout_account ?? "",
        affiliate_enabled:        vendRes.data.affiliate_enabled ?? true,
        affiliate_commission_rate: String(vendRes.data.affiliate_commission_rate ?? 10),
      });

      setLoading(false);
    }
    load();
  }, []);

  function saveProfile() {
    if (!userId) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("profiles").update({
        full_name:  profile.full_name,
        username:   profile.username || null,
        avatar_url: profile.avatar_url || null,
        bio:        profile.bio || null,
        website:    profile.website || null,
        phone:      profile.phone || null,
        city:       profile.city || null,
        country:    profile.country,
      }).eq("id", userId);
      setSaved("profile");
      setTimeout(() => setSaved(null), 2500);
    });
  }

  function saveVendor() {
    if (!vendor) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("vendors").update({
        business_name:        vendor.business_name,
        business_description: vendor.business_description || null,
        business_logo:        vendor.business_logo || null,
        business_banner:      vendor.business_banner || null,
        business_email:       vendor.business_email,
        business_phone:       vendor.business_phone || null,
        business_address:     vendor.business_address || null,
        website:              vendor.website || null,
        payout_method:        vendor.payout_method,
        payout_account:       vendor.payout_account,
        affiliate_enabled:    vendor.affiliate_enabled,
        affiliate_commission_rate: parseFloat(vendor.affiliate_commission_rate) || 10,
      }).eq("id", vendor.id);
      setSaved("vendor");
      setTimeout(() => setSaved(null), 2500);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6" style={{ background: "#f8f7f5" }}>
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
        <p className="text-[11px] font-bold text-stone-400 capitalize pl-1">Loading Settings...</p>
      </div>
    );
  }

  const inputClass = "h-12 rounded-xl bg-white border-stone-100 focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 text-stone-900 font-bold placeholder:text-stone-300 transition-all text-sm px-6 shadow-sm disabled:opacity-50";
  const selectClass = "h-12 w-full px-6 rounded-xl border border-stone-100 bg-white text-stone-900 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 transition-all shadow-sm appearance-none";

  return (
    <div
      className="min-h-screen animate-in fade-in duration-500 pb-20 relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(251,146,60,0.03) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.03) 0%, transparent 55%), #f8f7f5",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8 px-6 pt-10 relative z-10">
        
        {/* Header - Simpler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl bg-white border border-stone-100 shadow-sm hover:bg-white active:scale-95 transition-all text-stone-500">
                <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="space-y-1">
                 <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Account Settings</h1>
                 <p className="text-[11px] font-bold text-stone-400 capitalize pl-0.5">Manage your profile and business</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-100 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 truncate max-w-[150px]">{userEmail}</span>
           </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
           <TabsList className="flex items-center gap-2 p-1 rounded-2xl bg-white/60 border border-stone-100 w-fit overflow-x-auto no-scrollbar">
               <TabsTrigger value="profile" className="px-6 py-2.5 rounded-xl text-[11px] font-bold capitalize data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(249,115,22,0.25)] shadow-none transition-all flex items-center gap-2">
                 <User className="h-3.5 w-3.5" /> Profile
               </TabsTrigger>
               {vendor && (
                 <TabsTrigger value="vendor" className="px-6 py-2.5 rounded-xl text-[11px] font-bold capitalize data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(249,115,22,0.25)] shadow-none transition-all flex items-center gap-2">
                   <Store className="h-3.5 w-3.5" /> Storefront
                 </TabsTrigger>
               )}
               <TabsTrigger value="notifications" className="px-6 py-2.5 rounded-xl text-[11px] font-bold capitalize data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(249,115,22,0.25)] shadow-none transition-all flex items-center gap-2">
                 <Bell className="h-3.5 w-3.5" /> Alerts
               </TabsTrigger>
               <TabsTrigger value="security" className="px-6 py-2.5 rounded-xl text-[11px] font-bold capitalize data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(249,115,22,0.25)] shadow-none transition-all flex items-center gap-2">
                 <Shield className="h-3.5 w-3.5" /> Security
               </TabsTrigger>
           </TabsList>

          <TabsContent value="profile" className="mt-0 space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                   <GlassCard className="p-8 rounded-[32px] border-white bg-white/60 text-center space-y-6 overflow-hidden relative">
                      <div className="relative group w-32 h-32 mx-auto">
                         <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="relative w-32 h-32 rounded-[28px] bg-white border-4 border-white shadow-lg overflow-hidden shrink-0 mx-auto">
                            <CloudinaryAvatar src={profile.avatar_url} alt={profile.full_name} size={128} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                               <CloudinaryUploadButton
                                  folder="jimvio/avatars"
                                  onUploadSuccess={(url) => setProfile(p => ({ ...p, avatar_url: url }))}
                                  buttonText=""
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                               />
                               <Camera className="h-8 w-8 text-white" />
                            </div>
                         </div>
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-stone-900">{profile.full_name || "New Member"}</h3>
                         <p className="text-[11px] font-bold text-stone-400 capitalize">@{profile.username || "unset"}</p>
                      </div>
                      <p className="text-[12px] font-medium text-stone-500 leading-relaxed">
                         Update your personal details and how you appear to the community.
                      </p>
                   </GlassCard>
                </div>

                <div className="lg:col-span-8">
                   <GlassCard className="p-8 space-y-8 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Full Name</Label>
                            <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className={inputClass} placeholder="Enter your name" />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Username</Label>
                            <div className="relative">
                               <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 font-bold text-sm">@</div>
                               <Input value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} className={cn(inputClass, "pl-12")} placeholder="username" />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Bio</Label>
                         <Textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." className="rounded-2xl bg-white border-stone-100 focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 text-stone-900 font-bold text-sm px-6 py-4 resize-none min-h-[120px] shadow-sm shadow-stone-100/10" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Website</Label>
                            <div className="relative">
                               <Globe className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                               <Input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} className={cn(inputClass, "pl-12")} placeholder="https://..." />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Phone Number</Label>
                            <div className="relative">
                               <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                               <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={cn(inputClass, "pl-12")} placeholder="+1..." />
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-stone-100">
                         <div className="flex items-center gap-3">
                            {saved === "profile" ? (
                               <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest animate-in slide-in-from-top-1">
                                  <CheckCircle2 className="h-4 w-4" /> Profile Updated
                               </div>
                            ) : (
                               <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Global visibility is ON</p>
                            )}
                         </div>
                         <Button onClick={saveProfile} disabled={isPending} className="h-11 px-10 rounded-xl bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:bg-orange-600 active:scale-95 transition-all border-none">
                            {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                            Synchronize Profile
                         </Button>
                      </div>
                   </GlassCard>
                </div>
             </div>
          </TabsContent>

          {vendor && (
            <TabsContent value="vendor" className="mt-0 space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                     <GlassCard className="p-8 rounded-[32px] border-white bg-white/60 text-center space-y-6 relative overflow-hidden">
                        <div className="relative group w-32 h-32 mx-auto">
                           <div className="absolute inset-0 bg-stone-900/5 rounded-3xl border-2 border-dashed border-stone-200 transition-all opacity-0 group-hover:opacity-100" />
                           <div className="relative w-full h-full rounded-2xl bg-white border border-stone-100 shadow-md overflow-hidden flex flex-col items-center justify-center p-2">
                              {vendor.business_logo ? (
                                 <CloudinaryImage src={vendor.business_logo} alt={vendor.business_name} fill className="object-cover" />
                              ) : (
                                 <ImageIcon className="h-10 w-10 text-stone-100" />
                              )}
                              <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                 <CloudinaryUploadButton
                                    folder="jimvio/vendor-logos"
                                    onUploadSuccess={(url) => setVendor(v => v ? ({ ...v, business_logo: url }) : null)}
                                    buttonText=""
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                 />
                                 <Camera className="h-8 w-8 text-white" />
                              </div>
                           </div>
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-stone-900">{vendor.business_name || "New Store"}</h3>
                           <p className="text-[11px] font-bold text-stone-400 capitalize">Active Vendor</p>
                        </div>
                        <p className="text-[12px] font-medium text-stone-500 leading-relaxed">
                           Manage your business information and payout preferences.
                        </p>
                     </GlassCard>
                  </div>

                  <div className="lg:col-span-8">
                     <GlassCard className="p-8 space-y-8 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden">
                        <section className="space-y-6">
                           <h3 className="text-[11px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-stone-400" /> Business Details
                           </h3>
                           <div className="space-y-6">
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Store Name *</Label>
                                 <Input value={vendor.business_name} onChange={e => setVendor(v => v ? ({ ...v, business_name: e.target.value }) : null)} className={inputClass} />
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Description</Label>
                                 <Textarea value={vendor.business_description} onChange={e => setVendor(v => v ? ({ ...v, business_description: e.target.value }) : null)} className="rounded-2xl bg-white border-stone-100 focus:ring-4 focus:ring-stone-900/5 focus:border-stone-900 text-stone-900 font-bold text-sm px-6 py-4 resize-none min-h-[100px]" />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Support Email *</Label>
                                    <div className="relative">
                                       <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                                       <Input value={vendor.business_email} onChange={e => setVendor(v => v ? ({ ...v, business_email: e.target.value }) : null)} className={cn(inputClass, "pl-12")} />
                                    </div>
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Business Address</Label>
                                    <div className="relative">
                                       <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                                       <Input value={vendor.business_address} onChange={e => setVendor(v => v ? ({ ...v, business_address: e.target.value }) : null)} className={cn(inputClass, "pl-12")} />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </section>

                        <section className="space-y-6 pt-8 border-t border-stone-100">
                           <h3 className="text-[11px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
                              <CreditCard className="h-3.5 w-3.5 text-stone-400" /> Payout Settings
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2 relative">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Method</Label>
                                 <select value={vendor.payout_method} onChange={e => setVendor(v => v ? ({ ...v, payout_method: e.target.value }) : null)} className={selectClass}>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="momo">Mobile Money</option>
                                    <option value="paypal">PayPal</option>
                                 </select>
                                 <div className="absolute right-6 top-[42px] pointer-events-none text-stone-300"><MoreVertical className="h-3.5 w-3.5" /></div>
                              </div>
                              <div className="space-y-2">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Account Number / ID</Label>
                                 <div className="relative">
                                    <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                                    <Input value={vendor.payout_account} onChange={e => setVendor(v => v ? ({ ...v, payout_account: e.target.value }) : null)} className={cn(inputClass, "pl-12 font-mono")} placeholder="Enter ID" />
                                 </div>
                              </div>
                           </div>
                        </section>

                        <section className="space-y-6 pt-8 border-t border-stone-100">
                           <h3 className="text-[11px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-stone-400" /> Affiliate Program
                           </h3>
                           <div className="flex items-center justify-between p-6 rounded-2xl bg-white border border-stone-50 shadow-sm transition-all group">
                              <div className="space-y-1">
                                 <p className="text-[13px] font-bold text-stone-900">Enable Affiliates</p>
                                 <p className="text-[10px] font-medium text-stone-400">Allow partners to promote your products</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" className="sr-only peer" checked={vendor.affiliate_enabled} onChange={e => setVendor(v => v ? ({ ...v, affiliate_enabled: e.target.checked }) : null)} />
                                 <div className="w-12 h-7 bg-stone-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                              </label>
                           </div>

                           {vendor.affiliate_enabled && (
                              <div className="space-y-2 p-1 animate-in slide-in-from-top-1">
                                 <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Base Commission (%)</Label>
                                 <Input type="number" value={vendor.affiliate_commission_rate} onChange={e => setVendor(v => v ? ({ ...v, affiliate_commission_rate: e.target.value }) : null)} className={cn(inputClass, "max-w-[120px] text-lg")} />
                              </div>
                           )}
                        </section>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-stone-100">
                           <div className="flex items-center gap-3">
                              {saved === "vendor" ? (
                                 <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest animate-in slide-in-from-top-1">
                                    <CheckCircle2 className="h-4 w-4" /> Store Updated
                                 </div>
                              ) : (
                                 <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Business status: ACTIVE</p>
                              )}
                           </div>
                           <Button onClick={saveVendor} disabled={isPending} className="h-11 px-10 rounded-xl bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-[0_8px_20px_rgba(249,115,22,0.25)] hover:bg-orange-600 active:scale-95 transition-all border-none">
                               {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                               Save Protocol
                           </Button>
                        </div>
                     </GlassCard>
                  </div>
               </div>
            </TabsContent>
          )}

          <TabsContent value="notifications" className="mt-0 animate-in fade-in duration-500">
             <div className="max-w-2xl">
                <GlassCard className="p-8 space-y-8 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden">
                   <div className="space-y-2 mb-8">
                      <h3 className="text-lg font-bold text-stone-900">Notification Preferences</h3>
                      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Choose when you want to be alerted</p>
                   </div>
                   
                   <div className="space-y-6">
                      {[
                         { label: "New Sales", desc: "Notify me when a customer buys a product" },
                         { label: "Affiliate Activity", desc: "Notify me when a partner earns a commission" },
                         { label: "Withdrawals", desc: "Notify me when a payout is processed" },
                         { label: "System Updates", desc: "Critical alerts about your account" }
                      ].map((item, i) => (
                         <div key={i} className="flex items-center justify-between gap-6 pb-6 border-b border-stone-50 last:border-0 last:pb-0">
                            <div className="space-y-1">
                               <p className="text-sm font-bold text-stone-900 tracking-tight">{item.label}</p>
                               <p className="text-[11px] font-medium text-stone-400">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                               <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                               <div className="w-10 h-6 bg-stone-200 rounded-full peer peer-checked:after:translate-x-4 peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner" />
                            </label>
                         </div>
                      ))}
                   </div>
                </GlassCard>
             </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 animate-in fade-in duration-500">
             <div className="max-w-2xl">
                <GlassCard className="p-8 space-y-8 rounded-[32px] border-white bg-white/60 shadow-sm relative overflow-hidden">
                   <div className="space-y-2 mb-8">
                      <h3 className="text-lg font-bold text-stone-900">Account Security</h3>
                      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Protect your account and assets</p>
                   </div>
                   
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Current Password</Label>
                        <Input type="password" value="••••••••••••" className={cn(inputClass, "opacity-40")} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">New Password</Label>
                        <Input type="password" className={inputClass} placeholder="Leave blank to keep current" />
                      </div>
                      <Button className="h-11 px-10 rounded-xl bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-black active:scale-95 transition-all border-none w-full">
                         Update Password
                      </Button>
                   </div>
                   
                   <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 space-y-3 mt-12">
                      <div className="flex items-center gap-2 text-rose-600">
                         <Shield className="h-4 w-4" />
                         <span className="text-[11px] font-bold uppercase tracking-widest">Delete Account</span>
                      </div>
                      <p className="text-[11px] font-medium text-rose-400 leading-relaxed">
                         Deleting your account will permanently erase all your data, including products, orders, and earnings. This action cannot be undone.
                      </p>
                      <Button variant="ghost" className="h-9 px-6 rounded-lg border border-rose-200 text-rose-500 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all w-full md:w-auto mt-2">
                         Permanently Delete Account
                      </Button>
                   </div>
                </GlassCard>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
