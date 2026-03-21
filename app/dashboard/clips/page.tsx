"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Video, Plus, Eye, Share2, Download, TrendingUp, Play, Loader2, Upload, X, Pencil, Trash2, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ViralClipsPage() {
  const [clips, setClips]         = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);
  const [vendor, setVendor]       = useState<Record<string, unknown> | null>(null);
  const [influencer, setInfluencer] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts]   = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState({ title: "", description: "", video_url: "", product_id: "" });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [vendRes, infRes] = await Promise.all([
        supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      const vend = vendRes.data;
      const inf  = infRes.data;
      setVendor(vend);
      setInfluencer(inf);

      if (vend || inf) {
        const query = supabase.from("viral_clips").select(inf ? "*, products(id, name, slug)" : "*").order("created_at", { ascending: false });
        if (vend) query.eq("vendor_id", vend.id);
        else if (inf) query.eq("influencer_id", inf.id);

        const [clipsRes, prodsRes] = await Promise.all([
          query,
          supabase.from("products").select("id, name, vendor_id").eq("is_active", true).limit(100),
        ]);
        let clipsList = ((clipsRes.data ?? []) as unknown) as Record<string, unknown>[];
        if (inf && clipsList.length > 0) {
          try {
            const clipIds = clipsList.map((c: any) => c.id);
            const { data: commentRows } = await supabase.from("clip_comments").select("clip_id").in("clip_id", clipIds);
            const countByClip: Record<string, number> = {};
            (commentRows ?? []).forEach((r: { clip_id: string }) => { countByClip[r.clip_id] = (countByClip[r.clip_id] || 0) + 1; });
            clipsList = clipsList.map((c: Record<string, unknown>) => ({ ...c, _comment_count: countByClip[c.id as string] ?? 0 })) as Record<string, unknown>[];
          } catch (_) {}
        }
        setClips(clipsList);
        setProducts(prodsRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function createClip() {
    if ((!vendor && !influencer) || !form.title || !form.video_url) return;
    setCreating(true);
    const supabase = createClient();
    const insertData: any = {
      title:       form.title,
      description: form.description || null,
      video_url:   form.video_url,
      product_id:  form.product_id || null,
      is_active:   true,
    };

    if (vendor) {
      insertData.vendor_id = vendor.id;
    } else if (influencer && form.product_id) {
      const selectedProd = products.find(p => p.id === form.product_id);
      if (selectedProd) {
        insertData.vendor_id = selectedProd.vendor_id;
      }
    }

    if (influencer) insertData.influencer_id = influencer.id;

    const { data, error } = await supabase.from("viral_clips").insert(insertData).select().single();

    if (error) {
      console.error("Supabase Error details:", error.message, error.details, error.hint);
    }

    if (!error && data) {
      setClips(prev => [data, ...prev]);
      setForm({ title: "", description: "", video_url: "", product_id: "" });
      setShowForm(false);
    }
    setCreating(false);
  }

  async function toggleClip(id: string, isActive: boolean) {
    const supabase = createClient();
    await supabase.from("viral_clips").update({ is_active: !isActive }).eq("id", id);
    setClips(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
  }

  async function deleteClip(id: string) {
    if (!confirm("Delete this clip? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("viral_clips").delete().eq("id", id);
    setClips(prev => prev.filter(c => c.id !== id));
  }

  const totalViews     = clips.reduce((s, c) => s + (c.total_views as number ?? 0), 0);
  const totalShares    = clips.reduce((s, c) => s + (c.total_shares as number ?? 0), 0);
  const totalDownloads = clips.reduce((s, c) => s + (c.total_downloads as number ?? 0), 0);
  const totalConvs     = clips.reduce((s, c) => s + (c.total_conversions as number ?? 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" /></div>;

  if (!vendor && !influencer) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">My Clips</h1>
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎬</div>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Activate Creator Role First</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">Upload product clips and earn from views and sales.</p>
        <Button asChild><Link href="/dashboard/activate/creator">Activate Creator Role</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{influencer ? "My Clips" : "Viral Clips"}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{influencer ? "Product clips you’ve created. Edit or delete below." : "Upload marketing videos for influencers to share"}</p>
        </div>
        {influencer ? (
          <Button asChild>
            <Link href="/dashboard/clips/new"><Plus className="h-4 w-4 mr-2" /> Create Clip</Link>
          </Button>
        ) : (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Upload Clip
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Views"     value={totalViews.toLocaleString()}     icon={<Eye        className="h-4 w-4" />} iconColor="from-cyan-600 to-blue-600" />
        <StatCard title="Total Shares"    value={totalShares.toLocaleString()}    icon={<Share2     className="h-4 w-4" />} iconColor="from-pink-600 to-rose-600" />
        <StatCard title="Downloads"       value={totalDownloads.toLocaleString()} icon={<Download   className="h-4 w-4" />} iconColor="from-emerald-600 to-teal-600" />
        <StatCard title="Conversions"     value={totalConvs.toLocaleString()}     icon={<TrendingUp className="h-4 w-4" />} iconColor="from-amber-600 to-orange-600" />
      </div>

      {/* Upload Form */}
      {showForm && (
        <Card>
          <CardHeader className="pt-5 px-5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Upload New Clip</CardTitle>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon-sm"><X className="h-4 w-4" /></button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            <Input label="Clip Title *" placeholder="e.g. TikTok Growth Secrets Revealed" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input label="Description" placeholder="Brief description for influencers" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input label="Video URL *" type="url" placeholder="https://res.cloudinary.com/... or YouTube/Vimeo URL" value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} hint="Paste a direct video URL (Cloudinary, YouTube, Vimeo)" />
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Link to Product (optional)</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all">
                <option value="">No product linked</option>
                {products.map(p => <option key={p.id as string} value={p.id as string}>{p.name as string}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={createClip} loading={creating} disabled={!form.title || !form.video_url}>
                <Upload className="h-4 w-4" /> Upload Clip
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clips Grid */}
      {clips.length === 0 ? (
        <div className="border-2 border-dashed border-base rounded-2xl p-12 text-center hover:border-primary-500/40 hover:bg-primary-500/5 transition-all cursor-pointer group" onClick={() => setShowForm(true)}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-white" style={{ background: "linear-gradient(135deg, #4B2D8F, #7C3AED)" }}>
            <Video className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold mb-2">Upload Your First Marketing Clip</h3>
          <p className="text-sm text-muted-c mb-4 max-w-md mx-auto">Upload a short marketing video. Influencers download and share it on TikTok, Instagram, and YouTube. Track every view and conversion.</p>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Upload First Clip</Button>
          <p className="text-muted-c text-xs mt-3">Supports any video URL (Cloudinary, YouTube, Vimeo)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {clips.map((clip) => (
            <Card key={clip.id as string} hover className="overflow-hidden group">
              <div className="relative aspect-video flex items-center justify-center cursor-pointer"
                style={{ background: "linear-gradient(135deg, #1a1030, #2d1f5e)" }}>
                {clip.thumbnail_url ? (
                  <img src={clip.thumbnail_url as string} alt={clip.title as string} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl group-hover:scale-110 transition-transform">🎬</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <a href={clip.video_url as string} target="_blank" rel="noopener noreferrer">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all cursor-pointer">
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    </div>
                  </a>
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <Badge variant={clip.is_active ? "success" : "secondary"}>{clip.is_active ? "Active" : "Paused"}</Badge>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="text-xs bg-ink-darker/45 text-white rounded px-1.5 py-0.5 backdrop-blur-sm">
                    {((clip.total_views as number) ?? 0).toLocaleString()} views
                  </span>
                </div>
              </div>

              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 line-clamp-2">{clip.title as string}</p>
                {influencer && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">
                    {(clip as { products?: { name?: string } }).products?.name ? (
                      <>Product: {(clip as { products?: { name?: string } }).products?.name}</>
                    ) : (
                      "No product linked"
                    )}
                  </p>
                )}
                <div className={cn("grid gap-2 mb-3", influencer ? "grid-cols-4" : "grid-cols-4")}>
                  {influencer ? (
                    <>
                      <div className="bg-[var(--color-surface-secondary)] rounded-lg p-2 text-center">
                        <Eye className="h-3.5 w-3.5 mx-auto mb-0.5 text-[var(--color-text-muted)]" />
                        <div className="text-xs font-bold">{((clip as { total_views?: number }).total_views ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Views</div>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] rounded-lg p-2 text-center">
                        <Heart className="h-3.5 w-3.5 mx-auto mb-0.5 text-[var(--color-text-muted)]" />
                        <div className="text-xs font-bold">{((clip as { total_likes?: number }).total_likes ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Likes</div>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] rounded-lg p-2 text-center">
                        <MessageCircle className="h-3.5 w-3.5 mx-auto mb-0.5 text-[var(--color-text-muted)]" />
                        <div className="text-xs font-bold">{(clip as { _comment_count?: number })._comment_count ?? 0}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Comments</div>
                      </div>
                      <div className="bg-[var(--color-surface-secondary)] rounded-lg p-2 text-center">
                        <TrendingUp className="h-3.5 w-3.5 mx-auto mb-0.5 text-[var(--color-text-muted)]" />
                        <div className="text-xs font-bold">{((clip.total_conversions as number) ?? 0).toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Conv.</div>
                      </div>
                    </>
                  ) : (
                    [
                      { label: "Shares", value: (clip.total_shares as number ?? 0).toLocaleString(), icon: "📤" },
                      { label: "DL", value: (clip.total_downloads as number ?? 0).toLocaleString(), icon: "⬇️" },
                      { label: "Clicks", value: (clip.total_clicks as number ?? 0).toLocaleString(), icon: "🖱️" },
                      { label: "Conv.", value: (clip.total_conversions as number ?? 0).toLocaleString(), icon: "✅" },
                    ].map((s, i) => (
                      <div key={i} className="bg-[var(--color-surface-secondary)] rounded-lg p-2 text-center">
                        <div className="text-xs mb-0.5">{s.icon}</div>
                        <div className="text-xs font-bold">{s.value}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  {influencer ? (
                    <>
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/dashboard/clips/${clip.id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]" onClick={() => deleteClip(clip.id as string)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => toggleClip(clip.id as string, clip.is_active as boolean)}>
                      {clip.is_active ? <><Video className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Activate</>}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
