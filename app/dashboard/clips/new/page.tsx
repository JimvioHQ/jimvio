"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Package, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type ProductOption = { id: string; name: string; slug: string };

export default function NewClipPage() {
  const router = useRouter();
  const [influencer, setInfluencer] = useState<{ id: string } | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [tagsStr, setTagsStr] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inf } = await supabase.from("influencers").select("id").eq("user_id", user.id).maybeSingle();
      setInfluencer(inf ?? null);
      if (inf) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, slug")
          .eq("status", "active")
          .eq("is_active", true)
          .limit(100);
        setProducts((prods ?? []) as ProductOption[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && !influencer) router.replace("/dashboard/activate/creator");
  }, [loading, influencer, router]);

  function getTags(): string[] {
    return tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function save(draft: boolean) {
    if (!influencer || !title.trim() || !videoUrl.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const tags = getTags();
    const insert: Record<string, unknown> = {
      influencer_id: influencer.id,
      title: title.trim(),
      description: caption.trim() || null,
      video_url: videoUrl.trim(),
      thumbnail_url: thumbnailUrl.trim() || null,
      product_id: productId || null,
      tags: tags.length ? tags : null,
      status: draft ? "draft" : "published",
      is_active: !draft,
    };
    const { data, error } = await supabase.from("viral_clips").insert(insert).select("id").single();
    if (!error && data) {
      router.push("/dashboard/clips");
      return;
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-xl">
          <Link href="/dashboard/clips"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Create Product Clip</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Upload a short video and link a product to promote.</p>
        </div>
      </div>

      <Card className="border-[var(--color-border)] shadow-[var(--shadow-sm)]">
        <CardHeader className="border-b border-[var(--color-border)] py-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-[var(--color-accent)]" />
            New clip
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unboxing the new gadget" className="rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Upload Video (URL) *</label>
            <Input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://... (direct video or Cloudinary, etc.)" className="rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-muted)] block mb-1.5">Thumbnail URL (optional)</label>
            <Input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Select product to promote</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            >
              <option value="">No product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a short caption..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Tags (comma-separated)</label>
            <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. unboxing, tech, review" className="rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => save(true)} disabled={saving || !title.trim() || !videoUrl.trim()} variant="outline" className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Draft
            </Button>
            <Button onClick={() => save(false)} disabled={saving || !title.trim() || !videoUrl.trim()} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />} Publish Clip
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/clips">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
