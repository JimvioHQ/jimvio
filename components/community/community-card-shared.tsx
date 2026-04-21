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
    <article className="group relative rounded-[32px] border border-stone-200/60 bg-white dark:bg-bg dark:border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-orange-500/30 transition-all duration-500 hover:-translate-y-1 flex flex-col h-full">
      {/* Cover */}
      <div className="relative h-28 sm:h-44 bg-stone-50 dark:bg-surface shrink-0">
        {c.cover_image ? (
          <Image src={c.cover_image} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" sizes="33vw" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-stone-50 to-white dark:from-orange-900/20 dark:via-surface dark:to-bg" />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className={cn(
            "absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-black shadow-xl",
            rank === 1 ? "bg-orange-500 text-white ring-4 ring-orange-500/20" :
              rank === 2 ? "bg-stone-300 text-stone-700 ring-4 ring-stone-300/20" :
                "bg-amber-700 text-amber-50 ring-4 ring-amber-700/20"
          )}>
            #{rank}
          </div>
        )}

        {/* New badge */}
        {isNew && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
            <Sparkles size={11} className="fill-white" /> New
          </div>
        )}

        {/* Privacy */}
        {!c.is_free && (
          <div className="absolute bottom-4 right-4 h-7 w-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center shadow-lg">
            <Lock size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Avatar overlap */}
      <div className="relative px-4 sm:px-5">
        <div className="absolute -top-8 sm:-top-10 left-4 sm:left-5 h-16 w-16 sm:h-20 sm:w-20 rounded-[20px] sm:rounded-[28px] border-[3px] sm:border-[4px] border-white dark:border-bg bg-white dark:bg-surface overflow-hidden shadow-2xl z-10 transition-transform group-hover:scale-110 duration-500">
          {(c.avatar_url || c.image_url) ? (
            <Image src={c.avatar_url || c.image_url || ''} alt="" width={80} height={80} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-orange-600 font-black text-xl sm:text-2xl bg-orange-50 dark:bg-surface-secondary">
              {c.name?.[0] ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 sm:p-5 pt-10 sm:pt-12 gap-2 sm:gap-3">
        <div>
          <h2 className="font-black text-stone-900 dark:text-text-primary text-[15px] sm:text-[18px] leading-tight line-clamp-1 group-hover:text-orange-600 transition-colors tracking-tight">{c.name}</h2>
          <p className="text-[11px] sm:text-[12px] text-stone-500 dark:text-text-secondary mt-0.5 sm:mt-1 line-clamp-2 leading-relaxed font-medium">
            {c.tagline || 'Exclusive community for elite members.'}
          </p>
        </div>

        {/* Meta tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {c.category && (
            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-lg bg-stone-50 dark:bg-surface text-stone-400 dark:text-text-muted border border-stone-100 dark:border-border-strong">
              {c.category}
            </span>
          )}
          <div className="flex items-center gap-3 ml-1">
            <span className="text-[11px] font-bold text-stone-600 dark:text-text-secondary flex items-center gap-1.5">
              <Users size={12} className="text-orange-500" />
              {formatNumber(c.member_count ?? 0)}
            </span>
            <span className="text-[11px] font-bold text-stone-500 dark:text-text-muted flex items-center gap-1.5">
              <MessageSquare size={12} className="text-indigo-400" />
              {formatNumber(c.post_count ?? 0)}
            </span>
          </div>
        </div>

        {/* Price + CTA Stacking for narrow width */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-stone-100 dark:border-border space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            {c.is_free ? (
              <span className="text-[10px] sm:text-[11px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg">
                Free Access
              </span>
            ) : c.monthly_price ? (
              <div className="flex items-baseline gap-1">
                 <span className="text-[14px] sm:text-[16px] font-black text-stone-950 dark:text-white">
                   {c.currency || "$"}{Number(c.monthly_price).toFixed(0)}
                 </span>
                 <span className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase">/mo</span>
              </div>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-black text-stone-400 uppercase">Private HUB</span>
            )}
          </div>

          <Button
            asChild
            variant="orange"
            className="w-full rounded-[16px] sm:rounded-[20px] font-black text-[12px] sm:text-[13px] h-9 sm:h-10 transition-all uppercase tracking-widest"
          >
            <Link href={`/communities/${c.slug}`}>
              Join Community <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Quick actions row */}
        {showQuickActions && (
          <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="flex-1 text-[10px] font-black uppercase tracking-wider text-stone-400 hover:text-orange-600 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-transparent hover:border-orange-500/20 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-all"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined' && navigator.share) navigator.share({ title: c.name, url: `/communities/${c.slug}` });
                else if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.origin + `/communities/${c.slug}`);
              }}
            >
              <Globe size={12} /> Share
            </button>
            <Link
              href={`/communities/create?template=${c.category ?? "other"}`}
              className="flex-1 text-[10px] font-black uppercase tracking-wider text-stone-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-transparent hover:border-indigo-500/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <Crown size={12} /> Clone
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
