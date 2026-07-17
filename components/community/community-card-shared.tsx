"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { cn, formatNumber } from "@/lib/utils";
import { CommunityLetterAvatar, communityInitial } from "@/components/community/community-letter-avatar";

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
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username?: string | null;
  } | null;
};

interface CommunityCardProps {
  c: CommunityRow;
  variant?: "default" | "featured";
  showQuickActions?: boolean;
}

function isNewCommunity(created_at?: string | null) {
  if (!created_at) return false;
  return Date.now() - new Date(created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
}

function ownerLabel(c: CommunityRow) {
  const p = c.profiles;
  if (!p) return null;
  return p.full_name || p.username || null;
}

export function SharedCommunityCard({
  c,
  variant = "default",
  showQuickActions = true,
}: CommunityCardProps) {
  const { formatMoney } = useCurrency();
  const [copied, setCopied] = useState(false);
  const isNew = isNewCommunity(c.created_at);
  const initial = communityInitial(c.name);
  const avatarSrc = c.avatar_url || c.image_url || null;
  const owner = ownerLabel(c);
  const featured = variant === "featured";
  const detailHref = `/communities/${c.slug}`;

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${detailHref}`
        : detailHref;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: c.name, url });
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    }
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl",
        "border border-[var(--color-border)] bg-[var(--color-surface)]",
        "transition-[transform,box-shadow,border-color] duration-200",
        "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        featured && "sm:min-h-[320px]"
      )}
    >
      <Link href={detailHref} className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-[var(--color-surface-secondary)]",
            featured ? "h-[148px] sm:h-[168px]" : "h-[112px]"
          )}
        >
          {c.cover_image ? (
            <Image
              src={c.cover_image}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes={featured ? "(max-width: 768px) 100vw, 40vw" : "(max-width: 768px) 50vw, 20vw"}
              unoptimized
            />
          ) : (
            <CommunityLetterAvatar
              name={c.name}
              className="absolute inset-0 bg-[var(--color-accent-light)]"
              textClassName="text-[56px] font-black text-[var(--color-accent)]/90 sm:text-[64px]"
            />
          )}

          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

          {isNew && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-[var(--color-surface)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] backdrop-blur-sm">
              New
            </span>
          )}
        </div>

        <div className="relative px-3.5">
          <div
            className={cn(
              "absolute -top-4 left-3.5 z-10 overflow-hidden rounded-lg border-2 border-[var(--color-surface)] bg-[var(--color-surface)] shadow-sm",
              featured ? "h-10 w-10" : "h-8 w-8"
            )}
          >
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-accent-light)] text-[12px] font-bold text-[var(--color-accent)]">
                {initial}
              </div>
            )}
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col px-3.5 pb-3.5", featured ? "pt-6" : "pt-5")}>
          <div className="min-h-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2
                className={cn(
                  "line-clamp-1 font-semibold tracking-tight text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors",
                  featured ? "text-[16px]" : "text-[14px]"
                )}
              >
                {c.name}
              </h2>
              {c.category && (
                <span className="shrink-0 rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {c.category}
                </span>
              )}
            </div>

            {c.tagline ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
                {c.tagline}
              </p>
            ) : owner ? (
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">by {owner}</p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
              <span>{formatNumber(c.member_count ?? 0)} members</span>
              {(c.post_count ?? 0) > 0 && (
                <>
                  <span aria-hidden className="text-[var(--color-border-strong)]">
                    ·
                  </span>
                  <span>{formatNumber(c.post_count ?? 0)} posts</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
            {c.is_free ? (
              <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                Free to join
              </span>
            ) : c.monthly_price ? (
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                  {formatMoney(c.monthly_price, c.currency)}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">/mo</span>
              </div>
            ) : (
              <span className="text-[12px] text-[var(--color-text-muted)]">Paid access</span>
            )}

            <span className="text-[12px] font-medium text-[var(--color-accent)] opacity-0 transition-opacity group-hover:opacity-100">
              View →
            </span>
          </div>
        </div>
      </Link>

      {showQuickActions && (
        <div className="flex gap-1.5 border-t border-[var(--color-border)] px-3.5 py-2">
          <button
            type="button"
            onClick={handleShare}
            className="h-7 flex-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {copied ? "Link copied" : "Share"}
          </button>
          <Link
            href={`/communities/${c.slug}/subscribe`}
            onClick={(e) => e.stopPropagation()}
            className="h-7 flex-1 rounded-lg bg-[var(--color-accent)] text-center text-[11px] font-semibold leading-7 text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Join
          </Link>
        </div>
      )}
    </article>
  );
}

export function CreateCommunityTile() {
  return (
    <Link
      href="/communities/create"
      className="group flex h-full min-h-[260px] flex-col justify-between rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]/40"
    >
      <div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-white">
          +
        </span>
        <h3 className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">
          Start yours
        </h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
          Launch a hub for your audience. Free plan available.
        </p>
      </div>
      <span className="text-[12px] font-medium text-[var(--color-accent)]">Create community →</span>
    </Link>
  );
}
