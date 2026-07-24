"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
  Crown,
  Lock,
  Pin,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";

function privacyLabel(privacy: WorkspaceGroup["privacy"]) {
  if (privacy === "premium") return "Premium";
  if (privacy === "private") return "Private";
  return "Public";
}

/**
 * Flagship Group card — entering a premium workspace, not a nav row.
 */
export function GroupCard({
  group,
  href,
  category,
  latestUpdate,
  unreadCount = 0,
  isFavorite,
  isOwner,
  isVerified,
  isNew,
  ownerName,
  onToggleFavorite,
  onQuickJoin,
  onInvite,
  className,
}: {
  group: WorkspaceGroup;
  href: string;
  category?: string | null;
  latestUpdate?: string | null;
  unreadCount?: number;
  isFavorite?: boolean;
  isOwner?: boolean;
  isVerified?: boolean;
  isNew?: boolean;
  ownerName?: string | null;
  onToggleFavorite?: () => void;
  onQuickJoin?: () => void;
  onInvite?: () => void;
  className?: string;
}) {
  const coverFallback =
    "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 48%, #1c1917), #0f172a 74%)";
  const logo = group.icon?.trim() || group.name.trim().charAt(0).toUpperCase() || "G";
  const description =
    group.description?.trim() ||
    `Collaborate in ${group.name} — channels, knowledge, and live sessions.`;
  const categoryLabel = category || group.tags[0] || "Collaboration";
  const owner = ownerName?.trim() || "Owner";
  const shareUrl = href.startsWith("http") || href.startsWith("/") ? href : `/${href}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)]",
        "ring-1 ring-[var(--color-border)]/70",
        "transition duration-500 ease-out",
        "hover:-translate-y-1.5 hover:shadow-[0_28px_64px_-36px_rgba(0,0,0,0.38)] hover:ring-[var(--color-accent)]/30",
        "focus-within:ring-2 focus-within:ring-[var(--color-accent)]",
        className
      )}
    >
      <Link
        href={href}
        className="relative block aspect-[16/9] overflow-hidden focus-visible:outline-none"
        aria-label={`Open ${group.name}`}
      >
        <div
          className="absolute inset-0"
          style={group.cover ? undefined : { background: coverFallback }}
          aria-hidden
        />
        {group.cover ? (
          <Image
            src={group.cover}
            alt=""
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.06]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_80%_10%,rgba(253,80,0,0.28),transparent_45%)]" />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {group.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-zinc-900 backdrop-blur">
              <Pin className="h-3 w-3" aria-hidden />
              Pinned
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            {(group.privacy === "private" || group.privacy === "premium") && (
              <Lock className="h-3 w-3" aria-hidden />
            )}
            {privacyLabel(group.privacy)}
          </span>
          {isNew ? (
            <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              New
            </span>
          ) : null}
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#3b82f6] px-2.5 py-1 text-[10px] font-semibold text-white">
              <BadgeCheck className="h-3 w-3" aria-hidden />
              Verified
            </span>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount} new
            </span>
          ) : null}
          {isOwner ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-semibold text-amber-950">
              <Crown className="h-3 w-3" aria-hidden />
              Owner
            </span>
          ) : null}
        </div>

        {/* Hover preview */}
        <div className="absolute inset-x-0 bottom-0 translate-y-3 px-4 pb-4 opacity-0 transition duration-400 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="line-clamp-2 text-[12.5px] leading-snug text-white/95 drop-shadow">
            {description}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-white/70">
            Hosted by {owner}
          </p>
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-0">
        <div className="-mt-8 mb-3 flex items-end justify-between gap-2">
          <Link
            href={href}
            className="flex h-16 w-16 items-center justify-center rounded-[1.15rem] border-[3px] border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[24px] shadow-md transition duration-300 group-hover:scale-[1.04]"
            aria-label={`${group.name} avatar`}
          >
            {logo.length <= 2 ? logo : logo.slice(0, 2)}
          </Link>
          <div className="flex items-center gap-0.5 pb-0.5">
            <button
              type="button"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={Boolean(isFavorite)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.();
              }}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]",
                "transition hover:ring-[var(--color-accent)]/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              )}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite
                    ? "fill-amber-400 text-amber-500"
                    : "text-[var(--color-text-muted)]"
                )}
              />
            </button>
            <WorkspaceActionMenu
              label={`${group.name} actions`}
                items={buildWorkspaceActions({
                copyUrl: shareUrl,
                isFavorite,
                pinned: group.featured,
                onInvite,
                onFavorite: onToggleFavorite,
              })}
            />
          </div>
        </div>

        <Link href={href} className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {group.name}
            </h3>
            {isVerified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#3b82f6]" aria-label="Verified" />
            ) : null}
          </div>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        </Link>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {categoryLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <Users className="h-3 w-3" aria-hidden />
            {group.memberCount > 0
              ? `${group.memberCount.toLocaleString()} members`
              : `${group.channels.length} channels`}
          </span>
          {group.onlineCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              {group.onlineCount.toLocaleString()} online
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
          <span className="truncate">Owner · {owner}</span>
          {latestUpdate ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{latestUpdate}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={href}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center rounded-full",
              "bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white",
              "transition hover:opacity-90 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            )}
          >
            Enter workspace
          </Link>
          {onQuickJoin ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickJoin();
              }}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-full px-4",
                "text-[12px] font-semibold text-[var(--color-text-secondary)]",
                "ring-1 ring-[var(--color-border)] transition hover:text-[var(--color-text-primary)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              )}
            >
              Join
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
