"use client";

import React, { useState, useCallback } from "react";
import { useBodyScrollLock, useEscapeClose } from "@/hooks/use-body-scroll-lock";
import Link from "next/link";
import { Play, Eye, ShoppingBag, X, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

/** Individual clip card â€” shared by mobile and desktop grids */
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
      className="group relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface text-left ring-1 ring-white/5 transition-all duration-300 hover:border-primary/50 hover:ring-primary/20 active:scale-[0.99] shadow-lg shadow-black/20"
      style={{ width }}
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
        <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/25 to-transparent" />

        {/* Vendor row */}
        <div className="absolute left-2.5 right-2.5 top-2.5 z-10 flex min-w-0 items-center gap-1.5">
          <div className="relative shrink-0">
            <Avatar className="h-6 w-6 border-2 border-white/50 shadow-sm transition-transform group-hover:scale-110">
              <AvatarImage src={logoUrl(clip.vendors)} />
              <AvatarFallback className="bg-[#f97316] text-[9px] font-black text-white">
                {clip.vendors?.business_name?.[0] ?? "V"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-surface bg-emerald-500 shadow-sm" />
          </div>
          <span className="min-w-0 truncate text-[10px] font-black leading-tight text-white drop-shadow-md">
            {clip.vendors?.business_name ?? "Creator"}
          </span>
        </div>

        {/* Hover overlay: stats + product + follow */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <div className="flex h-5 w-fit items-center gap-1 rounded-full bg-black/40 px-2 ">
            <Eye className="h-3 w-3 shrink-0 text-[#f97316]" />
            <span className="text-[9px] font-black tabular-nums text-white">{(clip.total_views ?? 0).toLocaleString()}</span>
          </div>
          {clip.products && (
            <div className="flex items-center justify-between gap-1.5 rounded-xl bg-white dark:bg-surface-secondary px-2 py-1 shadow-lg border border-border">
              <span className="min-w-0 truncate text-[9px] font-black text-bg-dark dark:text-text-primary">{clip.products.name}</span>
              <ShoppingBag className="h-3 w-3 shrink-0 text-primary" />
            </div>
          )}
          {clip.vendors?.id && (
            <div onClick={(e) => e.stopPropagation()}>
              <FollowButton
                vendorId={clip.vendors.id}
                followLabel="Follow"
                variant="ghost"
                className="h-7 w-full rounded-xl border-0 bg-[#f97316] px-2 text-[9px] font-black text-white hover:bg-[#ea580c] transition-all active:scale-95"
              />
            </div>
          )}
        </div>

        {/* Static view count (hidden on hover) */}
        <div className="absolute bottom-2.5 right-2.5 z-10 group-hover:opacity-0 transition-opacity duration-300">
          <div className="flex h-5 items-center gap-1 rounded-full bg-black/40 px-2 ">
            <Eye className="h-3 w-3 shrink-0 text-white/60" />
            <span className="text-[9px] font-black text-white tabular-nums">{(clip.total_views ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="flex h-11 w-11 scale-90 items-center justify-center rounded-full border border-white/25 bg-white dark:bg-surface/10 transition-transform group-hover:scale-100">
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
  /** Override section title (e.g. "More from creators") */
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
    <section className={cn("space-y-4", className)}>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="relative flex min-w-0 gap-4 sm:gap-5">
          <div
            className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[#f97316] via-[#fb923c] to-[#ea580c] sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 dark:bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary sm:text-[11px] shadow-sm">
              <Play className="h-3 w-3 shrink-0 fill-primary text-primary" aria-hidden />
              Creator storefront
            </div>
            <h2 className="font-outfit flex flex-wrap items-center gap-3 text-[26px] font-black leading-[1.1] tracking-tight text-text-primary sm:gap-3.5 sm:text-[30px] md:text-[34px]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-surface to-bg ring-1 ring-primary/20 sm:h-11 sm:w-11 shadow-inner">
                <Play className="h-5 w-5 fill-primary text-primary sm:h-[1.35rem] sm:w-[1.35rem]" />
              </span>
              <span>{title}</span>
            </h2>
            <p className="mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-text-muted sm:text-[14px]">
              Short clips from verified sellers â€” tap to watch, follow, or shop the featured product.
            </p>
          </div>
        </div>
        <Link
          href="/marketplace"
          className="group inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-border bg-white dark:bg-surface px-5 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-text-primary transition-all hover:border-primary/50 hover:bg-surface-secondary sm:w-auto shadow-sm"
        >
          <span>See all clips</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-bg-dark font-black transition-transform group-hover:translate-x-0.5">
            <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Single horizontal scroll row â€” all screen sizes */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {clips.map((clip) => (
          <ClipCard key={clip.id} clip={clip} logoUrl={logoUrl} onOpen={setModalClip} width={140} />
        ))}
      </div>

      {modalClip && (
        <>
          <div
            className="fixed inset-0 z-[1000] overscroll-none bg-ink-darker/80 animate-in fade-in duration-200"
            onClick={closeModal}
            aria-hidden
          />
          <div className="pointer-events-none fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <div className="pointer-events-auto relative flex w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl">
              <button
                type="button"
                onClick={closeModal}
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
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-surface/10">
                    {Array.isArray(modalClip.products.images) && modalClip.products.images[0] ? (
                      <img src={modalClip.products.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">{modalClip.products.name}</p>
                    <LocalizedPrice
                      amount={Number(modalClip.products.price)}
                      currency={modalClip.products.currency}
                      className="font-black text-[#f97316]"
                    />
                  </div>
                  <Link href={`/marketplace/${modalClip.products.slug ?? ""}?buy=1`} onClick={closeModal}>
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
