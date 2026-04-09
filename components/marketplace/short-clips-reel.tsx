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
    <section className={cn("space-y-6", className)}>
      {/* ── Standard Premium Header ── */}
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-[10px] font-black uppercase tracking-[0.14em] text-orange-600 border border-orange-100/50 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600" />
            </span>
            Live Feed
          </div>
          <h2 className="text-[28px] md:text-[34px] font-black leading-none text-zinc-900 tracking-[-0.03em]">
            Creator <span className="text-orange-600">Shorts</span>
          </h2>
          <p className="text-[13px] font-medium text-zinc-400">Discover and shop trending creator content</p>
        </div>

        <Link
          href="/shorts"
          className="group flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-zinc-950 hover:bg-black text-white text-[12px] font-black uppercase tracking-[0.12em] transition-all active:scale-[0.97] shadow-lg shadow-zinc-950/10"
        >
          Watch All
          <Play className="h-3 w-3 fill-white group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Premium Scrollable Reel ── */}
      <div className="flex flex-nowrap gap-5 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="shrink-0 group relative flex flex-col overflow-hidden rounded-[20px] bg-white border border-zinc-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_15px_40px_-12px_rgba(249,115,22,0.1)] hover:border-orange-100/50 transition-all duration-500 hover:-translate-y-1.5"
            style={{ width: "clamp(160px, 45vw, 190px)" }}
          >
            {/* ── VIDEO PLAYER PORTION ── */}
            <Link 
              href={`/shorts?clip=${video.id}`} 
              className="block relative aspect-[9/11] overflow-hidden rounded-t-[23px] bg-zinc-100"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                style={{
                  backgroundImage: video.thumbnail_url
                    ? `url(${video.thumbnail_url})`
                    : "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />

              {/* Top Floating Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                 <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[8px] font-black text-white uppercase tracking-[0.1em]">Live Now</span>
                 </div>
                 {video.video_type !== "general" && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-xl text-[8px] font-black uppercase tracking-[0.12em] text-white shadow-xl",
                      video.video_type === "community" ? "bg-indigo-600/60" : "bg-orange-500/60"
                    )}>
                      {video.video_type === "community" ? <Users className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
                      {video.video_type === "community" ? "Circle" : "Viral"}
                    </div>
                 )}
              </div>

              {/* Bottom Video Metadata */}
              <div className="absolute inset-x-0 bottom-0 p-3 pt-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full border-2 border-white/40 overflow-hidden bg-white/10 backdrop-blur-md shadow-lg transition-transform group-hover:scale-110">
                    {video.creator.avatar ? (
                      <img src={video.creator.avatar} alt={video.creator.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-[8px] font-black text-white uppercase">
                        {video.creator.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white tracking-tight drop-shadow-md truncate">
                    {video.creator.name}
                  </span>
                </div>
                
                <h3 className="text-[12px] font-black text-white leading-[1.1] line-clamp-1 drop-shadow-lg tracking-tight">
                   {video.title}
                </h3>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1 text-white/90 text-[9px] font-black drop-shadow-md">
                    <Eye className="h-2.5 w-2.5 text-orange-400" />
                    {formatCount(video.total_views)}
                  </div>
                  <div className="flex items-center gap-1 text-white/90 text-[9px] font-black drop-shadow-md">
                    <Heart className="h-2.5 w-2.5 text-pink-500 fill-pink-500/20" />
                    {formatCount(video.total_likes)}
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-500 shadow-2xl">
                  <Play className="h-7 w-7 text-white fill-white ml-1 shadow-lg" />
                </div>
              </div>
            </Link>

            {/* ── CONVERSION SECTION (Grounded UI) ── */}
            <div className="p-2.5 bg-zinc-50/40 backdrop-blur-sm border-t border-zinc-50 space-y-1.5 relative z-10">
              {video.video_type === "product" && video.product ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-zinc-900 truncate leading-none">
                        {video.product.name}
                      </p>
                      <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Verified Shop</p>
                    </div>
                    {video.product.price != null && (
                      <div className="shrink-0 px-1.5 py-0.5 rounded-lg bg-orange-50/50 border border-orange-100/50">
                        <p className="text-[11px] font-black text-orange-600 leading-none">
                          {video.product.currency || "USD"}{Number(video.product.price).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                  <Link 
                    href={`/marketplace/${video.product.slug}?buy=1`}
                    className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-zinc-950 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider transition-all transform active:scale-[0.96] shadow-xl shadow-zinc-900/10"
                  >
                    Buy Product <ChevronRight className="h-2 w-2 text-orange-500" />
                  </Link>
                </div>
              ) : video.video_type === "community" && video.community ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-zinc-900 truncate leading-none">
                        {video.community.name}
                      </p>
                      <p className="text-[8px] font-bold text-indigo-500 mt-0.5 uppercase tracking-wide">
                        {formatCount(video.community.member_count || 0)} Members
                      </p>
                    </div>
                  </div>
                  <Link 
                    href={`/groups/community/${video.community.slug}`}
                    className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider transition-all transform active:scale-[0.96] shadow-xl shadow-indigo-600/10"
                  >
                    Join Now <ArrowRight className="h-2 w-2" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black text-zinc-900 truncate tracking-tight">
                    Visit Sponsor Link
                  </p>
                  <a 
                    href={video.external_link || "#"}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.96] shadow-xl shadow-orange-600/10"
                  >
                    Explore <ExternalLink className="h-2 w-2" />
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
