"use client";

import Link from "next/link";
import {
  Bell,
  BellOff,
  BookOpen,
  Calendar,
  FileText,
  FolderOpen,
  GraduationCap,
  Hash,
  Headphones,
  HelpCircle,
  ImageIcon,
  Megaphone,
  Pin,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelType, WorkspaceChannel } from "@/lib/community/workspace";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";

const TYPE_META: Record<
  string,
  {
    label: string;
    emoji: string;
    Icon: typeof Hash;
    accent: string;
    surface: string;
  }
> = {
  discussion: {
    label: "Discussion",
    emoji: "💬",
    Icon: Hash,
    accent: "text-sky-600",
    surface: "bg-sky-500/10 ring-sky-500/15",
  },
  announcement: {
    label: "Announcements",
    emoji: "📢",
    Icon: Megaphone,
    accent: "text-amber-700",
    surface: "bg-amber-500/10 ring-amber-500/20",
  },
  resources: {
    label: "Resources",
    emoji: "📚",
    Icon: BookOpen,
    accent: "text-teal-700",
    surface: "bg-teal-500/10 ring-teal-500/15",
  },
  knowledge: {
    label: "Knowledge",
    emoji: "🧠",
    Icon: Sparkles,
    accent: "text-violet-700",
    surface: "bg-violet-500/10 ring-violet-500/15",
  },
  media: {
    label: "Media",
    emoji: "🎬",
    Icon: ImageIcon,
    accent: "text-fuchsia-700",
    surface: "bg-fuchsia-500/10 ring-fuchsia-500/15",
  },
  files: {
    label: "Files",
    emoji: "📁",
    Icon: FolderOpen,
    accent: "text-stone-700",
    surface: "bg-stone-500/10 ring-stone-500/15",
  },
  course: {
    label: "Courses",
    emoji: "🎓",
    Icon: GraduationCap,
    accent: "text-indigo-700",
    surface: "bg-indigo-500/10 ring-indigo-500/15",
  },
  events: {
    label: "Events",
    emoji: "📅",
    Icon: Calendar,
    accent: "text-rose-700",
    surface: "bg-rose-500/10 ring-rose-500/15",
  },
  voice: {
    label: "Voice",
    emoji: "🎙️",
    Icon: Headphones,
    accent: "text-emerald-700",
    surface: "bg-emerald-500/10 ring-emerald-500/20",
  },
  live: {
    label: "Live",
    emoji: "🔴",
    Icon: Radio,
    accent: "text-red-600",
    surface: "bg-red-500/10 ring-red-500/20",
  },
  signals: {
    label: "Signals",
    emoji: "📈",
    Icon: TrendingUp,
    accent: "text-orange-700",
    surface: "bg-orange-500/10 ring-orange-500/20",
  },
  qa: {
    label: "Support",
    emoji: "🛟",
    Icon: HelpCircle,
    accent: "text-cyan-700",
    surface: "bg-cyan-500/10 ring-cyan-500/15",
  },
};

function resolveMeta(type: ChannelType | string) {
  return TYPE_META[type] ?? TYPE_META.discussion;
}

/**
 * Flagship Channel card — premium collaboration room, type-aware visuals.
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
  voiceActive,
  onToggleFavorite,
  onToggleNotifications,
  onQuickOpen,
  onInvite,
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
  voiceActive?: boolean;
  onToggleFavorite?: () => void;
  onToggleNotifications?: () => void;
  onQuickOpen?: () => void;
  onInvite?: () => void;
  layout?: "grid" | "rail";
  className?: string;
}) {
  const meta = resolveMeta(channel.type);
  const TypeIcon = meta.Icon;
  const emoji = channel.icon?.trim() || meta.emoji;
  const description =
    channel.description?.trim() ||
    `${meta.label} room for focused collaboration.`;
  const preview =
    typingLabel ||
    messagePreview ||
    (channel.unreadCount > 0
      ? `${channel.unreadCount} unread updates`
      : lastActivityLabel) ||
    "Open overview to explore";

  const absoluteHref = href.startsWith("http") || href.startsWith("/") ? href : `/${href}`;

  const isLiveLike = channel.type === "live" || channel.type === "voice";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.35rem] bg-[var(--color-surface)] p-4",
        "ring-1 ring-[var(--color-border)]/70",
        "transition duration-400 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_22px_48px_-30px_rgba(0,0,0,0.32)] hover:ring-[var(--color-accent)]/30",
        "focus-within:ring-2 focus-within:ring-[var(--color-accent)]",
        isLiveLike && "bg-gradient-to-br from-[var(--color-surface)] to-zinc-950/[0.03]",
        layout === "rail" && "min-h-[210px]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Link
          href={href}
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[20px] ring-1 transition duration-300 group-hover:scale-[1.05]",
            meta.surface
          )}
          aria-label={`${channel.name} icon`}
        >
          <span aria-hidden>{emoji}</span>
          <TypeIcon
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-md bg-[var(--color-surface)] p-0.5 shadow-sm",
              meta.accent
            )}
            aria-hidden
          />
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
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                  )}
                >
                  {meta.label}
                </span>
                {channel.pinnedCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                    <Pin className="h-3 w-3" aria-hidden />
                    {channel.pinnedCount}
                  </span>
                ) : null}
                {channel.unreadCount > 0 ? (
                  <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                  </span>
                ) : null}
                {(voiceActive || channel.type === "live") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    {channel.type === "voice" ? "Voice" : "Live"}
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                {description}
              </p>
            </Link>

            <div className="flex shrink-0 items-center">
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
              <WorkspaceActionMenu
                label={`${channel.name} actions`}
                items={buildWorkspaceActions({
                  copyUrl: absoluteHref,
                  isFavorite,
                  muted: !notificationsOn,
                  onInvite,
                  onFavorite: onToggleFavorite,
                  onMute: onToggleNotifications,
                })}
              />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
            {onlineCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {onlineCount.toLocaleString()} online
              </span>
            ) : null}
            {lastActivityLabel && !typingLabel ? (
              <span>Updated {lastActivityLabel}</span>
            ) : null}
            {!notificationsOn ? (
              <span className="inline-flex items-center gap-1">
                <BellOff className="h-3 w-3" aria-hidden />
                Muted
              </span>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-2 line-clamp-1 text-[12px]",
              typingLabel
                ? "italic text-emerald-600"
                : "text-[var(--color-text-muted)]"
            )}
          >
            {typingLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex gap-0.5" aria-hidden>
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.2s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.1s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500" />
                </span>
                {typingLabel}
              </span>
            ) : (
              preview
            )}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={href}
          onClick={onQuickOpen}
          className={cn(
            "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full",
            "bg-[var(--color-surface-secondary)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)]",
            "transition hover:bg-[var(--color-accent)] hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          )}
        >
          <Hash className="h-3.5 w-3.5" aria-hidden />
          Open channel
        </Link>
        {channel.type === "resources" || channel.type === "files" ? (
          <span className="hidden sm:inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
    </article>
  );
}
