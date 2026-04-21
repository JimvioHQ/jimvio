"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { slugify, cn } from "@/lib/utils";

function supabaseErrorMessage(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function CreatorSettingsClient({ communityId }: { communityId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [community, setCommunity] = useState<any>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [isFree, setIsFree] = useState(true);
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [lifetime, setLifetime] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [trialDays, setTrialDays] = useState("0");

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const CATEGORIES = ["Business", "Tech", "Marketing", "Finance", "Fitness", "Other"];

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: c, error: err } = await supabase
      .from("communities")
      .select("*")
      .eq("id", communityId)
      .single();

    if (err) {
      setError(supabaseErrorMessage(err));
    } else if (c) {
      setCommunity(c);
      setName(c.name || "");
      setSlug(c.slug || "");
      setTagline(c.tagline || "");
      setDescription(c.description || "");
      setCategory(c.category || "Other");
      setAvatarUrl(c.avatar_url || "");
      setCoverUrl(c.cover_image || "");
      setIsFree(c.is_free || false);
      setMonthly(c.monthly_price?.toString() || "");
      setYearly(c.yearly_price?.toString() || "");
      setLifetime(c.lifetime_price?.toString() || "");
      setCurrency(c.currency || "USD");
      setTrialDays(c.trial_days?.toString() || "0");
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (!name.trim()) throw new Error("Name cannot be empty.");
      const finalSlug = slug.trim() ? slugify(slug.trim()) : slugify(name);

      const updateData: any = {
        name: name.trim(),
        slug: finalSlug,
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        category: category,
        avatar_url: avatarUrl.trim() || null,
        cover_image: coverUrl.trim() || null,
        is_free: isFree,
        currency,
        trial_days: parseInt(trialDays, 10) || 0,
      };

      if (!isFree) {
        updateData.monthly_price = parseFloat(monthly) || 0;
        updateData.yearly_price = parseFloat(yearly) || 0;
        if (lifetime.trim()) updateData.lifetime_price = parseFloat(lifetime);
        else updateData.lifetime_price = null;
      } else {
        updateData.monthly_price = null;
        updateData.yearly_price = null;
        updateData.lifetime_price = null;
      }

      const supabase = createClient();
      const { error: err } = await supabase
        .from("communities")
        .update(updateData)
        .eq("id", communityId);

      if (err) throw err;
      
      setSuccessMsg("Settings updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (e) {
      setError(supabaseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCommunity() {
    if (deleteConfirm !== community?.name) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("communities")
        .delete()
        .eq("id", communityId);
        
      if (err) throw err;
      router.push("/dashboard");
    } catch (e) {
      setError(supabaseErrorMessage(e));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-[var(--color-text-muted)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage your community details and pricing.</p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-none border border-[var(--color-danger-light)] bg-[var(--color-danger-light)]/40 text-[var(--color-danger)] text-sm font-semibold">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-none border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* --- Basics --- */}
      <section className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-black text-[var(--color-text-primary)]">Basics</h2>
        
        <div>
          <label className="text-xs font-bold text-[var(--color-text-muted)]">Community Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--color-text-muted)]">URL Slug</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-[var(--color-text-muted)] font-semibold">jimvio.com/communities/</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-none flex-1" />
          </div>
        </div>

        <div>
           <label className="text-xs font-bold text-[var(--color-text-muted)]">Tagline (short pitch)</label>
           <Input value={tagline} onChange={(e) => setTagline(e.target.value.substring(0, 100))} className="mt-1 rounded-none" />
           <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{tagline.length}/100</p>
        </div>

        <div>
           <label className="text-xs font-bold text-[var(--color-text-muted)]">Description</label>
           <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 rounded-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--color-text-muted)]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* --- Graphics --- */}
      <section className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-6">
        <h2 className="text-lg font-black text-[var(--color-text-primary)]">Graphics</h2>
        
        <div>
          <label className="text-xs font-bold text-[var(--color-text-muted)] block mb-2">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 rounded-none overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={80} height={80} className="object-cover h-full w-full" unoptimized />
              ) : (
                <div className="h-full w-full flex items-center justify-center font-black text-[var(--color-text-muted)]">{name[0] || "?"}</div>
              )}
            </div>
            <CloudinaryUploadButton
              folder="jimvio/community-avatars"
              resourceType="image"
              buttonText="Upload Avatar"
              onUploadSuccess={(url) => setAvatarUrl(url)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--color-text-muted)] block mb-2">Cover Image</label>
          {coverUrl && (
            <div className="h-32 mb-3 rounded-none overflow-hidden border border-[var(--color-border)] relative max-w-md">
              <Image src={coverUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          )}
          <CloudinaryUploadButton
              folder="jimvio/community-covers"
              resourceType="image"
              buttonText="Upload Cover"
              onUploadSuccess={(url) => setCoverUrl(url)}
            />
        </div>
      </section>

      {/* --- Pricing --- */}
      <section className="rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-black text-[var(--color-text-primary)]">Pricing</h2>
        
        <div className="flex rounded-none border border-[var(--color-border)] p-1 bg-[var(--color-surface-secondary)] max-w-xs">
          <button
            type="button"
            className={cn("flex-1 py-1.5 rounded-none text-sm font-black transition-all", isFree ? "bg-[var(--color-surface)] shadow-none text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}
            onClick={() => setIsFree(true)}
          >
            Free
          </button>
          <button
            type="button"
            className={cn("flex-1 py-1.5 rounded-none text-sm font-black transition-all", !isFree ? "bg-[var(--color-surface)] shadow-none text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}
            onClick={() => setIsFree(false)}
          >
            Paid
          </button>
        </div>

        {!isFree && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Monthly</label>
                <Input value={monthly} onChange={(e) => setMonthly(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Yearly</label>
                <Input value={yearly} onChange={(e) => setYearly(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Lifetime (optional)</label>
                <Input value={lifetime} onChange={(e) => setLifetime(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--color-text-muted)]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--color-text-muted)]">Trial Days</label>
              <Input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} type="number" min="0" className="mt-1 rounded-none max-w-40" />
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-2">
         <Button
            type="button"
            className="rounded-none px-8 h-12 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black transition-all shadow-none active:scale-95"
            disabled={saving}
            onClick={saveSettings}
         >
           {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
           Save Settings
         </Button>
      </div>

      {/* --- Danger Zone --- */}
      <div className="mt-12 space-y-4 pt-10 border-t border-[var(--color-danger)]/20">
         <div className="rounded-none border border-[var(--color-danger)]/30 bg-[var(--color-danger-light)]/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
               <h3 className="text-lg font-black text-[var(--color-danger)] flex items-center gap-2">
                 <AlertTriangle size={18} /> Danger Zone
               </h3>
               <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-md font-medium">
                 Deleting your community is irreversible. It will delete all spaces, rooms, posts, and member points.
               </p>
            </div>
            <Button
               type="button"
               variant="destructive"
               className="rounded-none font-black shrink-0"
               onClick={() => setDeleteModal(true)}
            >
               <Trash2 className="h-4 w-4 mr-2" /> Delete Community
            </Button>
         </div>
      </div>

      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
         <DialogContent className="border-[var(--color-border)] bg-[var(--color-surface)]">
            <DialogHeader>
               <DialogTitle className="text-[var(--color-danger)] font-black uppercase tracking-wider">Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <p className="text-sm text-[var(--color-text-primary)] font-medium">
                 Are you absolutely sure you want to delete <span className="font-black">"{community?.name}"</span>?
               </p>
               <p className="text-sm text-[var(--color-text-muted)]">
                 Type the name of your community to confirm.
               </p>
               <Input 
                 value={deleteConfirm} 
                 onChange={(e) => setDeleteConfirm(e.target.value)} 
                 placeholder={community?.name}
                 className="rounded-none border-[var(--color-border)]"
               />
               <Button
                 className="w-full rounded-none mt-2 font-black"
                 variant="destructive"
                 disabled={deleting || deleteConfirm !== community?.name}
                 onClick={deleteCommunity}
               >
                 {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Permanently Delete"}
               </Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}

