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
    <article className="group relative rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:shadow-lg hover:border-[var(--color-accent)]/30 transition-all duration-300 hover:-translate-y-0.5 flex flex-col h-full">
      {/* Cover */}
      <div className="relative h-40 bg-[var(--color-surface-secondary)] shrink-0">
        {c.cover_image ? (
          <Image src={c.cover_image} alt="" fill className="object-cover group-hover:scale-[1.02] transition-transform duration-500" sizes="33vw" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-light)] via-[var(--color-surface-secondary)] to-[var(--color-surface)]" />
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className={cn(
            "absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg",
            rank === 1 ? "bg-yellow-400 text-yellow-900" :
              rank === 2 ? "bg-slate-300 text-slate-700" :
                "bg-amber-600 text-amber-100"
          )}>
            #{rank}
          </div>
        )}

        {/* New badge */}
        {isNew && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-accent)] text-white text-[9px] font-black uppercase tracking-widest shadow-md">
            <Sparkles size={9} /> New
          </div>
        )}

        {/* Privacy */}
        {!c.is_free && (
          <div className="absolute bottom-3 right-3 h-6 w-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
            <Lock size={11} className="text-white" />
          </div>
        )}
      </div>

      {/* Avatar overlap */}
      <div className="relative px-4">
        <div className="absolute -top-7 left-4 h-14 w-14 rounded-2xl border-[3px] border-[var(--color-surface)] bg-[var(--color-surface-secondary)] overflow-hidden shadow-lg z-10 transition-transform group-hover:scale-105">
          {(c.avatar_url || c.image_url) ? (
            <Image src={c.avatar_url || c.image_url || ''} alt="" width={56} height={56} className="object-cover h-full w-full" unoptimized />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[var(--color-accent)] font-black text-lg bg-[var(--color-accent-light)]">
              {c.name?.[0] ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3 pt-7 md:p-4 md:pt-9 gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="font-black text-[var(--color-text-primary)] text-sm md:text-base leading-tight line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">{c.name}</h2>
          </div>
          <p className="text-[10px] md:text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
            {c.tagline || 'Exclusive community for elite members.'}
          </p>
        </div>

        {/* Meta tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {c.category && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {c.category}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <Users size={10} className="shrink-0 text-emerald-500" />
              {formatNumber(c.member_count ?? 0)}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <MessageSquare size={10} className="shrink-0 text-indigo-500" />
              {formatNumber(c.post_count ?? 0)}
            </span>
          </div>
        </div>

        {/* Price + CTA Stacking for narrow width */}
        <div className="mt-auto pt-2 border-t border-[var(--color-border)] space-y-2">
          <div className="flex items-center justify-between">
            {c.is_free ? (
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                Free
              </span>
            ) : c.monthly_price ? (
              <span className="text-[10px] font-black text-[var(--color-accent)]">
                {c.currency || "$"}{Number(c.monthly_price).toFixed(0)}/mo
              </span>
            ) : (
              <span className="text-[10px] text-[var(--color-text-muted)]">Private</span>
            )}
          </div>

          <Button
            asChild
            size="sm"
            className="w-full rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-[10px] px-2 h-8 shadow-sm hover:shadow-md transition-all"
          >
            <Link href={`/communities/${c.slug}`}>
              {c.is_free ? "Join Free" : "View"} <ArrowRight size={12} className="ml-1" />
            </Link>
          </Button>
        </div>

        {/* Quick actions row */}
        {showQuickActions && (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              className="flex-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] flex items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-[var(--color-accent-light)] transition-all border border-transparent hover:border-[var(--color-accent)]/20"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined' && navigator.share) navigator.share({ title: c.name, url: `/communities/${c.slug}` });
                else if (typeof window !== 'undefined') navigator.clipboard.writeText(window.location.origin + `/communities/${c.slug}`);
              }}
            >
              <Globe size={11} /> Share
            </button>
            <Link
              href={`/communities/create?template=${c.category ?? "other"}`}
              className="flex-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] flex items-center justify-center gap-1 py-1.5 rounded-xl hover:bg-[var(--color-accent-light)] transition-all border border-transparent hover:border-[var(--color-accent)]/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Crown size={11} /> Become Owner
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
