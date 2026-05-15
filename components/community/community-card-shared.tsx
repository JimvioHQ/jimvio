"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
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

/* ─── tiny inline icons — avoids lucide bundle weight for decorative glyphs ─── */
const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M11 14v-1.5A3.5 3.5 0 0 0 7.5 9h-4A3.5 3.5 0 0 0 0 12.5V14" strokeLinecap="round" />
    <circle cx="5.5" cy="4.5" r="2.5" />
    <path d="M16 14v-1.338A3.5 3.5 0 0 0 13.5 9.5" strokeLinecap="round" />
    <path d="M11 2a2.5 2.5 0 0 1 0 5" strokeLinecap="round" />
  </svg>
);

const MessageIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M2 3h12v9H9.5L8 14l-1.5-2H2V3Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
    <rect x="3" y="7" width="10" height="8" rx="2" />
    <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
  </svg>
);

const ShareIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <circle cx="12" cy="3" r="2" />
    <circle cx="12" cy="13" r="2" />
    <circle cx="4" cy="8" r="2" />
    <path d="M4 8l6-4M4 8l6 4" strokeLinecap="round" />
  </svg>
);

const CloneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <rect x="5" y="5" width="9" height="9" rx="2" />
    <path d="M2 11V2h9" strokeLinecap="round" />
  </svg>
);

/* ─── helpers ─── */
function isNewCommunity(created_at?: string | null) {
  if (!created_at) return false;
  return Date.now() - new Date(created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
}

const ACCENT = "#fd5000";

const rankConfig: Record<number, { label: string; bg: string; text: string }> = {
  1: { label: "🥇 1st", bg: "#fd5000", text: "#fff" },
  2: { label: "🥈 2nd", bg: "#e5e3df", text: "#5a584f" },
  3: { label: "🥉 3rd", bg: "#fef3c7", text: "#92400e" },
};

/* ─── component ─── */
export function SharedCommunityCard({ c, rank, showQuickActions = true }: CommunityCardProps) {
  const { formatMoney } = useCurrency();
  const [copied, setCopied] = useState(false);
  const isNew = isNewCommunity(c.created_at);
  const initial = c.name?.[0]?.toUpperCase() ?? "?";
  const isPremium = !c.is_free;
  const avatarSrc = c.avatar_url || c.image_url || null;

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/c/${c.slug}`
        : `/c/${c.slug}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: c.name, url });
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    }
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col h-full rounded-[18px] overflow-hidden",
        "bg-white dark:bg-[#111110]",
        "border border-black/[0.08] dark:border-white/[0.07]",
        // Subtle resting shadow — not trying to compete for attention
        "shadow-[0_1px_4px_rgba(0,0,0,0.05),_0_2px_12px_rgba(0,0,0,0.04)]",
        // On hover: lift + warm accent glow
        "hover:shadow-[0_6px_28px_rgba(253,80,0,0.13),_0_2px_8px_rgba(0,0,0,0.06)]",
        "hover:border-[#fd5000]/20 dark:hover:border-[#fd5000]/25",
        "hover:-translate-y-[3px]",
        "transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]",
      )}
    >
      {/* ── Cover ── */}
      <div className="relative h-[140px] shrink-0 overflow-hidden bg-orange-50/70 dark:bg-[#1a1008]">
        {c.cover_image ? (
          <Image
            src={c.cover_image}
            alt=""
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          /* Large letter watermark — distinctive and zero-cost fallback */
          <div className="absolute inset-0 flex items-center justify-center select-none overflow-hidden">
            <span
              className="text-[130px] font-black italic leading-none tracking-tighter text-[#fd5000]/[0.07] dark:text-[#fd5000]/[0.09] translate-y-4"
              aria-hidden
            >
              {initial}
            </span>
          </div>
        )}

        {/* Bottom scrim — only enough to ensure badge legibility */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* ── Top-left badges ── */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm border border-white/30 dark:border-white/10 text-[10px] font-bold tracking-wide text-[#fd5000]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fd5000] animate-pulse" aria-hidden />
              New
            </span>
          )}
        </div>

        {/* ── Top-right: rank ── */}
        {rank && rank <= 3 && rankConfig[rank] && (
          <div
            className="absolute top-3 right-3 h-6 px-2.5 rounded-full flex items-center text-[10px] font-bold shadow-sm"
            style={{ background: rankConfig[rank].bg, color: rankConfig[rank].text }}
          >
            {rankConfig[rank].label}
          </div>
        )}

        {/* ── Bottom-right: premium lock ── */}
        {isPremium && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 text-white text-[9px] font-bold tracking-widest uppercase">
            <LockIcon />
            Premium
          </div>
        )}
      </div>

      {/* ── Avatar — overlaps cover ── */}
      <div className="relative px-4 h-0">
        <div
          className={cn(
            "absolute -top-5 left-4 z-10",
            "h-11 w-11 rounded-xl overflow-hidden",
            "border-[2.5px] border-white dark:border-[#111110]",
            "shadow-[0_2px_12px_rgba(0,0,0,0.15)]",
            "transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgba(253,80,0,0.2)]",
          )}
        >
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={`${c.name} avatar`}
              width={44}
              height={44}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-orange-50 dark:bg-orange-950/30 text-[#fd5000] font-bold text-lg select-none">
              {initial}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-4 pb-4 pt-7 gap-0">

        {/* Name + tagline */}
        <div className="mb-3">
          <h2 className="text-[15px] font-bold leading-snug tracking-tight text-zinc-900 dark:text-[#ededec] line-clamp-1 group-hover:text-[#fd5000] transition-colors duration-200">
            {c.name}
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-500 leading-relaxed line-clamp-2">
            {c.tagline || "An exclusive community for people who mean business."}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {c.category && (
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/[0.06] text-stone-500 dark:text-stone-400">
              {c.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <UsersIcon />
            {formatNumber(c.member_count ?? 0)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <MessageIcon />
            {formatNumber(c.post_count ?? 0)}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-black/[0.06] dark:bg-white/[0.06] mb-3" />

        {/* Price + CTA */}
        <div className="mt-auto space-y-2.5">
          {/* Price */}
          <div className="flex items-baseline justify-between">
            {c.is_free ? (
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                Free
              </span>
            ) : c.monthly_price ? (
              <div className="flex items-baseline gap-0.5">
                <span className="text-[20px] font-bold text-zinc-900 dark:text-white leading-none tabular-nums">
                  {formatMoney(c.monthly_price, c.currency)}
                </span>
                <span className="text-[11px] text-stone-400 ml-0.5">/mo</span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-white/[0.05] px-2.5 py-1 rounded-md">
                Private hub
              </span>
            )}
          </div>

          {/* CTA */}
          <Link
            href={`/c/community/${c.slug}/subscribe`}
            className={cn(
              "group/cta relative flex items-center justify-center gap-2",
              "w-full h-10 rounded-xl",
              "bg-[#fd5000] text-white text-[13px] font-semibold",
              "shadow-[0_2px_0_rgba(140,38,0,0.4),_0_3px_12px_rgba(253,80,0,0.2)]",
              "hover:bg-[#e84b00]",
              "hover:shadow-[0_2px_0_rgba(120,33,0,0.45),_0_5px_18px_rgba(253,80,0,0.28)]",
              "active:scale-[0.98] active:shadow-[0_1px_0_rgba(120,33,0,0.4)]",
              "transition-all duration-200",
            )}
          >
            Join Community
            <svg
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
              width="14" height="14" viewBox="0 0 16 16"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>

          {/* Quick actions — slide-up reveal on hover */}
          {showQuickActions && (
            <div
              className={cn(
                "grid grid-cols-2 gap-1.5",
                "opacity-0 translate-y-1.5 pointer-events-none",
                "group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
                "transition-all duration-200 ease-out",
              )}
            >
              <button
                onClick={handleShare}
                className={cn(
                  "h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5",
                  "bg-stone-100 dark:bg-white/[0.05]",
                  "border border-black/[0.06] dark:border-white/[0.06]",
                  "text-stone-500 dark:text-stone-400",
                  "hover:bg-orange-50 hover:text-[#fd5000] hover:border-[#fd5000]/20",
                  "dark:hover:bg-orange-500/10 dark:hover:text-orange-400",
                  "transition-all duration-150 cursor-pointer",
                )}
              >
                <ShareIcon />
                {copied ? "Copied!" : "Share"}
              </button>
              <Link
                href={`/communities/create?template=${c.category ?? "other"}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5",
                  "bg-stone-100 dark:bg-white/[0.05]",
                  "border border-black/[0.06] dark:border-white/[0.06]",
                  "text-stone-500 dark:text-stone-400",
                  "hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200",
                  "dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400",
                  "transition-all duration-150",
                )}
              >
                <CloneIcon />
                Clone
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}