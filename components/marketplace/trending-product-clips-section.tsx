"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Eye, ShoppingBag, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/marketplace/follow-button";
import { cn } from "@/lib/utils";

export type TrendingClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  total_views?: number | null;
  vendors?: { id: string; business_name: string; business_slug?: string; logo_url?: string; business_logo?: string } | null;
  products?: { id?: string; name: string; slug?: string; price: number; images?: string[] | null; rating?: number | null; inventory_quantity?: number | null } | null;
};

interface TrendingProductClipsSectionProps {
  clips: TrendingClip[];
  className?: string;
  /** Override section title (e.g. "More from creators") */
  title?: string;
}

export function TrendingProductClipsSection({ clips, className, title = "Trending Product Clips" }: TrendingProductClipsSectionProps) {
  const [modalClip, setModalClip] = useState<TrendingClip | null>(null);

  if (!clips?.length) return null;

  const logoUrl = (v: TrendingClip["vendors"]) => v?.logo_url ?? (v as { business_logo?: string } | undefined)?.business_logo;

  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.35em] text-[#9ca3af] mb-2">Creator storefront</p>
          <h2 className="text-[22px] sm:text-[24px] font-black text-text-primary flex items-center gap-3 tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/15">
              <Play className="h-5 w-5 text-[#f97316] fill-[#f97316]" />
            </span>
            {title}
          </h2>
        </div>
        <Link href="/marketplace" className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.2em] flex items-center gap-1.5 hover:gap-2.5 transition-all shrink-0">
          See All <span className="hidden sm:inline">Clips</span>
        </Link>
      </div>

      {/* Desktop: horizontal scroll of 9:16 cards */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {clips.map((clip) => (
          <div
            key={clip.id}
            role="button"
            tabIndex={0}
            onClick={() => setModalClip(clip)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setModalClip(clip); } }}
            className="group relative flex-shrink-0 w-[140px] sm:w-[160px] rounded-2xl overflow-hidden bg-[#2d2248] ring-1 ring-white/10 shadow-[0_12px_40px_-16px_rgba(26,20,40,0.45)] hover:shadow-[0_20px_50px_-20px_rgba(249,115,22,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left cursor-pointer"
          >
            <div className="aspect-[9/16] relative">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundImage: clip.thumbnail_url
                    ? `url(${clip.thumbnail_url})`
                    : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/90 via-ink-darker/20 to-transparent" />

              <div className="absolute top-2 left-2 right-2 flex items-center gap-2 z-10">
                <Avatar className="h-8 w-8 border-2 border-white/80 ring-1 ring-ink-darker/20">
                  <AvatarImage src={logoUrl(clip.vendors)} />
                  <AvatarFallback className="bg-[#f97316] text-white text-[10px] font-black">
                    {clip.vendors?.business_name?.[0] ?? "V"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-bold text-white truncate flex-1 drop-shadow-lg">
                  {clip.vendors?.business_name ?? "Creator"}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 z-10 space-y-2">
                <div className="flex items-center gap-1.5 text-white/90">
                  <Eye className="h-3 w-3" />
                  <span className="text-[10px] font-black">{(clip.total_views ?? 0).toLocaleString()}</span>
                </div>
                {clip.products && (
                  <div className="bg-ink-darker/45 backdrop-blur rounded-lg px-2 py-1.5 flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold text-white truncate flex-1">{clip.products.name}</span>
                    <ShoppingBag className="h-3 w-3 text-[#f97316] shrink-0" />
                  </div>
                )}
                {clip.vendors?.id && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      vendorId={clip.vendors.id}
                      variant="ghost"
                      className="w-full h-8 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-[10px] font-black border-0"
                    />
                  </div>
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: video + product card */}
      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] bg-ink-darker/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setModalClip(null)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg flex flex-col gap-0 bg-[#121212] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
              <button
                type="button"
                onClick={() => setModalClip(null)}
                className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-ink-darker/50 flex items-center justify-center text-white hover:bg-ink-darker/70"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="aspect-[9/16] max-h-[50vh] relative bg-ink-dark">
                {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={modalClip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=0"}
                    className="absolute inset-0 w-full h-full pointer-events-none scale-[1.2]"
                    allow="autoplay"
                    title={modalClip.title}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: modalClip.thumbnail_url
                        ? `url(${modalClip.thumbnail_url})`
                        : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-darker/80 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-[#f97316]">
                    <AvatarImage src={logoUrl(modalClip.vendors)} />
                    <AvatarFallback className="bg-[#f97316] text-white font-black">
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black truncate">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/70">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton
                      vendorId={modalClip.vendors.id}
                      className="rounded-full h-9 px-4 text-xs font-black bg-[#f97316] border-0 text-white hover:bg-[#ea580c] shrink-0"
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="p-4 border-t border-white/10 flex items-center gap-4 bg-ink-darker">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                      <img src={modalClip.products.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{modalClip.products.name}</p>
                    <p className="text-[#f97316] font-black">${Number(modalClip.products.price).toFixed(2)}</p>
                  </div>
                  <Link href={`/marketplace/${modalClip.products.slug ?? ""}?buy=1`} onClick={() => setModalClip(null)}>
                    <Button className="rounded-xl h-10 px-5 bg-[#f97316] hover:bg-[#ea580c] font-black text-white text-xs">
                      Buy Product
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
