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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/marketplace/follow-button";
import { ProductQuickPopup } from "./product-quick-popup";
import { cn } from "@/lib/utils";

export type FeedClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  total_views?: number | null;
  total_shares?: number | null;
  vendors?: { id: string; business_name: string; business_slug?: string; business_logo?: string } | null;
  products?: {
    id?: string;
    name: string;
    slug?: string;
    price: number;
    images?: string[] | null;
    rating?: number | null;
    inventory_quantity?: number | null;
  } | null;
};

interface TikTokFeedProps {
  clips: FeedClip[];
  className?: string;
}

export function TikTokFeed({ clips, className }: TikTokFeedProps) {
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [productPopup, setProductPopup] = useState<FeedClip | null>(null);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const clip = clips[index];
  const likeCount = clip ? Math.round((clip.total_views ?? 0) * 0.12) : 0;
  const commentCount = clip ? Math.round((clip.total_views ?? 0) * 0.005) : 0;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % clips.length);
  }, [clips.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + clips.length) % clips.length);
  }, [clips.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  if (!clips.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#9ca3af]">
        <Play className="h-16 w-16 mb-4 opacity-50" />
        <p className="font-bold text-lg">No clips yet</p>
        <p className="text-sm">Check back soon for creator videos.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col lg:flex-row h-[calc(100vh-var(--navbar-height,108px))] min-h-[calc(100vh-var(--navbar-height,108px))] max-h-[100dvh] overflow-hidden bg-ink-dark",
        className
      )}
    >
      {/* LEFT: Desktop = centered Shorts-style pill; mobile = full bleed */}
      <div className="relative flex-1 min-w-0 flex items-center justify-center bg-ink-dark">
        {/* Desktop: vertical Shorts-style container (centered pill, 9:16) */}
        <div className="relative hidden lg:flex w-full h-full items-center justify-center p-4">
          <div className="relative h-full max-h-full aspect-[9/16] w-auto max-w-[360px] rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-ink-dark">
            {clip.video_url.includes("youtube.com") || clip.video_url.includes("youtu.be") ? (
              <iframe
                key={clip.id}
                src={clip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=" + (muted ? "1" : "0") + "&loop=1&controls=0"}
                className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
                allow="autoplay"
                title={clip.title}
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: clip.thumbnail_url
                    ? `url(${clip.thumbnail_url})`
                    : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
                }}
              />
            )}
          </div>
        </div>
        {/* Mobile: full-bleed video */}
        <div className="relative lg:hidden w-full h-full flex items-center justify-center">
          {clip.video_url.includes("youtube.com") || clip.video_url.includes("youtu.be") ? (
            <iframe
              key={clip.id}
              src={clip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=" + (muted ? "1" : "0") + "&loop=1&controls=0"}
              className="absolute inset-0 w-full h-full pointer-events-none scale-[2.5]"
              allow="autoplay"
              title={clip.title}
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: clip.thumbnail_url
                  ? `url(${clip.thumbnail_url})`
                  : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 via-transparent to-ink-darker/40" />
        </div>

        {/* Mute — top left */}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute top-4 left-4 lg:top-6 lg:left-1/2 lg:-translate-x-1/2 z-20 w-10 h-10 rounded-full bg-ink-darker/45 flex items-center justify-center text-white hover:bg-ink-darker/60"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {/* Nav arrows — desktop: sides of pill; mobile: left edge */}
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-ink-darker/35 flex items-center justify-center text-white hover:bg-ink-darker/50 lg:left-[max(1rem,calc(50%-200px))]"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute left-4 bottom-24 lg:bottom-8 z-20 w-12 h-12 rounded-full bg-ink-darker/35 flex items-center justify-center text-white hover:bg-ink-darker/50 lg:left-[max(1rem,calc(50%-200px))]"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* RIGHT: All details — desktop only; on mobile these stay as overlays below */}
      <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] shrink-0 bg-ink-darker border-l border-white/10 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Creator + Follow */}
          <div className="flex items-center gap-4">
            <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"} className="shrink-0">
              <Avatar className="h-14 w-14 border-2 border-[#f97316]/50">
                <AvatarImage src={clip.vendors?.business_logo} />
                <AvatarFallback className="bg-[#f97316] text-white font-black text-lg">
                  {clip.vendors?.business_name?.charAt(0) ?? "V"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-white font-black truncate">{clip.vendors?.business_name ?? "Creator"}</p>
              {clip.vendors?.business_slug && (
                <p className="text-[#9ca3af] text-sm font-medium truncate">@{clip.vendors.business_slug}</p>
              )}
            </div>
            {clip.vendors?.id ? (
              <FollowButton followLabel="Follow" vendorId={clip.vendors.id} className="rounded-full h-9 px-5 text-sm font-black bg-[#f97316] border-0 text-white hover:bg-[#ea580c] shrink-0" />
            ) : clip.vendors?.business_slug ? (
              <Link href={`/influencers/${clip.vendors.business_slug}`} className="shrink-0 rounded-full h-9 px-5 text-sm font-black bg-[#f97316] text-white hover:bg-[#ea580c] flex items-center justify-center border-0">
                Follow
              </Link>
            ) : null}
          </div>

          {/* Caption */}
          <p className="text-white text-sm font-medium leading-relaxed line-clamp-4">{clip.title}</p>

          {/* Product card — click = popup */}
          {clip.products && (
            <button
              type="button"
              onClick={() => setProductPopup(clip)}
              className="flex items-center gap-4 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors"
            >
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                {Array.isArray(clip.products.images) && clip.products.images[0] ? (
                  <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="h-7 w-7 text-white/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-black text-sm truncate">{clip.products.name}</p>
                <p className="text-[#f97316] font-black">${Number(clip.products.price).toFixed(2)}</p>
                {clip.vendors && (
                  <p className="text-[#9ca3af] text-xs font-medium truncate">{clip.vendors.business_name}</p>
                )}
              </div>
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 rounded-xl h-11 bg-[#f97316] hover:bg-[#ea580c] font-black text-white"
              onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?buy=1`)}
            >
              Buy Now
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11 border-white/20 text-white hover:bg-white/10 font-bold"
              onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?cart=1`)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>

          {/* Stats row — TikTok style */}
          <div className="flex items-center gap-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setLiked((l) => ({ ...l, [clip.id]: !l[clip.id] }))}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Heart className={cn("h-6 w-6 text-white", liked[clip.id] && "fill-red-500 text-red-500")} />
              </div>
              <span className="text-xs font-bold text-white/80">{(likeCount + (liked[clip.id] ? 1 : 0)).toLocaleString()}</span>
            </button>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-bold text-white/80">{commentCount.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold text-white/80">{(clip.total_views ?? 0).toLocaleString()}</span>
              <span className="text-[10px] text-white/50 font-bold uppercase">Views</span>
            </div>
            <button type="button" className="flex flex-col items-center gap-0.5 ml-auto">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-bold text-white/80">Share</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE: Overlay details (bottom + right icons) */}
      <div className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-5 pr-3">
        <div className="flex flex-col items-center gap-2">
          <Link href={clip.vendors?.business_slug ? `/influencers/${clip.vendors.business_slug}` : "#"} className="flex flex-col items-center">
            <Avatar className="h-12 w-12 border-2 border-white/30 ring-2 ring-[#f97316]">
              <AvatarImage src={clip.vendors?.business_logo} />
              <AvatarFallback className="bg-[#f97316] text-white font-black">
                {clip.vendors?.business_name?.charAt(0) ?? "V"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-black text-white mt-1 drop-shadow-lg text-center max-w-[70px] truncate">
              {clip.vendors?.business_name ?? "Creator"}
            </span>
          </Link>
          {clip.vendors?.id ? (
            <FollowButton followLabel="Follow" vendorId={clip.vendors.id} className="rounded-full h-8 px-4 text-xs font-black bg-[#f97316] border-0 text-white shadow-lg" />
          ) : clip.vendors?.business_slug ? (
            <Link href={`/influencers/${clip.vendors.business_slug}`} className="rounded-full h-8 px-4 text-xs font-black bg-[#f97316] text-white flex items-center justify-center border-0 shadow-lg">
              Follow
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={() => setLiked((l) => ({ ...l, [clip.id]: !l[clip.id] }))} className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Heart className={cn("h-5 w-5 text-white", liked[clip.id] && "fill-red-500 text-red-500")} />
            </div>
            <span className="text-[10px] font-black text-white drop-shadow-lg">{(likeCount + (liked[clip.id] ? 1 : 0)).toLocaleString()}</span>
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-[10px] font-black text-white drop-shadow-lg">{commentCount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-black text-white drop-shadow-lg">{(clip.total_views ?? 0).toLocaleString()}</span>
            <span className="text-[8px] text-white/80 font-bold">Views</span>
          </div>
          <button type="button" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Share2 className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
      <div className="lg:hidden absolute bottom-0 left-0 right-20 z-20 p-4 pb-8">
        <p className="text-white text-sm font-bold drop-shadow-lg mb-2 line-clamp-2">{clip.title}</p>
        {clip.products && (
          <button
            type="button"
            onClick={() => setProductPopup(clip)}
            className="flex items-center gap-3 w-full max-w-[280px] p-2.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-left"
          >
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              {Array.isArray(clip.products.images) && clip.products.images[0] ? (
                <img src={clip.products.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-white/80" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-black text-xs truncate">{clip.products.name}</p>
              <p className="text-[#f97316] font-black text-xs">${Number(clip.products.price).toFixed(2)}</p>
            </div>
          </button>
        )}
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            className="rounded-xl bg-[#f97316] hover:bg-[#ea580c] font-black text-white h-9 px-4 text-xs"
            onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?buy=1`)}
          >
            Buy Now
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl bg-white/20 border border-white/30 text-white font-bold h-9 px-4 text-xs"
            onClick={() => clip.products?.slug && (window.location.href = `/marketplace/${clip.products.slug}?cart=1`)}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Cart
          </Button>
        </div>
      </div>

      {/* Product quick popup (TikTok Shop style) */}
      {productPopup?.products && (
        <ProductQuickPopup
          product={productPopup.products}
          vendor={productPopup.vendors ?? null}
          open={!!productPopup}
          onClose={() => setProductPopup(null)}
        />
      )}
    </div>
  );
}
