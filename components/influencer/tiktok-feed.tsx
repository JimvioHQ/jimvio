"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  ChevronUp,
  ChevronDown,
  ShoppingCart,
  Play,
  Volume2,
  VolumeX,
  Eye,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ProductQuickPopup } from "./product-quick-popup";
import { cn } from "@/lib/utils";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { addToCart } from "@/lib/actions/marketplace";
import { useCartStore } from "@/lib/store/use-cart-store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getContentComments, 
  addContentComment,
  type ContentComment 
} from "@/lib/actions/content-hub";
import { Send, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── DESIGN TOKENS (light mode) ───────────────────────────
// Background:  #F8F7F4 (page), #FFFFFF (panels), #F1EFE8 (subtle)

function NativeVideoPlayer({ clip, muted }: { clip: any; muted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    setIsBuffering(true);
  }, [clip.id]);

  return (
    <div className="absolute inset-0 w-full h-full cursor-pointer z-10" onClick={togglePlay}>
      <video
        ref={videoRef}
        key={clip.id}
        src={clip.video_url}
        autoPlay
        loop
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onCanPlay={() => setIsBuffering(false)}
      />
      {/* Centered Overlay */}
      {(isBuffering || !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center transition-all pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-lg flex items-center justify-center text-white/90 border border-white/20 shadow-xl">
            {isBuffering ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Play className="h-7 w-7 ml-1" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// Border:      #E2DFD8 / #D3D1C7
// Text:        #1A1917 (primary), #4A4843 (secondary), #8A8780 (muted)
// Accent:      #D85A30 (coral CTA)

export type FeedClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  total_views?: number | null;
  total_shares?: number | null;
  hubLikes?: number;
  hubComments?: number;
  vendors?: {
    id: string;
    business_name: string;
    business_slug?: string;
    business_logo?: string;
  } | null;
  itemType?: "clipping" | "ugc";
  products?: {
    id?: string;
    vendor_id?: string;
    name: string;
    slug?: string;
    price: number;
    currency?: string | null;
    images?: string[] | null;
    rating?: number | null;
    inventory_quantity?: number | null;
  } | null;
};

interface TikTokFeedProps {
  clips: FeedClip[];
  className?: string;
  initialIndex?: number;
  onClose?: () => void;
}

export function TikTokFeed({ clips, className, initialIndex = 0, onClose }: TikTokFeedProps) {
  const [index, setIndex] = useState(initialIndex);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [productPopup, setProductPopup] = useState<FeedClip | null>(null);
  const [muted, setMuted] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  
  const videoColumnRef = useRef<HTMLDivElement>(null);
  
  const { incrementCartCount } = useCartStore();

  const clip = clips[index];
  const likedState = clip ? liked[clip.id] : false;
  const likeCount = clip ? (clip.hubLikes ?? 0) + (likedState ? 1 : 0) : 0;
  const [localCommentCount, setLocalCommentCount] = useState<Record<string, number>>({});
  const commentCount = clip ? (clip.hubComments ?? 0) + (localCommentCount[clip.id] ?? 0) : 0;

  const goNext = useCallback(() => setIndex((i) => (i + 1) % clips.length), [clips.length]);
  const goPrev = useCallback(() => setIndex((i) => (i - 1 + clips.length) % clips.length), [clips.length]);

  const handleAddToCart = async (clipData: FeedClip) => {
    const vendorId = clipData.vendors?.id || clipData.products?.vendor_id;
    if (!clipData.products?.id || !vendorId) return;
    setAddingToCart(prev => ({ ...prev, [clipData.id]: true }));
    try {
      const result = await addToCart(clipData.products.id, vendorId, 1);
      if (result.success) {
        setAddedItems(prev => ({ ...prev, [clipData.id]: true }));
        incrementCartCount(1);
        setTimeout(() => setAddedItems(prev => ({ ...prev, [clipData.id]: false })), 2000);
      } else if (result.error === "Authentication required") {
        window.location.href = `/login?next=${window.location.pathname}`;
      } else {
        alert(result.error || "Failed to add to cart");
      }
    } finally {
      setAddingToCart(prev => ({ ...prev, [clipData.id]: false }));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/content?clip=${clip.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: clip.title, url: url });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchComments = async (contentId: string, itemType: any) => {
    setLoadingComments(true);
    const res = await getContentComments(contentId, itemType);
    if (res.success) setComments(res.comments || []);
    setLoadingComments(false);
  };

  const handleCommentClick = () => {
    setIsCommentsOpen(true);
    if (!comments.length) fetchComments(clip.id, clip.itemType || "clipping");
  };

  useEffect(() => {
    setComments([]);
    setIsCommentsOpen(false);
  }, [clip?.id]);

  useEffect(() => {
    const el = videoColumnRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!clip?.id) return;
    const clipId = clip.id;
    const timer = setTimeout(() => {
      fetch("/api/clips/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId, watchedSeconds: 3.1 }),
      }).catch(() => { });
    }, 3000);
    return () => clearTimeout(timer);
  }, [clip?.id]);

  if (!clips.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#8A8780] bg-[#F8F7F4]">
        <div className="w-16 h-16 rounded-2xl bg-[#F1EFE8] border border-[#E2DFD8] flex items-center justify-center mb-4">
          <Play className="h-7 w-7 text-[#CCC9C0]" />
        </div>
        <p className="font-semibold text-[#4A4843] text-[16px]">No clips yet</p>
        <p className="text-[14px] text-[#8A8780] mt-1">Check back soon for creator videos.</p>
      </div>
    );
  }

  const formatViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`;

  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row h-[calc(100vh-var(--navbar-height,108px))] overflow-hidden bg-[#F8F7F4]",
        className
      )}
    >
      {/* ── VIDEO COLUMN ──────────────────────── */}
      <div
        ref={videoColumnRef}
        className="relative flex min-h-0 flex-1 items-center justify-center bg-[#1A1917]"
      >
        {/* Optional Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-5 left-5 z-40 h-10 w-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Desktop: Shorts-style pill */}
        <div className="relative hidden lg:flex w-full h-full items-center justify-center p-8">
          <div className="relative h-full max-h-full aspect-[9/16] w-auto max-w-[360px] rounded-2xl overflow-hidden border border-white/10 bg-[#1A1917] shadow-2xl">
            {(clip.video_url || "").includes("youtube.com") || (clip.video_url || "").includes("youtu.be") ? (
              <iframe
                key={clip.id}
                src={
                  clip.video_url.replace("watch?v=", "embed/") +
                  "?autoplay=1&mute=" +
                  (muted ? "1" : "0") +
                  "&loop=1&controls=0"
                }
                className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
                allow="autoplay"
                title={clip.title}
              />
            ) : clip.video_url ? (
              <NativeVideoPlayer clip={clip} muted={muted} />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: clip.thumbnail_url
                    ? `url(${clip.thumbnail_url})`
                    : "linear-gradient(to bottom, #2C2C2A, #1A1917)",
                }}
              />
            )}
            {/* Overlay gradient on video pill */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Mobile: full-bleed */}
        <div className="relative lg:hidden w-full h-full">
          {(clip.video_url || "").includes("youtube.com") || (clip.video_url || "").includes("youtu.be") ? (
            <iframe
              key={clip.id}
              src={
                clip.video_url.replace("watch?v=", "embed/") +
                "?autoplay=1&mute=" +
                (muted ? "1" : "0") +
                "&loop=1&controls=0"
              }
              className="absolute inset-0 w-full h-full pointer-events-none scale-[2.5]"
              allow="autoplay"
              title={clip.title}
            />
          ) : clip.video_url ? (
            <NativeVideoPlayer clip={clip} muted={muted} />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: clip.thumbnail_url
                  ? `url(${clip.thumbnail_url})`
                  : "linear-gradient(to bottom, #2C2C2A, #1A1917)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </div>

        {/* Mute button */}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute top-4 right-4 lg:left-4 z-20 h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Clip counter pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full border border-white/20">
          <span className="text-[12px] font-semibold text-white/80">{index + 1}</span>
          <span className="text-[12px] text-white/40">/</span>
          <span className="text-[12px] font-semibold text-white/80">{clips.length}</span>
        </div>

        {/* Nav: prev */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all lg:left-[max(1.5rem,calc(50%-210px))]"
        >
          <ChevronUp className="h-5 w-5" />
        </button>

        {/* Nav: next */}
        <button
          type="button"
          onClick={goNext}
          className="absolute left-4 bottom-28 lg:bottom-6 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all lg:left-[max(1.5rem,calc(50%-210px))]"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* ── SIDEBAR (desktop) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] shrink-0 bg-white border-l border-[#E2DFD8] overflow-y-auto overscroll-contain">

        {/* Creator header */}
        <div className="p-6 border-b border-[#F1EFE8]">
          <div className="flex items-center gap-3.5">
            <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"}>
              <Avatar className="h-12 w-12 ring-2 ring-[#E2DFD8]">
                <AvatarImage src={clip.vendors?.business_logo} />
                <AvatarFallback className="bg-[#F1EFE8] text-[#4A4843] font-bold text-base">
                  {clip.vendors?.business_name?.charAt(0) ?? "V"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#1A1917] text-[15px] truncate">
                {clip.vendors?.business_name ?? "Creator"}
              </p>
              {clip.vendors?.business_slug && (
                <p className="text-[13px] text-[#8A8780] font-medium truncate">
                  @{clip.vendors.business_slug}
                </p>
              )}
            </div>
            {clip.vendors?.id ? (
              <FollowButton
                followLabel="Follow"
                vendorId={clip.vendors.id}
                className="rounded-lg h-9 px-4 text-[13px] font-semibold bg-[#1A1917] border-0 text-white hover:bg-[#2C2C2A] shrink-0 transition-colors"
              />
            ) : clip.vendors?.business_slug ? (
              <Link
                href={`/influencers/${clip.vendors.business_slug}`}
                className="shrink-0 rounded-lg h-9 px-4 text-[13px] font-semibold bg-[#1A1917] text-white hover:bg-[#2C2C2A] flex items-center justify-center transition-colors"
              >
                Follow
              </Link>
            ) : null}
          </div>
        </div>

        {/* Caption */}
        <div className="px-6 py-5 border-b border-[#F1EFE8]">
          <p className="text-[14px] text-[#4A4843] leading-relaxed line-clamp-4">{clip.title}</p>
        </div>

        {/* Product card */}
        {clip.products && (
          <div className="px-6 py-5 border-b border-[#F1EFE8]">
            <p className="text-[11px] font-semibold text-[#8A8780] uppercase tracking-wider mb-3">
              Featured Product
            </p>
            <button
              type="button"
              onClick={() => setProductPopup(clip)}
              className="flex items-center gap-3.5 w-full p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E2DFD8] hover:border-[#CCC9C0] hover:bg-[#F1EFE8] text-left transition-all group"
            >
              <div className="w-14 h-14 rounded-lg bg-[#E2DFD8] flex items-center justify-center shrink-0 overflow-hidden">
                {Array.isArray(clip.products.images) && clip.products.images[0] ? (
                  <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="h-6 w-6 text-[#8A8780]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917] truncate group-hover:text-[#D85A30] transition-colors">
                  {clip.products.name}
                </p>
                <LocalizedPrice
                  amount={Number(clip.products.price)}
                  currency={clip.products.currency}
                  className="text-[#D85A30] font-bold text-[15px]"
                />
                {clip.vendors && (
                  <p className="text-[12px] text-[#8A8780] font-medium truncate">
                    {clip.vendors.business_name}
                  </p>
                )}
              </div>
            </button>

            {/* CTAs */}
            <div className="flex gap-2.5 mt-3">
              <button
                className="flex-1 h-10 rounded-lg bg-[#D85A30] hover:bg-[#C24D25] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?buy=1`)}
              >
                Buy Now
              </button>
              <button
                disabled={addingToCart[clip.id] || addedItems[clip.id]}
                className="flex-1 h-10 rounded-lg bg-white border border-[#E2DFD8] hover:border-[#CCC9C0] hover:bg-[#F8F7F4] text-[#1A1917] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                onClick={(e) => { e.stopPropagation(); handleAddToCart(clip); }}
              >
                {addingToCart[clip.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : addedItems[clip.id] ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                {addedItems[clip.id] ? "Added" : "Add to Cart"}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-6 py-5">
          <p className="text-[11px] font-semibold text-[#8A8780] uppercase tracking-wider mb-4">
            Engagement
          </p>
          <div className="grid grid-cols-4 gap-3">
            {/* Like */}
            <button
              type="button"
              onClick={() => setLiked((l) => ({ ...l, [clip.id]: !l[clip.id] }))}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center border transition-all",
                liked[clip.id]
                  ? "bg-[#D85A30]/5 border-[#D85A30]/20"
                  : "bg-[#F8F7F4] border-[#E2DFD8] hover:border-[#CCC9C0] hover:bg-[#F1EFE8]"
              )}>
                <Heart className={cn("h-5 w-5 transition-colors", liked[clip.id] ? "fill-[#D85A30] text-[#D85A30]" : "text-[#4A4843]")} />
              </div>
              <span className="text-[11px] font-semibold text-[#4A4843]">
                {likeCount.toLocaleString()}
              </span>
            </button>

            {/* Comment */}
            <button type="button" onClick={handleCommentClick} className="flex flex-col items-center gap-1.5 group">
              <div className="w-11 h-11 rounded-xl bg-[#F8F7F4] border border-[#E2DFD8] hover:border-[#CCC9C0] hover:bg-[#F1EFE8] flex items-center justify-center transition-all">
                <MessageCircle className="h-5 w-5 text-[#4A4843]" />
              </div>
              <span className="text-[11px] font-semibold text-[#4A4843]">{commentCount.toLocaleString()}</span>
            </button>

            {/* Views */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-xl bg-[#F8F7F4] border border-[#E2DFD8] flex items-center justify-center">
                <Eye className="h-5 w-5 text-[#4A4843]" />
              </div>
              <span className="text-[11px] font-semibold text-[#4A4843]">
                {formatViews(clip.total_views ?? 0)}
              </span>
            </div>

            {/* Share */}
            <button onClick={handleShare} type="button" className="flex flex-col items-center gap-1.5 group">
              <div className="w-11 h-11 rounded-xl bg-[#F8F7F4] border border-[#E2DFD8] hover:border-[#CCC9C0] hover:bg-[#F1EFE8] flex items-center justify-center transition-all">
                <Share2 className="h-5 w-5 text-[#4A4843]" />
              </div>
              <span className="text-[11px] font-semibold text-[#4A4843]">Share</span>
            </button>
          </div>
        </div>

        {/* Clip list (mini navigation) */}
        <div className="mt-auto border-t border-[#F1EFE8] px-6 py-5">
          <p className="text-[11px] font-semibold text-[#8A8780] uppercase tracking-wider mb-3">
            Up Next
          </p>
          <div className="flex flex-col gap-2">
            {clips
              .slice(index + 1, index + 4)
              .map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setIndex(index + 1 + i)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F8F7F4] transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#F1EFE8]">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-4 w-4 text-[#CCC9C0]" />
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-[#4A4843] line-clamp-2 group-hover:text-[#1A1917] transition-colors">
                    {c.title}
                  </p>
                </button>
              ))}
          </div>
        </div>
      </aside>

      {/* ── MOBILE OVERLAYS ───────────────────── */}
      {/* Right side: creator + actions */}
      <div className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
        {/* Creator */}
        <div className="flex flex-col items-center gap-1.5">
          <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"}>
            <Avatar className="h-11 w-11 ring-2 ring-white/40">
              <AvatarImage src={clip.vendors?.business_logo} />
              <AvatarFallback className="bg-white text-[#1A1917] font-bold text-[13px]">
                {clip.vendors?.business_name?.charAt(0) ?? "V"}
              </AvatarFallback>
            </Avatar>
          </Link>
          {clip.vendors?.id ? (
            <FollowButton
              followLabel="+"
              vendorId={clip.vendors.id}
              className="h-7 w-7 rounded-full bg-[#D85A30] text-white text-[14px] font-bold flex items-center justify-center border-0 shadow-md"
            />
          ) : null}
        </div>

        {/* Actions */}
        {[
          {
            icon: <Heart className={cn("h-5 w-5", liked[clip.id] ? "fill-[#D85A30] text-[#D85A30]" : "text-white")} />,
            label: likeCount.toLocaleString(),
            onClick: () => setLiked((l) => ({ ...l, [clip.id]: !l[clip.id] })),
          },
          { icon: <MessageCircle className="h-5 w-5 text-white" />, label: commentCount.toLocaleString(), onClick: handleCommentClick },
          { icon: <Share2 className="h-5 w-5 text-white" />, label: "Share", onClick: handleShare },
        ].map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20">
              {action.icon}
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom: title + product */}
      <div className="lg:hidden absolute bottom-0 left-0 right-14 z-20 p-4 pb-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-auto">
        <p className="text-white text-[14px] leading-snug font-medium drop-shadow-md mb-3 line-clamp-2">{clip.title}</p>
        
        {clip.products && (
          <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
            {/* Product Mini Card */}
            <button
              type="button"
              onClick={() => setProductPopup(clip)}
              className="flex items-center gap-3 w-full p-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 text-left shadow-lg hover:bg-black/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {Array.isArray(clip.products.images) && clip.products.images[0] ? (
                  <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="h-5 w-5 text-white/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-[13px] truncate">{clip.products.name}</p>
                <LocalizedPrice
                  amount={Number(clip.products.price)}
                  currency={clip.products.currency}
                  className="text-[#D85A30] font-bold text-[13px]"
                />
              </div>
            </button>

            {/* CTAs */}
            <div className="flex items-center gap-2 text-white">
              <button
                className="flex-1 h-10 rounded-xl bg-[#D85A30] hover:bg-[#C24D25] text-white text-[13px] font-bold transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50"
                onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?buy=1`)}
              >
                Buy Now
              </button>
              <button
                disabled={addingToCart[clip.id] || addedItems[clip.id]}
                className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                onClick={(e) => { e.stopPropagation(); handleAddToCart(clip); }}
              >
                {addingToCart[clip.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : addedItems[clip.id] ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <ShoppingCart className="h-4 w-4" />}
                {addedItems[clip.id] ? "Added" : "Cart"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product popup */}
      {productPopup?.products && (
        <ProductQuickPopup
          product={productPopup.products}
          vendor={productPopup.vendors ?? null}
          open={!!productPopup}
          onClose={() => setProductPopup(null)}
        />
      )}

      <CommentDrawer
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        comments={comments}
        loading={loadingComments}
        onAddComment={async (body) => {
          if (!clip?.id) return;
          const res = await addContentComment(clip.id, clip.itemType || "clipping", body);
          if (res.success && res.comment) {
            setComments((prev) => [res.comment!, ...prev]);
            setLocalCommentCount((prev) => ({
              ...prev,
              [clip.id]: (prev[clip.id] ?? 0) + 1,
            }));
          } else if (res.error === "Authentication required") {
            window.location.href = `/login?next=${window.location.pathname}`;
          }
        }}
      />
    </div>
  );
}

function CommentDrawer({ 
  isOpen, onClose, comments, loading, onAddComment 
}: { 
  isOpen: boolean; onClose: () => void; comments: ContentComment[]; loading: boolean; onAddComment: (body: string) => Promise<void>;
}) {
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    await onAddComment(newComment);
    setNewComment("");
    setSubmitting(false);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end lg:items-stretch lg:justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full h-[70vh] bg-white rounded-t-[32px] flex flex-col overflow-hidden lg:h-full lg:w-96 lg:translate-x-0 lg:rounded-none lg:shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1EFE8] shrink-0">
              <h3 className="text-[16px] font-bold text-[#1A1917]">Comments</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[#F8F7F4] rounded-full transition-colors"
                aria-label="Close comments"
              >
                <X className="h-5 w-5 text-[#8A8780]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-[#D85A30]" />
                  <p className="text-[13px] text-[#8A8780]">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 px-8">
                  <MessageCircle className="h-8 w-8 text-[#CCC9C0]" />
                  <p className="text-[14px] font-medium text-[#4A4843]">No comments yet</p>
                  <p className="text-[12px] text-[#8A8780]">Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-9 w-9 shrink-0 shadow-sm border border-[#F1EFE8]">
                      <AvatarImage src={comment.user.avatar_url} />
                      <AvatarFallback className="bg-[#F8F7F4] text-[#1A1917] font-bold text-[11px]">
                        {comment.user.full_name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-bold text-[#1A1917] truncate">{comment.user.full_name}</p>
                        <p className="text-[11px] text-[#8A8780] shrink-0">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-[14px] text-[#4A4843] leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-[#F8F7F4] border-t border-[#E2DFD8] shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white rounded-2xl border border-[#E2DFD8] p-1.5 focus-within:border-[#D85A30] transition-colors">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 h-9 bg-transparent border-0 px-3 text-[14px] focus:ring-0 placeholder:text-[#CCC9C0] text-[#1A1917]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="h-9 w-9 rounded-xl bg-[#D85A30] hover:bg-[#C24D25] text-white flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-[#D85A30]/20"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}