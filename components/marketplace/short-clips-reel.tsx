"use client";

import React from "react";
import Link from "next/link";
import {
  Play,
  Eye,
  Heart,
  ShoppingCart,
  Users,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  video_url: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  video_type: "product" | "community" | "general";
  creator: {
    name: string;
    avatar?: string | null;
  };
  product?: {
    id?: string;
    name: string;
    price?: number;
    currency?: string;
    slug?: string;
    image?: string | null;
  } | null;
  community?: {
    id?: string;
    name: string;
    slug?: string;
    member_count?: number;
  } | null;
  external_link?: string | null;
}

interface ShortClipsReelProps {
  videos: ShortVideo[];
  className?: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export function ShortClipsReel({ videos, className }: ShortClipsReelProps) {
  if (!videos?.length) return null;

  return (
    <section className={cn("space-y-5", className)}>
      {/* ── Standard Premium Header ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-[10px] font-semibold text-red-600 dark:text-red-400 tracking-wide">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600" />
            </span>
            Live Feed
          </span>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight leading-tight">
            Creator <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fd5000] to-orange-600">Shorts</span>
          </h2>
          <p className="text-[12px] text-[#889096] dark:text-[#6a6a6a] font-medium">
            Discover and shop trending creator content.
          </p>
        </div>

        <Link
          href="/shorts"
          className="flex items-center gap-1 text-[12px] font-semibold text-[#fd5000] hover:text-orange-700 transition-colors shrink-0 ml-4"
        >
          Watch all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Premium Scrollable Reel ── */}
      <div className="flex flex-nowrap gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="shrink-0 group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#111] border border-stone-100 dark:border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
            style={{ width: "clamp(155px, 44vw, 190px)" }}
          >
            {/* ── VIDEO PLAYER PORTION ── */}
            <Link 
              href={`/shorts?clip=${video.id}`} 
              className="block relative aspect-[9/12] overflow-hidden rounded-t-2xl bg-stone-100 dark:bg-stone-900"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                style={{
                  backgroundImage: video.thumbnail_url
                    ? `url(${video.thumbnail_url})`
                    : "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              {/* Top Floating Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[9px] font-semibold text-white tracking-wide">Live</span>
                 </div>
                 {video.video_type !== "general" && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full border border-white/10 text-[9px] font-semibold text-white backdrop-blur-md",
                      video.video_type === "community" ? "bg-indigo-600/60" : "bg-[#fd5000]/60"
                    )}>
                      {video.video_type === "community" ? <Users className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
                      {video.video_type === "community" ? "Circle" : "Viral"}
                    </div>
                 )}
              </div>

              {/* Bottom Video Metadata */}
              <div className="absolute inset-x-0 bottom-0 p-3 pt-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full border border-white/20 overflow-hidden bg-white shadow-sm transition-transform group-hover:scale-110">
                    {video.creator.avatar ? (
                      <img src={video.creator.avatar} alt={video.creator.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-stone-800 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                        {video.creator.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-white tracking-tight truncate drop-shadow-md">
                    {video.creator.name}
                  </span>
                </div>
                
                <h3 className="text-[13px] font-bold text-white leading-tight line-clamp-1 tracking-tight drop-shadow-md">
                   {video.title}
                </h3>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-white/90 text-[10px] font-semibold drop-shadow-md">
                    <Eye className="h-3 w-3 text-white/80" />
                    {formatCount(video.total_views)}
                  </div>
                  <div className="flex items-center gap-1 text-white/90 text-[10px] font-semibold drop-shadow-md">
                    <Heart className="h-3 w-3 text-pink-500 fill-pink-500" />
                    {formatCount(video.total_likes)}
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </Link>

            {/* ── CONVERSION SECTION (Grounded UI) ── */}
            <div className="p-3 bg-stone-50 dark:bg-[#0a0a0a] border-t border-stone-100 dark:border-white/6 space-y-2 relative z-10 flex-1 flex flex-col justify-between">
              {video.video_type === "product" && video.product ? (
                <div className="space-y-2 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#11181c] dark:text-[#ededed] truncate tracking-tight">
                        {video.product.name}
                      </p>
                    </div>
                    {video.product.price != null && (
                      <div className="shrink-0 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
                        <p className="text-[11px] font-bold text-[#fd5000] leading-none">
                          {video.product.currency || "$"}{Number(video.product.price).toFixed(0)}
                        </p>
                      </div>
                    )}
                  </div>
                  <Link 
                    href={`/marketplace/${video.product.slug}?buy=1`}
                    className="flex items-center justify-center gap-1.5 w-full h-9 mt-auto rounded-full bg-[#11181c] dark:bg-white text-white dark:text-[#11181c] hover:bg-stone-800 dark:hover:bg-stone-100 text-[11px] font-semibold transition-all transform active:scale-95 shadow-sm"
                  >
                    View Product
                  </Link>
                </div>
              ) : video.video_type === "community" && video.community ? (
                <div className="space-y-2 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#11181c] dark:text-[#ededed] truncate tracking-tight">
                        {video.community.name}
                      </p>
                      <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {formatCount(video.community.member_count || 0)} Members
                      </p>
                    </div>
                  </div>
                  <Link 
                    href={`/groups/community/${video.community.slug}`}
                    className="flex items-center justify-center gap-1.5 w-full h-9 mt-auto rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all transform active:scale-95 shadow-sm"
                  >
                    Join Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col h-full">
                  <p className="text-[12px] font-semibold text-[#11181c] dark:text-[#ededed] truncate tracking-tight mb-1">
                    Visit Sponsor Link
                  </p>
                  <a 
                    href={video.external_link || "#"}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 w-full h-9 mt-auto rounded-full bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-stone-900 dark:text-white text-[11px] font-semibold transition-all active:scale-95 shadow-sm border border-stone-200 dark:border-white/10"
                  >
                    Explore <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
