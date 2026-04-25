"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, Lock, ArrowRight, Crown, Globe, Sparkles, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";

export type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  category?: string | null;
  member_count?: number | null;
  post_count?: number | null;
  is_free?: boolean | null;
  monthly_price?: number | null;
  currency?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null; username?: string | null } | null;
};

interface CommunityCardProps {
  c: CommunityRow;
  rank?: number;
  showQuickActions?: boolean;
}

export function SharedCommunityCard({ c, rank, showQuickActions = true }: CommunityCardProps) {
  const isNew = c.created_at && Date.now() - new Date(c.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <article className="group relative rounded-3xl border border-stone-100 bg-white dark:bg-[#0a0a0a] dark:border-white/5 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(253,80,0,0.12)] hover:border-[#fd5000]/30 transition-all duration-500 hover:-translate-y-1.5 flex flex-col h-full">
      {/* Cover */}
      <div className="relative h-24 sm:h-44 bg-stone-100 dark:bg-[#111] shrink-0">
        {c.cover_image ? (
          <Image src={c.cover_image} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="33vw" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-stone-50 to-white dark:from-orange-900/20 dark:via-[#111] dark:to-[#0a0a0a]" />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className={cn(
            "absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm border",
            rank === 1 ? "bg-[#fd5000] text-white border-white/20" :
              rank === 2 ? "bg-stone-100 text-stone-700 border-stone-200" :
                "bg-amber-100 text-amber-800 border-amber-200"
          )}>
            #{rank}
          </div>
        )}

        {/* New badge */}
        {isNew && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-semibold tracking-wide shadow-sm">
            <Sparkles size={12} className="text-amber-300" /> New
          </div>
        )}

        {/* Privacy */}
        {!c.is_free && (
          <div className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm">
            <Lock size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Avatar overlap */}
      <div className="relative px-4 sm:px-5">
        <div className="absolute -top-7 sm:-top-10 left-4 sm:left-5 h-14 w-14 sm:h-20 sm:w-20 rounded-2xl border-4 border-white dark:border-[#0a0a0a] bg-white dark:bg-[#111] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-10 transition-transform group-hover:scale-105 duration-500">
          {(c.avatar_url || c.image_url) ? (
            <Image src={c.avatar_url || c.image_url || ''} alt="" width={80} height={80} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[#fd5000] font-bold text-xl sm:text-2xl bg-orange-50 dark:bg-orange-500/10">
              {c.name?.[0] ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-5 pt-8 sm:pt-14 gap-2.5">
        <div>
          <h2 className="font-bold text-[#11181c] dark:text-[#ededed] text-[16px] sm:text-[18px] leading-tight line-clamp-1 group-hover:text-[#fd5000] transition-colors tracking-tight">{c.name}</h2>
          <p className="text-[12px] sm:text-[13px] text-[#889096] dark:text-[#6a6a6a] mt-1 line-clamp-2 leading-relaxed font-medium">
            {c.tagline || 'Exclusive community for elite members.'}
          </p>
        </div>

        {/* Meta tags */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {c.category && (
            <span className="text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-stone-100 dark:bg-[#111] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-white/5">
              {c.category}
            </span>
          )}
          <div className="flex items-center gap-3 ml-1">
            <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Users size={12} className="text-[#fd5000]" />
              {formatNumber(c.member_count ?? 0)}
            </span>
            <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-indigo-500" />
              {formatNumber(c.post_count ?? 0)}
            </span>
          </div>
        </div>

        {/* Price + CTA Stacking for narrow width */}
        <div className="mt-auto pt-4 border-t border-stone-100 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            {c.is_free ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                Free Access
              </span>
            ) : c.monthly_price ? (
              <div className="flex items-baseline gap-1">
                 <span className="text-[16px] font-bold text-stone-900 dark:text-white">
                   {c.currency || "$"}{Number(c.monthly_price).toFixed(0)}
                 </span>
                 <span className="text-[10px] font-medium text-stone-400">/mo</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-[#111] px-2.5 py-1 rounded-full">Private Hub</span>
            )}
          </div>

          <Link href={`/communities/${c.slug}`} className="block w-full">
            <Button
              variant="orange"
              className="w-full rounded-full font-bold text-[13px] h-10 sm:h-11 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
              Join Community <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Quick actions row */}
        {showQuickActions && (
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="flex-1 text-[11px] font-semibold text-stone-500 hover:text-[#fd5000] flex items-center justify-center gap-1.5 py-2 rounded-xl bg-stone-50 dark:bg-[#111] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined' && navigator.share) navigator.share({ title: c.name, url: `/communities/${c.slug}` });
                else if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.origin + `/communities/${c.slug}`);
              }}
            >
              <Globe size={14} /> Share
            </button>
            <Link
              href={`/communities/create?template=${c.category ?? "other"}`}
              className="flex-1 text-[11px] font-semibold text-stone-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-stone-50 dark:bg-[#111] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Crown size={14} /> Clone
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
