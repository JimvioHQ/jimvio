"use client";

import Link from "next/link";
import {
  Bell,
  BellOff,
  Hash,
  Pin,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceChannel } from "@/lib/community/workspace";

const TYPE_LABEL: Record<string, string> = {
  discussion: "Discussion",
  announcement: "Announcements",
  resources: "Resources",
  signals: "Signals",
  voice: "Voice",
  live: "Live",
  course: "Courses",
  events: "Events",
  knowledge: "Knowledge",
  files: "Files",
  media: "Media",
  qa: "Q&A",
};

/**
 * Jimvio-native Channel card — premium interactive surface, not a chat row.
 */
export function ChannelCard({
  channel,
  href,
  onlineCount = 0,
  messagePreview,
  typingLabel,
  lastActivityLabel,
  notificationsOn = true,
  isFavorite,
  onToggleFavorite,
  onToggleNotifications,
  onQuickOpen,
  layout = "grid",
  className,
}: {
  channel: WorkspaceChannel;
  href: string;
  onlineCount?: number;
  messagePreview?: string | null;
  typingLabel?: string | null;
  lastActivityLabel?: string | null;
  notificationsOn?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onToggleNotifications?: () => void;
  onQuickOpen?: () => void;
  /** rail = horizontal scroll card */
  layout?: "grid" | "rail";
  className?: string;
}) {
  const typeLabel = TYPE_LABEL[channel.type] ?? channel.type;
  const description =
    channel.description?.trim() ||
    `${typeLabel} channel for focused collaboration.`;
  const preview =
    typingLabel ||
    messagePreview ||
    (channel.unreadCount > 0
      ? `${channel.unreadCount} unread`
      : lastActivityLabel) ||
    "Open overview to explore";

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl bg-[var(--color-surface)] p-4",
        "ring-1 ring-[var(--color-border)]/70",
        "transition duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)] hover:ring-[var(--color-accent)]/30",
        "focus-within:ring-2 focus-within:ring-[var(--color-accent)]",
        layout === "rail" && "min-h-[188px]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Link
          href={href}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[20px] ring-1 ring-[var(--color-accent)]/15 transition duration-300 group-hover:scale-[1.04]"
          aria-label={`${channel.name} icon`}
        >
          <span aria-hidden>{channel.icon ?? "💬"}</span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={href}
              className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {channel.name}
                </h3>
                <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {typeLabel}
                </span>
                {channel.pinnedCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                    <Pin className="h-3 w-3" aria-hidden />
                    Pinned
                  </span>
                )}
                {channel.unreadCount > 0 && (
                  <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                {description}
              </p>
            </Link>

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={isFavorite ? "Unfavorite channel" : "Favorite channel"}
                aria-pressed={Boolean(isFavorite)}
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFavorite?.();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    isFavorite && "fill-amber-400 text-amber-500"
                  )}
                />
              </button>
              <button
                type="button"
                aria-label={
                  notificationsOn ? "Mute notifications" : "Enable notifications"
                }
                aria-pressed={!notificationsOn}
                onClick={(e) => {
                  e.preventDefault();
                  onToggleNotifications?.();
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                {notificationsOn ? (
                  <Bell className="h-3.5 w-3.5" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
            {onlineCount > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {onlineCount.toLocaleString()} online
              </span>
            )}
            {lastActivityLabel && !typingLabel && (
              <span>{lastActivityLabel}</span>
            )}
          </div>

          <p
            className={cn(
              "mt-2 line-clamp-1 text-[12px]",
              typingLabel
                ? "italic text-emerald-600"
                : "text-[var(--color-text-muted)]"
            )}
          >
            {preview}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={href}
          onClick={onQuickOpen}
          className={cn(
            "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full",
            "bg-[var(--color-surface-secondary)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)]",
            "transition hover:bg-[var(--color-accent)] hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          )}
        >
          <Hash className="h-3.5 w-3.5" aria-hidden />
          Open channel
        </Link>
      </div>
    </article>
  );
}
