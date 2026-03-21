"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Eye, ShoppingBag, X, ChevronRight } from "lucide-react";
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
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="relative flex min-w-0 gap-4 sm:gap-5">
          <div
            className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[#f97316] via-[#fb923c] to-[#ea580c] sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#f97316]/25 bg-[#fff7ed]/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#c2410c] sm:text-[11px]">
              <Play className="h-3 w-3 shrink-0 fill-[#f97316] text-[#f97316]" aria-hidden />
              Creator storefront
            </div>
            <h2 className="font-outfit flex flex-wrap items-center gap-3 text-[26px] font-black leading-[1.1] tracking-tight text-text-primary sm:gap-3.5 sm:text-[30px] md:text-[34px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] ring-1 ring-[#f97316]/20 sm:h-11 sm:w-11">
                <Play className="h-5 w-5 fill-[#f97316] text-[#f97316] sm:h-[1.35rem] sm:w-[1.35rem]" />
              </span>
              <span>{title}</span>
            </h2>
            <p className="mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-[#6b7280] sm:text-[14px]">
              Short clips from verified sellers — tap to watch, follow, or shop the featured product.
            </p>
          </div>
        </div>
        <Link
          href="/marketplace"
          className="group inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-[#ebe8f2] bg-white px-5 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#433360] transition-all hover:border-[#f97316]/35 hover:bg-[#fff7ed] sm:w-auto"
        >
          <span>See all clips</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white transition-transform group-hover:translate-x-0.5">
            <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6">
        {clips.map((clip) => (
          <div
            key={clip.id}
            role="button"
            tabIndex={0}
            onClick={() => setModalClip(clip)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setModalClip(clip);
              }
            }}
            className="group relative w-[132px] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-[#ebe8f2] bg-[#1a1428] text-left ring-1 ring-[#433360]/10 transition-all duration-300 hover:border-[#f97316]/35 hover:ring-[#f97316]/20 active:scale-[0.99] sm:w-[152px]"
          >
            <div className="relative aspect-[9/16]">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage: clip.thumbnail_url
                    ? `url(${clip.thumbnail_url})`
                    : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a18]/95 via-[#1a1428]/35 to-transparent" />

              <div className="absolute left-2 right-2 top-2 z-10 flex min-w-0 items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0 border border-white/40">
                  <AvatarImage src={logoUrl(clip.vendors)} />
                  <AvatarFallback className="bg-[#f97316] text-[9px] font-black text-white">
                    {clip.vendors?.business_name?.[0] ?? "V"}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate text-[9px] font-bold leading-tight text-white drop-shadow-md sm:text-[10px]">
                  {clip.vendors?.business_name ?? "Creator"}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-white/95">
                  <Eye className="h-3 w-3 shrink-0 opacity-90" />
                  <span className="text-[9px] font-black tabular-nums sm:text-[10px]">{(clip.total_views ?? 0).toLocaleString()}</span>
                </div>
                {clip.products && (
                  <div className="flex items-center justify-between gap-1 rounded-lg bg-black/35 px-1.5 py-1 backdrop-blur-sm">
                    <span className="min-w-0 truncate text-[8px] font-bold leading-tight text-white sm:text-[9px]">{clip.products.name}</span>
                    <ShoppingBag className="h-3 w-3 shrink-0 text-[#f97316]" />
                  </div>
                )}
                {clip.vendors?.id && (
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <FollowButton
                      vendorId={clip.vendors.id}
                      followLabel="Follow"
                      variant="ghost"
                      className="h-7 w-full rounded-lg border-0 bg-[#f97316] px-1.5 text-[9px] font-black text-white hover:bg-[#ea580c] sm:h-8 sm:text-[10px]"
                    />
                  </div>
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm">
                  <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] bg-ink-darker/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setModalClip(null)}
            aria-hidden
          />
          <div className="pointer-events-none fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div className="pointer-events-auto relative flex w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl">
              <button
                type="button"
                onClick={() => setModalClip(null)}
                className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-ink-darker/50 text-white hover:bg-ink-darker/70"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative max-h-[50vh] aspect-[9/16] bg-ink-dark">
                {modalClip.video_url?.includes("youtube.com") || modalClip.video_url?.includes("youtu.be") ? (
                  <iframe
                    src={modalClip.video_url.replace("watch?v=", "embed/") + "?autoplay=1&mute=1&loop=1&controls=0"}
                    className="pointer-events-none absolute inset-0 h-full w-full scale-[1.2]"
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
                    <AvatarFallback className="bg-[#f97316] font-black text-white">
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] text-white/70">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton
                      vendorId={modalClip.vendors.id}
                      className="h-9 shrink-0 rounded-full border-0 bg-[#f97316] px-4 text-xs font-black text-white hover:bg-[#ea580c]"
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="flex items-center gap-4 border-t border-white/10 bg-ink-darker p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                      <img src={modalClip.products.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{modalClip.products.name}</p>
                    <p className="font-black text-[#f97316]">${Number(modalClip.products.price).toFixed(2)}</p>
                  </div>
                  <Link href={`/marketplace/${modalClip.products.slug ?? ""}?buy=1`} onClick={() => setModalClip(null)}>
                    <Button className="h-10 rounded-xl bg-[#f97316] px-5 text-xs font-black text-white hover:bg-[#ea580c]">
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
