"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useTransition } from "react";
import { User, Store, Bell, Shield, Loader2, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { normalizeVendorPayoutMethod } from "@/lib/payout-method";
import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
import { CloudinaryAvatar, CloudinaryImage } from "@/components/ui/cloudinary-image";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading]    = useState(true);
  const [saved, setSaved]        = useState<string | null>(null);
  const [userId, setUserId]      = useState<string | null>(null);

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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-sm text-muted-c mt-0.5">Manage your account and store settings</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-4 w-4" /> Profile</TabsTrigger>
          {vendor && <TabsTrigger value="store"><Store className="h-4 w-4" /> Store</TabsTrigger>}
          <TabsTrigger value="notifications"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
        <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Personal Profile</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
              {saved === "profile" && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4" /> Profile saved!
                </div>
              )}
              <div className="flex items-center gap-5">
                <CloudinaryAvatar src={profile.avatar_url} size={80} fallback={<div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold text-xl">{profile.full_name?.[0] || "?"}</div>} />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Profile Photo</p>
                  <CloudinaryUploadButton
                    folder="jimvio/avatars"
                    resourceType="image"
                    buttonText="Change Photo"
                    variant="outline"
                    onUploadSuccess={(url) => setProfile(p => ({ ...p, avatar_url: url }))}
                  />
                </div>
              </div>
              <Input label="Full Name" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
              <Input label="Username" placeholder="@username" value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
              <Textarea label="Bio" placeholder="Tell people about yourself..." value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} className="min-h-[80px]" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                <Input label="City" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} />
              </div>
              <Input label="Website" type="url" value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
              <Button onClick={saveProfile} loading={isPending}><Save className="h-4 w-4" /> Save Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Tab */}
        {vendor && (
          <TabsContent value="store">
            <Card>
              <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Store Settings</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {saved === "vendor" && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle className="h-4 w-4" /> Store settings saved!
                  </div>
                )}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">Store Logo</p>
                    {vendor.business_logo ? (
                      <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border">
                        <CloudinaryImage src={vendor.business_logo} alt="Store Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <CloudinaryUploadButton folder="jimvio/avatars" buttonText="Replace" className="text-white border-white hover:text-white" variant="outline" onUploadSuccess={(url) => setVendor(v => v ? { ...v, business_logo: url } : v)} />
                        </div>
                      </div>
                    ) : (
                      <CloudinaryDropzone folder="jimvio/avatars" className="h-24 w-24" label="Upload Logo" sublabel="" onUploadSuccess={(url) => setVendor(v => v ? { ...v, business_logo: url } : v)} />
                    )}
                  </div>
                  <div className="flex-[2] space-y-2">
                    <p className="text-sm font-medium">Store Banner</p>
                    {vendor.business_banner ? (
                       <div className="relative group w-full h-24 rounded-2xl overflow-hidden border">
                        <CloudinaryImage src={vendor.business_banner} alt="Store Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <CloudinaryUploadButton folder="jimvio/banners" buttonText="Replace Banner" className="text-white border-white hover:text-white" variant="outline" onUploadSuccess={(url) => setVendor(v => v ? { ...v, business_banner: url } : v)} />
                        </div>
                      </div>
                    ) : (
                      <CloudinaryDropzone folder="jimvio/banners" className="h-24" label="Upload Banner" sublabel="1200x400 recommended" onUploadSuccess={(url) => setVendor(v => v ? { ...v, business_banner: url } : v)} />
                    )}
                  </div>
                </div>
                <Input label="Business Name" value={vendor.business_name} onChange={e => setVendor(v => v ? { ...v, business_name: e.target.value } : v)} />
                <Textarea label="Business Description" value={vendor.business_description} onChange={e => setVendor(v => v ? { ...v, business_description: e.target.value } : v)} className="min-h-[80px]" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Business Email" type="email" value={vendor.business_email} onChange={e => setVendor(v => v ? { ...v, business_email: e.target.value } : v)} />
                  <Input label="Business Phone" value={vendor.business_phone} onChange={e => setVendor(v => v ? { ...v, business_phone: e.target.value } : v)} />
                </div>
                <Input label="Business Address" value={vendor.business_address} onChange={e => setVendor(v => v ? { ...v, business_address: e.target.value } : v)} />
                <div className="h-px bg-border-base" />
                <h3 className="text-sm font-semibold text-base">Payout Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Payout Method</label>
                    <select value={vendor.payout_method} onChange={e => setVendor(v => v ? { ...v, payout_method: e.target.value } : v)}
                      className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all">
                      <option value="mtn">MTN MoMo</option>
                      <option value="airtel">Airtel Money</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  <Input label="Payout Account" value={vendor.payout_account} onChange={e => setVendor(v => v ? { ...v, payout_account: e.target.value } : v)} />
                </div>
                <div className="h-px bg-border-base" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Affiliate Settings</h3>
                <div className="flex items-center justify-between p-3 bg-subtle rounded-lg border border-base">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Affiliate Marketing</p>
                    <p className="text-xs text-muted-c mt-0.5">Allow affiliates to promote your products</p>
                  </div>
                  <label className="cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={vendor.affiliate_enabled} onChange={e => setVendor(v => v ? { ...v, affiliate_enabled: e.target.checked } : v)} />
                    <div className={`w-11 h-6 rounded-full transition-colors ${vendor.affiliate_enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-secondary)]"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm m-1 transition-transform ${vendor.affiliate_enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </label>
                </div>
                {vendor.affiliate_enabled && (
                  <Input label="Default Commission Rate (%)" type="number" min="1" max="90" value={vendor.affiliate_commission_rate} onChange={e => setVendor(v => v ? { ...v, affiliate_commission_rate: e.target.value } : v)} />
                )}
                <Button onClick={saveVendor} loading={isPending}><Save className="h-4 w-4" /> Save Store Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {[
                { label: "New Orders",         sub: "Get notified when you receive a new order" },
                { label: "Payment Received",   sub: "Get notified when a payment is processed" },
                { label: "Affiliate Earnings", sub: "Get notified when you earn an affiliate commission" },
                { label: "New Reviews",        sub: "Get notified when customers leave a review" },
                { label: "Low Stock Alerts",   sub: "Get notified when inventory falls below threshold" },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-subtle rounded-xl border border-base">
                  <div>
                    <p className="text-sm font-medium text-base">{n.label}</p>
                    <p className="text-xs text-muted-c">{n.sub}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input type="checkbox" className="sr-only" defaultChecked />
                    <div className="w-11 h-6 rounded-full bg-[var(--color-accent)]">
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm m-1 translate-x-5" />
                    </div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader className="pt-4 px-4 pb-3"><CardTitle>Security Settings</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Change Password</h3>
                <div className="space-y-3">
                  <Input label="New Password" type="password" placeholder="Min. 8 characters" />
                  <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
                  <Button variant="outline">Update Password</Button>
                </div>
              </div>
              <div className="h-px bg-border-base" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Danger Zone</h3>
                <p className="text-xs text-muted-c mb-3">Permanent actions that cannot be undone</p>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
