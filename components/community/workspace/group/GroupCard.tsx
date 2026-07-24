"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Crown,
  Lock,
  Pin,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";

function privacyLabel(privacy: WorkspaceGroup["privacy"]) {
  if (privacy === "premium") return "Premium";
  if (privacy === "private") return "Private";
  return "Public";
}

/**
 * Premium collaboration Group card — visual, not a list row.
 */
export function GroupCard({
  group,
  href,
  category,
  latestUpdate,
  unreadCount = 0,
  isFavorite,
  isOwner,
  onToggleFavorite,
  onQuickJoin,
  className,
}: {
  group: WorkspaceGroup;
  href: string;
  category?: string | null;
  latestUpdate?: string | null;
  unreadCount?: number;
  isFavorite?: boolean;
  isOwner?: boolean;
  onToggleFavorite?: () => void;
  onQuickJoin?: () => void;
  className?: string;
}) {
  const cover =
    group.cover ||
    "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 45%, #1c1917), #0f172a 72%)";
  const logo = group.icon?.trim() || group.name.trim().charAt(0).toUpperCase() || "G";
  const description =
    group.description?.trim() ||
    `Collaborate in ${group.name} — channels, knowledge, and live sessions.`;
  const categoryLabel = category || group.tags[0] || "Collaboration";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl bg-[var(--color-surface)]",
        "ring-1 ring-[var(--color-border)]/70",
        "transition duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.32)] hover:ring-[var(--color-accent)]/25",
        "focus-within:ring-2 focus-within:ring-[var(--color-accent)]",
        className
      )}
    >
      <Link href={href} className="relative block aspect-[16/9] overflow-hidden">
        <div
          className="absolute inset-0"
          style={group.cover ? undefined : { background: cover }}
          aria-hidden
        />
        {group.cover && (
          <Image
            src={group.cover}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {group.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-zinc-900 backdrop-blur">
              <Pin className="h-3 w-3" aria-hidden />
              Pinned
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {(group.privacy === "private" || group.privacy === "premium") && (
              <Lock className="h-3 w-3" aria-hidden />
            )}
            {privacyLabel(group.privacy)}
          </span>
          {isOwner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
              <Crown className="h-3 w-3" aria-hidden />
              Owner
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount} new
          </span>
        )}

        {/* Hover preview strip */}
        <div className="absolute inset-x-0 bottom-0 translate-y-2 px-4 pb-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="line-clamp-2 text-[12px] leading-snug text-white/90">
            {description}
          </p>
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col px-4 pb-4 pt-0">
        <div className="-mt-7 mb-3 flex items-end justify-between gap-2">
          <Link
            href={href}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[22px] shadow-sm transition group-hover:scale-[1.03]"
            aria-label={`${group.name} logo`}
          >
            {logo.length <= 2 ? logo : logo.slice(0, 2)}
          </Link>
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
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
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
        </div>

        <Link href={href} className="min-w-0 space-y-1">
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {group.name}
          </h3>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {group.memberCount > 0
              ? `${group.memberCount.toLocaleString()} members`
              : `${group.channels.length} channels`}
          </span>
          {group.onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {group.onlineCount.toLocaleString()} online
            </span>
          )}
          <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 font-medium">
            {categoryLabel}
          </span>
        </div>

        {latestUpdate && (
          <p className="mt-2 truncate text-[12px] text-[var(--color-text-muted)]">
            {latestUpdate}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={href}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center rounded-full",
              "bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white",
              "transition hover:opacity-90 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            )}
          >
            Enter workspace
          </Link>
          {onQuickJoin && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onQuickJoin();
              }}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-full px-3",
                "text-[12px] font-semibold text-[var(--color-text-secondary)]",
                "ring-1 ring-[var(--color-border)] transition hover:text-[var(--color-text-primary)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              )}
            >
              Join
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
