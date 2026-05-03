"use client";

import React, { useState, useCallback } from "react";
import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
import Link from "next/link";
import { Play, Eye, ShoppingBag, X, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/marketplace/follow-button";
import { cn } from "@/lib/utils";
import { LocalizedPrice } from "@/components/currency/localized-price";

export type TrendingClip = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  total_views?: number | null;
  vendors?: { id: string; business_name: string; business_slug?: string; logo_url?: string; business_logo?: string } | null;
  products?: {
    id?: string;
    name: string;
    slug?: string;
    price: number;
    currency?: string | null;
    images?: string[] | null;
    rating?: number | null;
    inventory_quantity?: number | null;
  } | null;
};

const getLogoUrl = (v: TrendingClip["vendors"]) =>
  v?.logo_url ?? (v as { business_logo?: string } | undefined)?.business_logo;

/** Individual clip card — shared by mobile and desktop grids */
function ClipCard({
  clip,
  logoUrl,
  onOpen,
  width,
}: {
  clip: TrendingClip;
  logoUrl: (v: TrendingClip["vendors"]) => string | undefined;
  onOpen: (c: TrendingClip) => void;
  width: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(clip)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(clip); }
      }}
      className="group relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-stone-100 dark:border-white/6 bg-white dark:bg-[#111] text-left transition-all duration-300 hover:shadow-[0_8px_32px_rgba(253,80,0,0.15)] hover:border-[#fd5000]/30 active:scale-[0.99] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      style={{ width }}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: clip.thumbnail_url
              ? `url(${clip.thumbnail_url})`
              : "linear-gradient(to bottom, var(--color-bg-dark), #431407)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Vendor row */}
        <div className="absolute left-2.5 right-2.5 top-2.5 z-10 flex min-w-0 items-center gap-1.5">
          <div className="relative shrink-0">
            <Avatar className="h-7 w-7 border border-white/20 shadow-sm transition-transform group-hover:scale-110">
              <AvatarImage src={logoUrl(clip.vendors)} />
              <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 text-[10px] font-bold text-white">
                {clip.vendors?.business_name?.[0] ?? "V"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-white dark:border-[#111] bg-emerald-500 shadow-sm" />
          </div>
          <span className="min-w-0 truncate text-[11px] font-semibold leading-tight text-white drop-shadow-md">
            {clip.vendors?.business_name ?? "Creator"}
          </span>
        </div>

        {/* Hover overlay: stats + product + follow */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <div className="flex h-6 w-fit items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 border border-white/10">
            <Eye className="h-3 w-3 shrink-0 text-[#fd5000]" />
            <span className="text-[10px] font-semibold tabular-nums text-white">{(clip.total_views ?? 0).toLocaleString()}</span>
          </div>
          {clip.products && (
            <div className="flex items-center justify-between gap-1.5 rounded-xl bg-white/95 dark:bg-[#111]/95 px-2.5 py-1.5 shadow-sm border border-stone-100 dark:border-white/10 backdrop-blur-md">
              <span className="min-w-0 truncate text-[10px] font-semibold text-[#11181c] dark:text-[#ededed]">{clip.products.name}</span>
              <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-[#fd5000]" />
            </div>
          )}
          {clip.vendors?.id && (
            <div onClick={(e) => e.stopPropagation()}>
              <FollowButton
                vendorId={clip.vendors.id}
                followLabel="Follow"
                variant="ghost"
                className="h-8 w-full rounded-full border border-white/20 bg-[#fd5000]/90 backdrop-blur-md px-2 text-[10px] font-semibold text-white hover:bg-[#fd5000] transition-all active:scale-95 shadow-[0_2px_8px_rgba(253,80,0,0.25)]"
              />
            </div>
          )}
        </div>

        {/* Static view count (hidden on hover) */}
        <div className="absolute bottom-2.5 right-2.5 z-10 group-hover:opacity-0 transition-opacity duration-300">
          <div className="flex h-5 items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2 border border-white/10">
            <Eye className="h-3 w-3 shrink-0 text-white/80" />
            <span className="text-[9px] font-semibold text-white tabular-nums">{(clip.total_views ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="flex h-12 w-12 scale-75 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md transition-all duration-500 group-hover:scale-100 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <Play className="ml-1 h-5 w-5 fill-white text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrendingProductClipsSectionProps {
  clips: TrendingClip[];
  className?: string;
  title?: string;
}

export function TrendingProductClipsSection({ clips, className, title = "Trending Product Clips" }: TrendingProductClipsSectionProps) {
  const [modalClip, setModalClip] = useState<TrendingClip | null>(null);
  const closeModal = useCallback(() => setModalClip(null), []);
  useBodyScrollLock(!!modalClip);
  useEscapeClose(!!modalClip, closeModal);

  if (!clips?.length) return null;

  const logoUrl = getLogoUrl;

  return (
    <section className={cn("space-y-5", className)}>

      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-[10px] font-semibold text-[#fd5000] tracking-wide">
            <Play className="h-3 w-3 fill-[#fd5000]" />
            Creator Storefront
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Short clips from verified sellers — tap to watch and shop.
          </p>
        </div>

        <Link
          href="/marketplace"
          className="flex items-center gap-1 text-[12px] font-semibold text-[#fd5000] hover:text-orange-700 transition-colors shrink-0 ml-4"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Single horizontal scroll row — all screen sizes */}
      <div className="flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} logoUrl={logoUrl} onOpen={setModalClip} width={140} />
        ))}
      </div>

      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] overscroll-none bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeModal}
            aria-hidden
          />
          <div className="pointer-events-none fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div className="pointer-events-auto relative flex w-full max-w-[400px] flex-col gap-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors border border-white/10"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative aspect-[9/16] bg-black max-h-[65vh]">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/20 shadow-lg">
                    <AvatarImage src={logoUrl(modalClip.vendors)} />
                    <AvatarFallback className="bg-gradient-to-br from-[#fd5000] to-orange-600 font-bold text-white">
                      {modalClip.vendors?.business_name?.[0] ?? "V"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white text-[14px]">{modalClip.vendors?.business_name ?? "Creator"}</p>
                    <p className="text-[11px] font-medium text-white/70">{(modalClip.total_views ?? 0).toLocaleString()} views</p>
                  </div>
                  {modalClip.vendors?.id && (
                    <FollowButton
                      vendorId={modalClip.vendors.id}
                      className="h-9 shrink-0 rounded-full border border-white/10 bg-white/10 backdrop-blur-md px-4 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                    />
                  )}
                </div>
              </div>
              {modalClip.products && (
                <div className="flex flex-col gap-3 p-4 bg-[#111] border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 border border-white/10">
                      {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                        <img src={modalClip.products.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white mb-0.5">{modalClip.products.name}</p>
                      <LocalizedPrice
                        amount={Number(modalClip.products.price)}
                        currency={modalClip.products.currency}
                        className="font-bold text-[#fd5000] text-[14px]"
                      />
                    </div>
                  </div>
                  <Link href={`/marketplace/${modalClip.products.slug ?? ""}?buy=1`} onClick={closeModal} className="w-full">
                    <button className="h-11 w-full rounded-full bg-[#fd5000] hover:bg-[#e04700] text-[13px] font-semibold text-white transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(253,80,0,0.3)]">
                      Shop Product
                    </button>
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
