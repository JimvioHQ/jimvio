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
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  type ContentComment,
} from "@/lib/actions/content-hub";
import { Send, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  toggleShortVideoLike,
  recordVideoView,
  recordVideoClick,
} from "@/lib/actions/short-videos";

// ── DESIGN TOKENS ─────────────────────────────────────────
// Page bg:   #FAF8F5   Panel bg:  #FFFFFF   Subtle bg: #F3F0EA
// Border:    #E8E3D8   Border2:   #D8D3C5
// Text:      #1C1A17   Text2:     #5C574F   Muted:     #9C978D
// Coral:     #D85A30   Orange:    #F97316

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

  useEffect(() => { setIsBuffering(true); }, [clip.id]);

  return (
    <div className="absolute inset-0 w-full h-full cursor-pointer z-10" onClick={togglePlay}>
      <video
        ref={videoRef}
        key={clip.id}
        src={clip.video_url}
        autoPlay loop playsInline muted={muted}
        className="w-full h-full object-cover"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onCanPlay={() => setIsBuffering(false)}
      />
      {(isBuffering || !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-900/70 backdrop-blur-xl flex items-center justify-center border border-[#E8E3D8] shadow-xl shadow-black/10">
            {isBuffering
              ? <Loader2 className="h-7 w-7 animate-spin text-[#D85A30]" />
              : <Play className="h-7 w-7 ml-1 text-[#1C1A17]" />}
          </div>
        </div>
      )}
    </div>
  );
}

export type FeedClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  total_views?: number | null;
  total_shares?: number | null;
  hubLikes?: number;
  hubComments?: number;
  vendors?: { id: string; business_name: string; business_slug?: string; business_logo?: string } | null;
  itemType?: "clipping" | "ugc" | "short";
  video_type?: string;
  external_link?: string | null;
  communities?: { id: string; name: string; slug?: string; member_count?: number; description?: string | null; cover_image?: string | null } | null;
  products?: { id?: string; vendor_id?: string; name: string; slug?: string; price: number; currency?: string | null; images?: string[] | null; rating?: number | null; inventory_quantity?: number | null } | null;
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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState<Record<string, number>>({});

  const videoColumnRef = useRef<HTMLDivElement>(null);
  const { incrementCartCount } = useCartStore();

  const clip = clips[index];
  const likedState = clip ? liked[clip.id] : false;
  const likeCount = clip ? (clip.hubLikes ?? 0) + (likedState ? 1 : 0) : 0;
  const commentCount = clip ? (clip.hubComments ?? 0) + (localCommentCount[clip.id] ?? 0) : 0;

  const goNext = useCallback(() => setIndex((i) => (i + 1) % clips.length), [clips.length]);
  const goPrev = useCallback(() => setIndex((i) => (i - 1 + clips.length) % clips.length), [clips.length]);

  const handleAddToCart = async (clipData: FeedClip) => {
    const vendorId = clipData.vendors?.id || clipData.products?.vendor_id;
    if (!clipData.products?.id || !vendorId) return;
    setAddingToCart((prev) => ({ ...prev, [clipData.id]: true }));
    try {
      document.cookie = `jimvio_last_video_id=${clipData.id}; path=/; max-age=86400`;
      if (clipData.itemType === "short") recordVideoClick(clipData.id, clipData.products.id).catch(() => { });
      const result = await addToCart(clipData.products.id, vendorId, 1);
      if (result.success) {
        setAddedItems((prev) => ({ ...prev, [clipData.id]: true }));
        incrementCartCount(1);
        setTimeout(() => setAddedItems((prev) => ({ ...prev, [clipData.id]: false })), 2000);
      } else if (result.error === "Authentication required") {
        window.location.href = `/login?next=${window.location.pathname}`;
      } else {
        alert(result.error || "Failed to add to cart");
      }
    } finally {
      setAddingToCart((prev) => ({ ...prev, [clipData.id]: false }));
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/content?clip=${clip.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: clip.title, url }); } catch { }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

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

  useEffect(() => { setComments([]); setIsCommentsOpen(false); }, [clip?.id]);

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
    const isShort = clip.itemType === "short";
    const timer = setTimeout(() => {
      document.cookie = `jimvio_last_video_id=${clipId}; path=/; max-age=86400`;
      if (isShort) {
        recordVideoView(clipId, 5).catch(() => { });
      } else {
        fetch("/api/clips/track-view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clipId, watchedSeconds: 3.1 }) }).catch(() => { });
      }
    }, isShort ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [clip?.id, clip?.itemType]);

  if (!clips.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#FAF8F5]">
        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-[#E8E3D8] flex items-center justify-center mb-5 shadow-sm">
          <Play className="h-8 w-8 text-[#D8D3C5]" />
        </div>
        <p className="font-semibold text-[#1C1A17] text-[17px]">No clips yet</p>
        <p className="text-[14px] text-[#9C978D] mt-1.5">Check back soon for creator videos.</p>
      </div>
    );
  }

  const formatViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`;

  // ── ENGAGEMENT DATA (shared between desktop quick bar + mobile) ──
  const engagementActions = [
    {
      key: "like",
      icon: <Heart className={cn("h-5 w-5 transition-all", likedState ? "fill-rose-500 text-rose-500" : "text-[#5C574F]")} />,
      mobileIcon: <Heart className={cn("h-6 w-6 transition-all", likedState ? "fill-rose-500 text-rose-500" : "text-white")} />,
      label: likeCount.toLocaleString(),
      active: likedState,
      onClick: async () => {
        const newState = !likedState;
        setLiked((l) => ({ ...l, [clip.id]: newState }));
        if (clip.itemType === "short") {
          const res = await toggleShortVideoLike(clip.id);
          if (res.error) {
            setLiked((l) => ({ ...l, [clip.id]: !newState }));
            if (res.error === "Authentication required") {
              window.location.href = `/login?next=${window.location.pathname}`;
            }
          }
        }
      },
    },
    {
      key: "comment",
      icon: <MessageCircle className="h-5 w-5 text-[#5C574F]" />,
      mobileIcon: <MessageCircle className="h-6 w-6 text-white" />,
      label: commentCount.toLocaleString(),
      active: false,
      onClick: handleCommentClick,
    },
    {
      key: "views",
      icon: <Eye className="h-5 w-5 text-[#5C574F]" />,
      mobileIcon: <Eye className="h-6 w-6 text-white" />,
      label: formatViews(clip.total_views ?? 0),
      active: false,
      onClick: null,
    },
    {
      key: "share",
      icon: <Share2 className="h-5 w-5 text-[#5C574F]" />,
      mobileIcon: <Share2 className="h-6 w-6 text-white" />,
      label: "Share",
      active: false,
      onClick: handleShare,
    },
  ];

  return (
    <div className={cn("fixed inset-0 z-[201] flex flex-col lg:flex-row overflow-hidden bg-[#FAF8F5]", className)}>

      {/* ── VIDEO COLUMN ──────────────────────── */}
      <div
        ref={videoColumnRef}
        className="relative flex min-h-0 flex-1 items-center justify-center"
        style={{ backgroundImage: "radial-gradient(ellipse at 30% 20%, #F5F0E8 0%, #EDE9E0 60%, #E2DDD3 100%)" }}
      >
        {/* Close */}
        <button
          onClick={() => (window.location.href = "/")}
          className="absolute top-5 left-5 z-[250] h-10 px-4 bg-white dark:bg-zinc-900/85 hover:bg-white dark:bg-zinc-900 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-[#E8E3D8] transition-all shadow-sm group active:scale-95"
        >
          <X className="h-4 w-4 mr-2 text-[#5C574F] transition-transform group-hover:rotate-90" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#5C574F]">Exit</span>
        </button>

        {/* Desktop video pill */}
        <div className="relative hidden lg:flex w-full h-full items-center justify-center p-10">
          <div className="relative h-full max-h-full aspect-[9/16] w-auto max-w-[360px] rounded-3xl overflow-hidden border border-[#D8D3C5]/60 bg-[#EDE9E0] shadow-[0_20px_80px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
            {(clip.video_url || "").includes("youtube.com") || (clip.video_url || "").includes("youtu.be") ? (
              <iframe key={clip.id} src={clip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=" + (muted ? "1" : "0") + "&loop=1&controls=0"} className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]" allow="autoplay" title={clip.title} />
            ) : clip.video_url ? (
              <NativeVideoPlayer clip={clip} muted={muted} />
            ) : (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: clip.thumbnail_url ? `url(${clip.thumbnail_url})` : "linear-gradient(to bottom, #E2DDD3, #D8D3C5)" }} />
            )}

            {/* Type badge on video */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              {clip.video_type === "product" && clip.products && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900/90 backdrop-blur-md rounded-full border border-[#E8E3D8] shadow-sm">
                  <ShoppingCart className="w-3 h-3 text-[#D85A30]" />
                  <span className="text-[11px] font-bold truncate max-w-[120px] text-[#1C1A17]">{clip.products.name}</span>
                </div>
              )}
              {clip.video_type === "community" && clip.communities && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900/90 backdrop-blur-md rounded-full border border-[#E8E3D8] shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                  <span className="text-[11px] font-bold truncate max-w-[120px] text-[#1C1A17]">{clip.communities.name}</span>
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-3xl" />
          </div>
        </div>

        {/* Mobile full-bleed */}
        <div className="relative lg:hidden w-full h-full">
          {(clip.video_url || "").includes("youtube.com") || (clip.video_url || "").includes("youtu.be") ? (
            <iframe key={clip.id} src={clip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=" + (muted ? "1" : "0") + "&loop=1&controls=0"} className="absolute inset-0 w-full h-full pointer-events-none scale-[2.5]" allow="autoplay" title={clip.title} />
          ) : clip.video_url ? (
            <NativeVideoPlayer clip={clip} muted={muted} />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: clip.thumbnail_url ? `url(${clip.thumbnail_url})` : "linear-gradient(to bottom, #E2DDD3, #D8D3C5)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Mute */}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute top-5 right-5 lg:left-5 z-20 h-9 w-9 rounded-full bg-white dark:bg-zinc-900/85 hover:bg-white dark:bg-zinc-900 backdrop-blur-md flex items-center justify-center border border-[#E8E3D8] transition-all shadow-sm"
        >
          {muted ? <VolumeX className="h-4 w-4 text-[#5C574F]" /> : <Volume2 className="h-4 w-4 text-[#5C574F]" />}
        </button>

        {/* Counter pill (desktop) */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-zinc-900/85 backdrop-blur-md rounded-full border border-[#E8E3D8] shadow-sm">
          <span className="text-[12px] font-bold text-[#1C1A17]">{index + 1}</span>
          <span className="text-[12px] text-[#D8D3C5]">/</span>
          <span className="text-[12px] font-bold text-[#9C978D]">{clips.length}</span>
        </div>

        {/* Nav prev */}
        <button type="button" onClick={goPrev} className="absolute left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white dark:bg-zinc-900/85 hover:bg-white dark:bg-zinc-900 backdrop-blur-md flex items-center justify-center border border-[#E8E3D8] transition-all shadow-sm lg:left-[max(1.5rem,calc(50%-210px))]">
          <ChevronUp className="h-5 w-5 text-[#5C574F]" />
        </button>
        {/* Nav next */}
        <button type="button" onClick={goNext} className="absolute left-5 bottom-28 lg:bottom-6 z-20 h-10 w-10 rounded-full bg-white dark:bg-zinc-900/85 hover:bg-white dark:bg-zinc-900 backdrop-blur-md flex items-center justify-center border border-[#E8E3D8] transition-all shadow-sm lg:left-[max(1.5rem,calc(50%-210px))]">
          <ChevronDown className="h-5 w-5 text-[#5C574F]" />
        </button>

        {/* ── MOBILE: Right action column ── */}
        <div className="lg:hidden absolute right-3 bottom-36 z-30 flex flex-col items-center gap-3">
          {/* Creator avatar */}
          <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"} className="relative">
            <Avatar className="h-12 w-12 ring-[3px] ring-white shadow-lg shadow-black/20">
              <AvatarImage src={clip.vendors?.business_logo} />
              <AvatarFallback className="bg-[#D85A30] text-white font-black text-sm">
                {clip.vendors?.business_name?.charAt(0) ?? "V"}
              </AvatarFallback>
            </Avatar>
            {clip.vendors?.id && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <FollowButton
                  followLabel="+"
                  vendorId={clip.vendors.id}
                  className="h-6 w-6 rounded-full bg-[#D85A30] text-white text-[13px] font-black flex items-center justify-center border-2 border-white shadow-md p-0 min-w-0"
                />
              </div>
            )}
          </Link>

          {/* Gap after avatar+follow */}
          <div className="h-2" />

          {/* Action buttons */}
          {engagementActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick ?? undefined}
              disabled={!action.onClick}
              className={cn(
                "flex flex-col items-center gap-1.5 group",
                !action.onClick && "pointer-events-none"
              )}
            >
              <motion.div
                whileTap={action.onClick ? { scale: 0.85 } : undefined}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-sm shadow-black/10",
                  action.active
                    ? "bg-rose-500 border-rose-400"
                    : "bg-black/30 border-white/20 backdrop-blur-md"
                )}
              >
                {action.mobileIcon}
              </motion.div>
              <span className={cn(
                "text-[11px] font-black drop-shadow-md",
                action.active ? "text-rose-300" : "text-white"
              )}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── MOBILE: Bottom overlay (title + CTA) ── */}
        <div className="lg:hidden absolute bottom-0 left-0 right-16 z-20 p-5 pb-8">
          {/* Creator name */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] font-black text-white drop-shadow">
              @{clip.vendors?.business_slug ?? clip.vendors?.business_name ?? "creator"}
            </span>
          </div>

          {/* Video type badge */}
          <div className="mb-2">
            {clip.video_type === "product" && clip.products && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-white bg-[#D85A30] rounded-lg shadow-sm">
                <ShoppingCart className="w-3 h-3" /> {clip.products.name}
              </span>
            )}
            {clip.video_type === "community" && clip.communities && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-white bg-indigo-600 rounded-lg shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> {clip.communities.name}
              </span>
            )}
            {(clip.video_type === "general" || !clip.video_type) && clip.external_link && (
              <span className="inline-block px-2.5 py-1 text-[10px] font-black text-[#1C1A17] bg-white dark:bg-zinc-900/90 rounded-lg shadow-sm">Sponsored</span>
            )}
          </div>

          <p className="text-white text-[14px] leading-snug font-semibold drop-shadow mb-4 line-clamp-2">{clip.title}</p>

          {/* Product CTA */}
          {(!clip.video_type || clip.video_type === "product") && clip.products && (
            <div className="space-y-2.5 max-w-[290px]">
              <button
                type="button"
                onClick={() => setProductPopup(clip)}
                className="flex items-center gap-3 w-full px-3.5 py-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-lg shadow-black/15 border border-[#E8E3D8] hover:bg-[#FAF8F5] transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-[#F3F0EA] flex-shrink-0 overflow-hidden border border-[#E8E3D8]">
                  {Array.isArray(clip.products.images) && clip.products.images[0]
                    ? <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover" />
                    : <ShoppingCart className="h-5 w-5 text-[#D8D3C5] m-auto mt-2.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[#1C1A17] font-black text-[13px] truncate">{clip.products.name}</p>
                  <LocalizedPrice amount={Number(clip.products.price)} currency={clip.products.currency} className="text-[#D85A30] font-black text-[15px]" />
                </div>
              </button>
              <div className="flex gap-2">
                <button
                  className="flex-1 h-11 rounded-xl bg-[#D85A30] hover:bg-[#C24D25] text-white text-[13px] font-black transition-colors shadow-lg shadow-[#D85A30]/30 active:scale-[0.98]"
                  onClick={() => {
                    document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                    if (clip.itemType === "short" && clip.products?.id) recordVideoClick(clip.id, clip.products.id).catch(() => { });
                    if (clip.products?.slug) window.location.href = `/marketplace/${clip.products.slug}?buy=1`;
                  }}
                >
                  Buy Now
                </button>
                <button
                  disabled={addingToCart[clip.id] || addedItems[clip.id]}
                  className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 border border-[#E8E3D8] text-[#1C1A17] flex items-center justify-center transition-all shadow-md disabled:opacity-50 active:scale-[0.98]"
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(clip); }}
                >
                  {addingToCart[clip.id] ? <Loader2 className="h-4 w-4 animate-spin text-[#D85A30]" /> : addedItems[clip.id] ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ShoppingCart className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {clip.video_type === "community" && clip.communities && (
            <button
              onClick={() => {
                document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                if (clip.itemType === "short") recordVideoClick(clip.id).catch(() => { });
                window.location.href = `/groups/community/${clip.communities!.slug || clip.communities!.id}`;
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-black shadow-lg shadow-indigo-600/30 transition-colors active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" /> Join {clip.communities.name}
            </button>
          )}

          {(clip.video_type === "general" || (!clip.video_type && !!clip.external_link)) && clip.external_link && (
            <button
              onClick={() => {
                document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                if (clip.itemType === "short") recordVideoClick(clip.id).catch(() => { });
                window.open(clip.external_link!, "_blank");
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E8E3D8] text-[#1C1A17] text-[13px] font-black shadow-md transition-colors active:scale-[0.98]"
            >
              Visit Link <CornerDownRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile counter pill */}
        <div className="lg:hidden absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/20">
          <span className="text-[12px] font-bold text-white">{index + 1}</span>
          <span className="text-[12px] text-white/40">/</span>
          <span className="text-[12px] font-bold text-white/60">{clips.length}</span>
        </div>
      </div>

      {/* ── SIDEBAR (desktop) ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[440px] shrink-0 bg-white dark:bg-zinc-900 border-l border-[#E8E3D8] overflow-y-auto overscroll-contain relative z-[210] shadow-[-6px_0_24px_rgba(0,0,0,0.05)]">
        <div className="flex-1 flex flex-col">

          {/* ── DESKTOP QUICK ENGAGEMENT BAR (always visible at top) ── */}
          <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900/95 backdrop-blur-md border-b border-[#F3F0EA] px-6 py-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              {engagementActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick ?? undefined}
                  disabled={!action.onClick}
                  className={cn(
                    "flex items-center gap-2 flex-1 h-10 rounded-xl px-3 font-bold text-[13px] transition-all border",
                    !action.onClick && "pointer-events-none cursor-default",
                    action.key === "like" && action.active
                      ? "bg-rose-50 border-rose-200 text-rose-600"
                      : action.key === "like"
                        ? "bg-[#FAF8F5] border-[#E8E3D8] text-[#5C574F] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"
                        : action.onClick
                          ? "bg-[#FAF8F5] border-[#E8E3D8] text-[#5C574F] hover:bg-[#F3F0EA] hover:border-[#D8D3C5]"
                          : "bg-[#FAF8F5] border-[#E8E3D8] text-[#9C978D]"
                  )}
                >
                  <span className="shrink-0">{action.icon}</span>
                  <span className="text-[12px] font-black tabular-nums">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Creator header */}
          <div className="px-7 py-6 border-b border-[#F3F0EA]">
            <div className="flex items-center gap-4">
              <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"}>
                <Avatar className="h-12 w-12 ring-2 ring-[#E8E3D8] transition-transform hover:scale-105">
                  <AvatarImage src={clip.vendors?.business_logo} />
                  <AvatarFallback className="bg-[#F3F0EA] text-[#1C1A17] font-black text-lg">
                    {clip.vendors?.business_name?.charAt(0) ?? "V"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#1C1A17] text-[16px] tracking-tight truncate">{clip.vendors?.business_name ?? "Creator"}</p>
                {clip.vendors?.business_slug && (
                  <p className="text-[13px] text-[#9C978D] font-medium truncate">@{clip.vendors.business_slug}</p>
                )}
              </div>
              {clip.vendors?.id && (
                <FollowButton
                  followLabel="Follow"
                  vendorId={clip.vendors.id}
                  className="rounded-xl h-9 px-4 text-[12px] font-black bg-[#1C1A17] border-0 text-white hover:bg-[#2C2A27] shrink-0 transition-all uppercase tracking-tight shadow-sm active:scale-95"
                />
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="px-7 py-5 border-b border-[#F3F0EA]">
            {clip.video_type === "product" && clip.products && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 text-[11px] font-bold text-[#D85A30] bg-[#D85A30]/8 rounded-lg border border-[#D85A30]/15">
                <ShoppingCart className="w-3 h-3" /> Promoting: {clip.products.name}
              </span>
            )}
            {clip.video_type === "community" && clip.communities && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-100">
                <CheckCircle2 className="w-3 h-3" /> Community: {clip.communities.name}
              </span>
            )}
            {(clip.video_type === "general" || !clip.video_type) && clip.external_link && (
              <span className="inline-block px-2.5 py-1 mb-3 text-[11px] font-bold text-[#5C574F] bg-[#F3F0EA] rounded-lg border border-[#E8E3D8]">Sponsored Link</span>
            )}
            <p className="text-[14px] text-[#5C574F] leading-relaxed line-clamp-4">{clip.title}</p>
          </div>

          {/* Product card */}
          {(!clip.video_type || clip.video_type === "product") && clip.products && (
            <div className="px-7 py-7 border-b border-[#F3F0EA]">
              <p className="text-[10px] font-black text-[#9C978D] uppercase tracking-widest mb-4">Creator Selection</p>
              <div className="w-full rounded-[20px] overflow-hidden bg-[#FAF8F5] border border-[#E8E3D8] shadow-sm mb-5">
                <button type="button" onClick={() => setProductPopup(clip)} className="flex items-center gap-4 w-full p-4 text-left group">
                  <div className="w-18 h-18 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden border border-[#E8E3D8] shadow-sm" style={{ width: 72, height: 72 }}>
                    {Array.isArray(clip.products.images) && clip.products.images[0]
                      ? <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      : <ShoppingCart className="h-6 w-6 text-[#D8D3C5]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-black text-[#1C1A17] truncate group-hover:text-[#D85A30] transition-colors mb-0.5">{clip.products.name}</p>
                    <LocalizedPrice amount={Number(clip.products.price)} currency={clip.products.currency} className="text-[#D85A30] font-black text-[20px]" />
                  </div>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 h-12 rounded-xl bg-[#D85A30] hover:bg-[#C24D25] text-white text-[13px] font-black uppercase tracking-widest transition-all shadow-md shadow-[#D85A30]/15 active:scale-95"
                  onClick={() => {
                    document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                    if (clip.itemType === "short" && clip.products?.id) recordVideoClick(clip.id, clip.products.id).catch(() => { });
                    if (clip.products?.slug) window.location.href = `/marketplace/${clip.products.slug}?buy=1`;
                  }}
                >
                  Checkout Now
                </button>
                <button
                  disabled={addingToCart[clip.id] || addedItems[clip.id]}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-[#E8E3D8] hover:bg-[#F3F0EA] text-[#1C1A17] flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                  onClick={(e) => { e.stopPropagation(); handleAddToCart(clip); }}
                >
                  {addingToCart[clip.id] ? <Loader2 className="h-4 w-4 animate-spin text-[#D85A30]" /> : addedItems[clip.id] ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ShoppingCart className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {/* Community card */}
          {clip.video_type === "community" && clip.communities && (
            <div className="px-7 py-7 border-b border-[#F3F0EA]">
              <p className="text-[10px] font-black text-[#9C978D] uppercase tracking-widest mb-4">Exclusive Community</p>
              <div className="w-full rounded-[20px] overflow-hidden bg-[#FAF8F5] border border-[#E8E3D8] shadow-sm mb-5 group/comm">
                <div className="h-24 bg-gradient-to-br from-[#D85A30]/10 to-indigo-100/50 relative overflow-hidden">
                  {clip.communities.cover_image && <img src={clip.communities.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/comm:scale-105 transition-transform duration-700" />}
                  <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 shadow-lg border border-[#E8E3D8] flex items-center justify-center">
                      <span className="text-lg font-black text-[#D85A30]">{clip.communities.name.charAt(0)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-[17px] font-black text-[#1C1A17] mb-1">{clip.communities.name}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => <div key={i} className="h-5 w-5 rounded-full bg-[#E8E3D8] border-2 border-white" />)}
                    </div>
                    <span className="text-[11px] font-bold text-[#9C978D]">
                      {clip.communities.member_count ? formatViews(clip.communities.member_count) : "0"} members
                    </span>
                  </div>
                  {clip.communities.description
                    ? <p className="text-[13px] text-[#5C574F] line-clamp-2 mb-4 italic">{clip.communities.description}</p>
                    : (
                      <div className="space-y-2.5 mb-4">
                        {[{ icon: <Sparkles className="h-3 w-3" />, text: "Premium Networking" }, { icon: <Play className="h-3 w-3" />, text: "Exclusive Content" }, { icon: <CheckCircle2 className="h-3 w-3" />, text: "Verified Community" }].map((feat, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-[13px] font-medium text-[#5C574F]">
                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-900 border border-[#E8E3D8] flex items-center justify-center text-[#D85A30]">{feat.icon}</div>
                            {feat.text}
                          </div>
                        ))}
                      </div>
                    )}
                  <button
                    className="w-full h-11 rounded-xl bg-[#1C1A17] hover:bg-black text-white text-[13px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                    onClick={() => {
                      document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                      if (clip.itemType === "short") recordVideoClick(clip.id).catch(() => { });
                      window.location.href = `/groups/community/${clip.communities!.slug || clip.communities!.id}`;
                    }}
                  >
                    Join Hub Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* General link */}
          {(clip.video_type === "general" || (!clip.video_type && !!clip.external_link)) && clip.external_link && (
            <div className="px-7 py-6 border-b border-[#F3F0EA]">
              <p className="text-[10px] font-black text-[#9C978D] uppercase tracking-widest mb-4">Promotional Link</p>
              <button
                className="w-full h-11 rounded-xl bg-[#1C1A17] hover:bg-[#2C2A27] text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                onClick={() => {
                  document.cookie = `jimvio_last_video_id=${clip.id}; path=/; max-age=86400`;
                  if (clip.itemType === "short") recordVideoClick(clip.id).catch(() => { });
                  window.open(clip.external_link!, "_blank");
                }}
              >
                Visit Link <CornerDownRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Up Next */}
          <div className="px-7 py-6">
            <p className="text-[10px] font-black text-[#9C978D] uppercase tracking-widest mb-4">Up Next</p>
            <div className="flex flex-col gap-2">
              {clips.slice(index + 1, index + 4).map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setIndex(index + 1 + i)}
                  className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F3F0EA] transition-all text-left group border border-transparent hover:border-[#E8E3D8]"
                >
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[#F3F0EA] border border-[#E8E3D8]">
                    {c.thumbnail_url
                      ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <div className="w-full h-full flex items-center justify-center"><Play className="h-4 w-4 text-[#D8D3C5]" /></div>}
                  </div>
                  <p className="text-[13px] font-semibold text-[#5C574F] line-clamp-2 group-hover:text-[#1C1A17] transition-colors leading-tight">{c.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

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
            setLocalCommentCount((prev) => ({ ...prev, [clip.id]: (prev[clip.id] ?? 0) + 1 }));
          } else if (res.error === "Authentication required") {
            window.location.href = `/login?next=${window.location.pathname}`;
          }
        }}
      />
    </div>
  );
}

function CommentDrawer({ isOpen, onClose, comments, loading, onAddComment }: {
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
        <div className="fixed inset-0 z-[300] flex items-end lg:items-stretch lg:justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative w-full h-[72vh] bg-white dark:bg-zinc-900 rounded-t-[28px] flex flex-col overflow-hidden lg:h-full lg:w-96 lg:translate-x-0 lg:rounded-none border-t border-[#E8E3D8] shadow-[0_-8px_40px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F0EA] shrink-0">
              {/* Drag pill (mobile) */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#E8E3D8] lg:hidden" />
              <div>
                <h3 className="text-[16px] font-black text-[#1C1A17]">Comments</h3>
                {comments.length > 0 && <p className="text-[12px] text-[#9C978D] mt-0.5">{comments.length} comment{comments.length !== 1 ? "s" : ""}</p>}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#F3F0EA] rounded-full transition-colors">
                <X className="h-5 w-5 text-[#9C978D]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FAF8F5]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#D85A30]" />
                  <p className="text-[13px] text-[#9C978D]">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E8E3D8] flex items-center justify-center shadow-sm">
                    <MessageCircle className="h-6 w-6 text-[#D8D3C5]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#1C1A17]">No comments yet</p>
                  <p className="text-[12px] text-[#9C978D]">Be the first to share your thoughts!</p>
                </div>
              ) : comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-[#F3F0EA] shadow-sm">
                  <Avatar className="h-9 w-9 shrink-0 border border-[#E8E3D8]">
                    <AvatarImage src={comment.user.avatar_url} />
                    <AvatarFallback className="bg-[#F3F0EA] text-[#1C1A17] font-bold text-[11px]">{comment.user.full_name?.charAt(0) || "C"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-[13px] font-bold text-[#1C1A17] truncate">{comment.user.full_name}</p>
                      <p className="text-[11px] text-[#9C978D] shrink-0">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</p>
                    </div>
                    <p className="text-[14px] text-[#5C574F] leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-[#E8E3D8] shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#FAF8F5] rounded-2xl border border-[#E8E3D8] p-1.5 focus-within:border-[#D85A30] focus-within:ring-2 focus-within:ring-[#D85A30]/10 transition-all">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 h-9 bg-transparent border-0 px-3 text-[14px] focus:ring-0 placeholder:text-[#D8D3C5] text-[#1C1A17] outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="h-9 w-9 rounded-xl bg-[#D85A30] hover:bg-[#C24D25] text-white flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
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