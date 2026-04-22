"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video, Upload, BarChart3, DollarSign, Plus,
  Eye, Heart, MousePointer, TrendingUp, Play,
  Trash2, PauseCircle, PlayCircle, Package,
  Users, Clock, Zap, ChevronRight, Loader2,
  CheckCircle, AlertCircle, Film, X, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import {
  getMyShortVideos,
  createShortVideo,
  deleteShortVideo,
  updateShortVideo,
  getVideoEarnings,
  getVideoAnalytics,
  getMyProductsForVideo,
  getMyCommunitiesForVideo,
} from "@/lib/actions/short-videos";
import { useCloudinaryUpload } from "@/hooks/use-cloudinary-upload";

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Types
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface ShortVideo {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  duration_sec: number;
  status: "processing" | "active" | "paused" | "deleted";
  view_count: number;
  like_count: number;
  click_count: number;
  comment_count: number;
  total_earnings: number;
  created_at: string;
  video_type?: "product" | "community" | "general";
  external_link?: string | null;
  products?: { id: string; name: string; slug: string; images?: string[] } | null;
  communities?: { id: string; name: string; slug: string } | null;
}

type Tab = "videos" | "upload" | "analytics" | "earnings";

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Helpers
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Sub-components
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function StatPill({ value, label, icon, color }: { value: string; label: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-bold", color)}>
      {icon} {value} <span className="font-normal opacity-70">{label}</span>
    </div>
  );
}

function VideoCard({
  video,
  onDelete,
  onTogglePause,
  onSelect,
}: {
  video: ShortVideo;
  onDelete: (id: string) => void;
  onTogglePause: (id: string, current: string) => void;
  onSelect: (id: string) => void;
}) {
  const { formatMoney } = useCurrency();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const thumb = video.thumbnail_url
    ?? (video.products?.images?.[0] ?? null);

  const statusColor =
    video.status === "active"     ? "bg-emerald-100 text-emerald-700" :
    video.status === "processing" ? "bg-amber-100 text-amber-700" :
    "bg-zinc-100 text-zinc-500";

  return (
    <div className="bg-white dark:bg-surface rounded-none border border-zinc-100 dark:border-border shadow-none overflow-hidden group hover:shadow-none hover:border-zinc-200 dark:border-border dark:hover:border-zinc-700 transition-all">
      {/* Thumbnail */}
      <div
        className="relative aspect-[9/14] bg-zinc-50 dark:bg-surface-secondary cursor-pointer overflow-hidden"
        onClick={() => onSelect(video.id)}
      >
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-10 w-10 text-zinc-200 dark:text-zinc-700 dark:text-zinc-300" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-12 w-12 rounded-none bg-white dark:bg-surface/90 flex items-center justify-center shadow-none">
            <Play className="h-5 w-5 text-zinc-900 dark:text-white ml-0.5" />
          </div>
        </div>
        {/* Duration pill */}
        {video.duration_sec > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-none">
            {fmtDur(video.duration_sec)}
          </span>
        )}
        {/* Status */}
        <span className={cn("absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none shadow-none", statusColor)}>
          {video.status}
        </span>
        {/* Product badge */}
        {video.products && (
          <span className="absolute top-2 right-2 bg-[var(--color-accent)]/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-none flex items-center gap-1">
            <Package className="h-2.5 w-2.5" /> Linked
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-[12px] font-bold text-zinc-900 dark:text-white line-clamp-2 leading-tight">{video.title}</p>

        <div className="flex flex-wrap gap-1">
          <StatPill value={fmtNum(video.view_count)} label="views" icon={<Eye className="h-3 w-3" />} color="bg-blue-50 text-blue-600" />
          <StatPill value={fmtNum(video.like_count)} label="likes" icon={<Heart className="h-3 w-3" />} color="bg-pink-50 text-pink-600" />
          <StatPill value={fmtNum(video.comment_count)} label="comments" icon={<MessageCircle className="h-3 w-3" />} color="bg-amber-50 text-amber-600" />
          <StatPill value={fmtNum(video.click_count)} label="clicks" icon={<MousePointer className="h-3 w-3" />} color="bg-violet-50 text-violet-600" />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-50 dark:border-border">
          <span className="text-[11px] font-black text-emerald-600">
            {formatMoney(Number(video.total_earnings), "RWF")}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setToggling(true); onTogglePause(video.id, video.status); }}
              disabled={toggling || video.status === "processing"}
              className="h-7 w-7 rounded-none flex items-center justify-center bg-zinc-50 dark:bg-surface-secondary hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40"
              title={video.status === "active" ? "Pause" : "Activate"}
            >
              {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
               video.status === "active" ? <PauseCircle className="h-3.5 w-3.5 text-zinc-500" /> :
               <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />}
            </button>
            <button
              onClick={() => { setDeleting(true); onDelete(video.id); }}
              disabled={deleting}
              className="h-7 w-7 rounded-none flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
              title="Delete"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" /> :
               <Trash2 className="h-3.5 w-3.5 text-red-500" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Upload Tab
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function UploadTab({ onSuccess }: { onSuccess: () => void }) {
  const { upload, uploading, progress } = useCloudinaryUpload();
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_type: "product" as "product" | "community" | "general",
    product_id: "",
    community_id: "",
    external_link: "",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const videoDrag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyProductsForVideo().then(setProducts);
    getMyCommunitiesForVideo().then(setCommunities);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) { setResult({ error: "Please select a video file." }); return; }
    if (!form.title.trim()) { setResult({ error: "Title is required." }); return; }

    setSubmitting(true);
    setResult(null);

    try {
      // Upload video
      const videoUpload = await upload(videoFile, "video");
      if (!videoUpload?.url) throw new Error("Video upload failed");

      // Upload thumbnail if provided
      let thumbUrl: string | undefined;
      if (thumbFile) {
        const thumbUpload = await upload(thumbFile, "image");
        thumbUrl = thumbUpload?.url;
      }

      const res = await createShortVideo({
        title: form.title,
        description: form.description,
        video_url: videoUpload.url,
        thumbnail_url: thumbUrl,
        duration_sec: videoUpload.duration ? Math.round(videoUpload.duration) : 0,
        video_type: form.video_type,
        product_id: form.video_type === "product" ? (form.product_id || null) : null,
        community_id: form.video_type === "community" ? (form.community_id || null) : null,
        external_link: form.video_type === "general" ? (form.external_link || null) : null,
      });

      if (res.error) {
        setResult({ error: res.error });
        setSubmitting(false);
        return;
      }

      setResult({ ok: true });
      setForm({
        title: "",
        description: "",
        video_type: "product",
        product_id: "",
        community_id: "",
        external_link: ""
      });
      setVideoFile(null);
      setThumbFile(null);
      setTimeout(onSuccess, 1200);
    } catch (err: any) {
      console.error("Upload Catch:", err);
      setResult({ error: err.message ?? "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setVideoFile(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {/* Video drop zone */}
      <div
        ref={videoDrag}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-none p-8 text-center cursor-pointer transition-colors",
          videoFile
            ? "border-emerald-400 bg-emerald-50/50"
            : "border-zinc-200 dark:border-border bg-zinc-50 dark:bg-surface/50 hover:border-[var(--color-accent)] hover:bg-orange-50/30"
        )}
        onClick={() => document.getElementById("sv-video-input")?.click()}
      >
        <input
          id="sv-video-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
        />
        {videoFile ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <div className="text-left">
              <p className="font-bold text-sm text-zinc-900 dark:text-white">{videoFile.name}</p>
              <p className="text-xs text-zinc-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); setVideoFile(null); }} className="ml-2">
              <X className="h-4 w-4 text-zinc-400 hover:text-red-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-zinc-300" />
            <p className="text-sm font-bold text-zinc-600">Drop your video here or tap to browse</p>
            <p className="text-xs text-zinc-400">MP4, MOV, WebM Â· max 200MB</p>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploading && progress > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="h-2 rounded-none bg-zinc-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--color-accent)] to-orange-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Title *</label>
        <input
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Give your video a catchy title…"
          className="w-full h-11 rounded-none border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Tell viewers what this is about…"
          rows={3}
          className="w-full rounded-none border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]"
          maxLength={500}
        />
      </div>

      {/* Thumbnail */}
      <div>
        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Thumbnail (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-zinc-100 file:text-zinc-700 dark:text-zinc-300 file:font-bold hover:file:bg-zinc-200 cursor-pointer"
        />
      </div>

      {/* Video Type Selector */}
      <div>
        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Video Type (What are you promoting?)</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "product", label: "Product", icon: <Package className="h-4 w-4" /> },
            { id: "community", label: "Community", icon: <Users className="h-4 w-4" /> },
            { id: "general", label: "General Link", icon: <Zap className="h-4 w-4" /> },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm(f => ({ ...f, video_type: t.id as any }))}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-none border transition-all",
                form.video_type === t.id
                  ? "border-[var(--color-accent)] bg-orange-50/50 dark:bg-orange-950/20 text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
                  : "border-zinc-200 dark:border-border-strong bg-white dark:bg-surface text-zinc-500 dark:text-text-muted hover:border-zinc-300 dark:hover:border-zinc-600"
              )}
            >
              {t.icon}
              <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Inputs based on Type */}
      {form.video_type === "product" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
              <Package className="inline h-3 w-3 mr-1" />Select Product *
            </label>
            <select
              required
              value={form.product_id}
              onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full h-12 rounded-none border-2 border-zinc-100 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 text-sm font-bold focus:outline-none focus:border-[var(--color-accent)] transition-all appearance-none cursor-pointer"
            >
              <option value="">Choose a product…</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.currency} {p.price}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.product_id && products.find(p => p.id === form.product_id)?.images?.[0] && (
                <div className="relative h-16 w-16 rounded-none overflow-hidden border border-[var(--color-accent)]/30 ring-4 ring-orange-50 dark:ring-orange-950/30 animate-in zoom-in duration-300">
                  <img 
                    src={products.find(p => p.id === form.product_id).images[0]} 
                    className="h-full w-full object-cover" 
                    alt="Selected product"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-1">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">Linking a product adds a "Buy Now" card and enables automated sales attribution.</p>
          </div>
        </div>
      )}

      {form.video_type === "community" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
              <Users className="inline h-3.5 w-3.5 mr-1.5 text-indigo-500" />Select Target Community *
            </label>
            <select
              required
              value={form.community_id}
              onChange={(e) => setForm(f => ({ ...f, community_id: e.target.value }))}
              className="w-full h-12 rounded-none border-2 border-zinc-100 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Choose a community…</option>
              {communities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {form.community_id && (
              <div className="mt-3 p-3 rounded-none bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3 animate-in slide-in-from-left-2 duration-300">
                <div className="h-10 w-10 rounded-none bg-indigo-500 flex items-center justify-center text-white font-black">
                  {communities.find(c => c.id === form.community_id)?.name?.[0]}
                </div>
                <div>
                  <p className="text-[12px] font-black text-indigo-900 dark:text-indigo-300">{communities.find(c => c.id === form.community_id)?.name}</p>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Targeted for Join CTA</p>
                </div>
              </div>
            )}
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">This adds a high-conversion "Join Community" button to the video player.</p>
          </div>
        </div>
      )}

      {form.video_type === "general" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">
              <Zap className="inline h-3.5 w-3.5 mr-1.5 text-amber-500" />Destintation URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={form.external_link}
                required
                onChange={(e) => setForm(f => ({ ...f, external_link: e.target.value }))}
                placeholder="https://yourlink.com/promo"
                className="w-full h-12 rounded-none border-2 border-zinc-100 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 text-sm font-bold focus:outline-none focus:border-amber-400 transition-all"
              />
              <Zap className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300" />
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">Adds a generic "Visit Link" button. Best for personal websites or newsletters.</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn("rounded-none px-4 py-3 text-sm font-bold flex items-center gap-2",
          result.ok ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400")}>
          {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {result.ok ? "Video uploaded successfully! Redirecting…" : result.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || uploading || !videoFile}
        className="w-full h-12 rounded-none font-black text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] shadow-none shadow-orange-500/20 transition-all active:scale-95"
      >
        {uploading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {progress > 0 ? `Uploading ${progress}%` : "Sending to Storage…"}</>
        ) : submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finalizing Video…</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Publish Video</>
        )}
      </Button>
    </form>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Analytics Tab
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function AnalyticsTab({ videos }: { videos: ShortVideo[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(videos[0]?.id ?? null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    getVideoAnalytics(selectedId)
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (videos.length === 0) {
    return (
      <div className="py-20 text-center text-zinc-400">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-bold text-sm">Upload your first video to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Video selector */}
      <div>
        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 block">Select Video</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full max-w-md h-11 rounded-none border border-zinc-200 dark:border-border-strong bg-white dark:bg-surface dark:text-white px-4 text-sm font-medium"
        >
          {videos.map(v => (
            <option key={v.id} value={v.id}>{v.title}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 py-10">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-medium">Loading analytics…</span>
        </div>
      )}

      {analytics && !loading && (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Views", value: fmtNum(analytics.totalViews), icon: <Eye className="h-4 w-4" />, color: "from-blue-500 to-cyan-500" },
              { label: "Avg Watch", value: `${analytics.avgWatchSec}s`, icon: <Clock className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
              { label: "Click Rate", value: `${analytics.clickRate}%`, icon: <MousePointer className="h-4 w-4" />, color: "from-amber-500 to-orange-500" },
              { label: "Conversion", value: `${analytics.conversionRate}%`, icon: <TrendingUp className="h-4 w-4" />, color: "from-emerald-500 to-teal-500" },
            ].map(m => (
              <div key={m.label} className="rounded-none border border-zinc-100 dark:border-border bg-white dark:bg-surface p-4 shadow-none">
                <div className={cn("h-8 w-8 rounded-none text-white flex items-center justify-center mb-2 bg-gradient-to-br shadow-none", m.color)}>
                  {m.icon}
                </div>
                <p className="text-xl font-black text-zinc-900 dark:text-white">{m.value}</p>
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-text-muted uppercase tracking-wide mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Extra stats */}
          <div className="rounded-none border border-zinc-100 dark:border-border bg-white dark:bg-surface p-5 shadow-none">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted mb-3">Performance Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Total Likes</p>
                <p className="font-black text-pink-500">{fmtNum(analytics.totalLikes)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Total Comments</p>
                <p className="font-black text-amber-500">{fmtNum(analytics.totalComments)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Total Clicks</p>
                <p className="font-black text-violet-500">{fmtNum(analytics.totalClicks)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide">Conversions</p>
                <p className="font-black text-emerald-500">{analytics.conversions}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Earnings Tab
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function EarningsTab() {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVideoEarnings()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-zinc-400 py-10">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading earnings…</span>
    </div>
  );

  if (!data) return <p className="text-sm text-zinc-400 py-10">No earnings data found.</p>;

  return (
    <div className="space-y-5">
      {/* Total + breakdown */}
      <div className="rounded-none bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white shadow-none">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Video Earnings</p>
        <p className="text-4xl font-black">{formatMoney(data.total, "RWF")}</p>
        <p className="text-[11px] text-zinc-500 mt-1">Separate from affiliate & UGC earnings</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "From Views", value: data.viewEarnings, icon: <Eye className="h-4 w-4" />, color: "from-blue-500 to-cyan-500" },
          { label: "From Clicks", value: data.clickEarnings, icon: <MousePointer className="h-4 w-4" />, color: "from-violet-500 to-purple-500" },
          { label: "From Sales", value: data.saleEarnings, icon: <DollarSign className="h-4 w-4" />, color: "from-emerald-500 to-teal-500" },
        ].map(b => (
          <div key={b.label} className="rounded-none border border-zinc-100 dark:border-border bg-white dark:bg-surface p-4 shadow-none text-center">
            <div className={cn("h-8 w-8 rounded-none text-white flex items-center justify-center mx-auto mb-2 bg-gradient-to-br", b.color)}>
              {b.icon}
            </div>
            <p className="font-black text-sm text-zinc-900 dark:text-white">{formatMoney(b.value, "RWF")}
            </p>
            <p className="text-[9px] font-semibold text-zinc-400 dark:text-text-muted uppercase tracking-wide mt-0.5">{b.label}</p>
          </div>
        ))}
      </div>

      {/* Top earning videos */}
      {data.topVideos.length > 0 && (
        <div className="rounded-none border border-zinc-100 dark:border-border bg-white dark:bg-surface shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-50 dark:border-border">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-text-muted">Top Earning Videos</h3></div>
          <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {data.topVideos.map((v: any) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{v.title}</p>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmtNum(v.view_count)}</span>
                    <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{fmtNum(v.click_count)}</span>
                  </p>
                </div>
                <span className="text-sm font-black text-emerald-600 shrink-0 ml-4">
                  {formatMoney(Number(v.total_earnings), "RWF")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Earnings rate explanation */}
      <div className="rounded-none border border-zinc-100 dark:border-border bg-zinc-50 dark:bg-surface/50 p-5 space-y-2 text-xs text-zinc-500 dark:text-text-muted">
        <p className="font-black text-zinc-700 dark:text-zinc-300 text-sm">How earnings are calculated</p>
        <div className="flex items-start gap-2"><Zap className="h-3.5 w-3.5 shrink-0 text-blue-500 mt-0.5" /><span><b>Views:</b> FRw 200 per 1,000 valid views (â‰¥5 seconds watched)</span></div>
        <div className="flex items-start gap-2"><MousePointer className="h-3.5 w-3.5 shrink-0 text-violet-500 mt-0.5" /><span><b>Clicks:</b> FRw 10 per product click on your video</span></div>
        <div className="flex items-start gap-2"><TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" /><span><b>Sales:</b> 5% of order value when purchase is attributed to your video</span></div>
      </div>
    </div>
  );
}

// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// MAIN VideoStudio Component
// â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export function VideoStudio({ defaultTab = "videos" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const { videos: vids } = await getMyShortVideos();
    setVideos((vids as unknown as ShortVideo[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const handleDelete = async (id: string) => {
    await deleteShortVideo(id);
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleTogglePause = async (id: string, currentStatus: string) => {
    const next = currentStatus === "active" ? "paused" : "active";
    await updateShortVideo(id, { status: next as any });
    setVideos(prev => prev.map(v => v.id === id ? { ...v, status: next as any } : v));
  };

  const handleSelectVideo = (id: string) => {
    setSelectedVideoId(id);
    setTab("analytics");
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "videos",    label: "My Videos",  icon: <Video className="h-4 w-4" />,    count: videos.length },
    { id: "upload",    label: "Upload",     icon: <Upload className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics",  icon: <BarChart3 className="h-4 w-4" /> },
    { id: "earnings",  label: "Earnings",   icon: <DollarSign className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Film className="h-6 w-6 text-[var(--color-accent)]" /> Video Studio
          </h2>
          <p className="text-sm text-zinc-400 dark:text-text-muted font-medium mt-0.5">Upload, manage, and monetize your short videos</p>
        </div>
        <Button
          onClick={() => setTab("upload")}
          size="sm"
          className="rounded-none h-10 bg-[var(--color-accent)] font-bold shadow-none"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Video
        </Button>
      </div>

      {/* Summary stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Videos",    value: videos.length.toString(), icon: <Film className="h-4 w-4" />,         color: "from-orange-500 to-amber-500" },
          { label: "Views",     value: fmtNum(videos.reduce((s, v) => s + v.view_count, 0)), icon: <Eye className="h-4 w-4" />,     color: "from-blue-500 to-cyan-500" },
          { label: "Engaged",   value: fmtNum(videos.reduce((s, v) => s + v.like_count + v.comment_count, 0)), icon: <Zap className="h-4 w-4" />, color: "from-pink-500 to-rose-500" },
          { label: "Earned",    value: `${Math.round(videos.reduce((s, v) => s + Number(v.total_earnings), 0)).toLocaleString()} RWF`, icon: <DollarSign className="h-4 w-4" />, color: "from-emerald-500 to-teal-500" },
        ].map(s => (
          <div key={s.label} className="rounded-none border border-zinc-100 dark:border-border bg-white dark:bg-surface p-4 shadow-none flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-none text-white flex items-center justify-center shrink-0 bg-gradient-to-br", s.color)}>
              {s.icon}
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{s.value}</p>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-text-muted uppercase tracking-wide">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-surface-secondary rounded-none p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-none text-xs font-black transition-all",
              tab === t.id
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-none"
                : "text-zinc-500 dark:text-text-muted hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200"
            )}
          >
            {t.icon}
            <span className="hidden sm:block">{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={cn("text-[9px] rounded-none px-1.5 py-0.5 font-black",
                tab === t.id ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-zinc-200 text-zinc-500")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {/* â"€â"€ MY VIDEOS â"€â"€ */}
        {tab === "videos" && (
          loading ? (
            <div className="flex items-center gap-2 text-zinc-400 py-10">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading your videos…</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-border rounded-none">
              <Film className="h-12 w-12 mx-auto mb-3 text-zinc-200" />
              <p className="font-bold text-sm text-zinc-600 mb-1">No videos yet</p>
              <p className="text-xs text-zinc-400 mb-5">Upload your first short video and start earning</p>
              <Button size="sm" onClick={() => setTab("upload")} className="rounded-none h-9 font-bold bg-[var(--color-accent)]">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Upload Now
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {videos.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onDelete={handleDelete}
                  onTogglePause={handleTogglePause}
                  onSelect={handleSelectVideo}
                />
              ))}
            </div>
          )
        )}

        {/* â"€â"€ UPLOAD â"€â"€ */}
        {tab === "upload" && (
          <UploadTab onSuccess={() => { loadVideos(); setTab("videos"); }} />
        )}

        {/* â"€â"€ ANALYTICS â"€â"€ */}
        {tab === "analytics" && (
          <AnalyticsTab videos={videos} />
        )}

        {/* â"€â"€ EARNINGS â"€â"€ */}
        {tab === "earnings" && (
          <EarningsTab />
        )}
      </div>
    </div>
  );
}

