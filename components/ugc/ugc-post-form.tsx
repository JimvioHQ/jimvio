"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Plus, Tag, Hash, Loader2, Video, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface MediaItem {
  url: string;
  type: "image" | "video";
  publicId?: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
}

interface UGCPostFormProps {
  products?: ProductOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const POST_TYPES = [
  { value: "post",     label: "Post",     emoji: "📝" },
  { value: "review",   label: "Review",   emoji: "⭐" },
  { value: "unboxing", label: "Unboxing", emoji: "📦" },
  { value: "howto",    label: "How-to",   emoji: "🎓" },
  { value: "deal",     label: "Deal",     emoji: "🔥" },
];

// ─────────────────────────────────────────────────────────────
// HASHTAG INPUT
// ─────────────────────────────────────────────────────────────
function HashtagInput({ hashtags, onChange }: { hashtags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  const addTag = useCallback(() => {
    const tag = input.replace(/^#/, "").toLowerCase().trim();
    if (tag && !hashtags.includes(tag) && hashtags.length < 30) {
      onChange([...hashtags, tag]);
      setInput("");
    }
  }, [input, hashtags, onChange]);

  return (
    <div>
      <label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 flex items-center gap-1.5">
        <Hash className="h-4 w-4 text-[var(--color-accent)]" /> Hashtags
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)] text-xs font-medium"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(hashtags.filter((h) => h !== tag))}
              className="hover:text-red-500 ml-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="fashion, lifestyle, deals…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); addTag(); } }}
          className="flex-1 h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all"
        />
        <Button size="sm" type="button" variant="outline" onClick={addTag} className="shrink-0 rounded-xl px-3">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{hashtags.length}/30</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN FORM
// ─────────────────────────────────────────────────────────────
export function UGCPostForm({ products = [], onSuccess, onCancel, className }: UGCPostFormProps) {
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState("post");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  const MAX_CAPTION = 2200;
  const remaining = MAX_CAPTION - caption.length;

  const addImageMedia = useCallback((url: string, publicId: string) => {
    setMedia((m) => m.length < 10 ? [...m, { url, type: "image", publicId }] : m);
  }, []);

  const addVideoMedia = useCallback((url: string, publicId: string) => {
    setMedia((m) => m.length < 10 ? [...m, { url, type: "video", publicId }] : m);
  }, []);

  const removeMedia = useCallback((idx: number) => setMedia((m) => m.filter((_, i) => i !== idx)), []);

  const toggleProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  }, []);

  const handleSubmit = async () => {
    if (!caption.trim() && media.length === 0) {
      toast.error("Add a caption or media to post.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ugc/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim() || null,
          media: media.map(({ url, type }) => ({ url, type })),
          postType,
          productIds: selectedProductIds,
          hashtags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      toast.success("Post published! 🎉");
      setCaption(""); setMedia([]); setHashtags([]); setSelectedProductIds([]);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden", className)}>
      {/* Post Type Selector */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-3 border-b border-[var(--color-border)]/60 overflow-x-auto no-scrollbar">
        {POST_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPostType(t.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all",
              postType === t.value
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Caption */}
        <div className="relative">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            placeholder="Share your experience… Use #hashtags to reach more people."
            rows={4}
            className="w-full resize-none px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-all leading-relaxed"
          />
          <span className={cn("absolute bottom-3 right-3 text-[10px] font-medium pointer-events-none", remaining < 100 ? "text-amber-500" : "text-[var(--color-text-muted)]")}>
            {remaining}
          </span>
        </div>

        {/* Media Preview Grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-surface-secondary)] group">
                {m.type === "video"
                  ? <video src={m.url} className="w-full h-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />
                }
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
                {m.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Video className="h-5 w-5 text-white drop-shadow" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Media Upload Buttons */}
        {media.length < 10 && (
          <div className="flex gap-2">
            <CloudinaryUploadButton
              folder="jimvio/ugc"
              resourceType="image"
              onUploadSuccess={addImageMedia}
              buttonText="📷 Photo"
              variant="outline"
              className="flex-1 [&>button]:w-full [&>button]:rounded-xl [&>button]:text-sm [&>button]:font-medium"
            />
            <CloudinaryUploadButton
              folder="jimvio/ugc"
              resourceType="video"
              onUploadSuccess={addVideoMedia}
              buttonText="🎬 Video"
              variant="outline"
              className="flex-1 [&>button]:w-full [&>button]:rounded-xl [&>button]:text-sm [&>button]:font-medium"
            />
          </div>
        )}

        {/* Hashtags */}
        <HashtagInput hashtags={hashtags} onChange={setHashtags} />

        {/* Product Tagging */}
        {products.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowProducts((s) => !s)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <Tag className="h-4 w-4 text-[var(--color-accent)]" />
              Tag product{selectedProductIds.length > 0 ? ` (${selectedProductIds.length})` : ""}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showProducts && "rotate-180")} />
            </button>
            {showProducts && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-2 space-y-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all",
                      selectedProductIds.includes(p.id)
                        ? "bg-[var(--color-accent-light)] text-[var(--color-accent)] font-medium"
                        : "hover:bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                    )}
                  >
                    <span className="text-base">{selectedProductIds.includes(p.id) ? "✓" : "○"}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
                <p className="text-xs text-[var(--color-text-muted)] text-center pt-1">Max 5 products</p>
              </div>
            )}
          </div>
        )}

        {/* Submit Row */}
        <div className="flex items-center justify-end gap-3 pt-1">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="rounded-xl">
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!caption.trim() && media.length === 0)}
            className="rounded-xl px-6 font-semibold"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitting ? "Publishing…" : "Publish Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
