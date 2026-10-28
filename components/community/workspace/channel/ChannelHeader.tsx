"use client";

import {
  Bell,
  BellOff,
  Search,
  Users,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkspaceChannel, WorkspaceGroup } from "@/lib/community/workspace";
import { WorkspaceIconButton } from "@/components/community/workspace/channel/ChannelEmptyState";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";
import { BookmarkButton } from "@/components/community/personalization/BookmarkButton";

const TYPE_EMOJI: Record<string, string> = {
  discussion: "💬",
  announcement: "📢",
  resources: "📚",
  knowledge: "🧠",
  media: "🎬",
  files: "📁",
  course: "🎓",
  events: "📅",
  voice: "🎙️",
  live: "🔴",
  signals: "📈",
  qa: "🛟",
};

export function ChannelHeader({
  channel,
  group,
  memberCount,
  onlineCount,
  pinnedCount,
  onSearchClick,
  onOpenMembers,
  onOpenPinned,
  communityId,
  bookmarkHref,
  className,
}: {
  channel: WorkspaceChannel;
  group: WorkspaceGroup | null;
  memberCount?: number;
  onlineCount?: number;
  pinnedCount?: number;
  onSearchClick?: () => void;
  onOpenMembers?: () => void;
  onOpenPinned?: () => void;
  communityId?: string;
  bookmarkHref?: string;
  className?: string;
}) {
  const members = memberCount ?? channel.memberCount;
  const online = onlineCount ?? 0;
  const pins = pinnedCount ?? channel.pinnedCount;
  const [notificationsOn, setNotificationsOn] = useState(true);
  const emoji = channel.icon?.trim() || TYPE_EMOJI[channel.type] || "💬";

  return (
    <header
      className={cn(
        "flex shrink-0 items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3.5 sm:px-5 sm:py-4",
        className
      )}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[20px] ring-1 ring-[var(--color-accent)]/15"
        aria-hidden
      >
        {emoji}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h1 className="truncate text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[17px]">
            {channel.name}
          </h1>
          {group ? (
            <span className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
              in {group.name}
            </span>
          ) : null}
          <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {channel.type}
          </span>
          {channel.isLocked ? (
            <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
              Locked
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-[12.5px] text-[var(--color-text-secondary)]">
          {channel.description ??
            `${channel.type.charAt(0).toUpperCase()}${channel.type.slice(1)} collaboration room`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={onOpenMembers}
            className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 transition hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <Users className="h-3 w-3" aria-hidden />
            {members > 0 ? `${members.toLocaleString()} ${members === 1 ? "member" : "members"}` : "Members"}
          </button>
          {online > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {online.toLocaleString()} online
            </span>
          ) : null}
          {pins > 0 ? (
            <button
              type="button"
              onClick={onOpenPinned}
              className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 transition hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Pin className="h-3 w-3" aria-hidden />
              {pins} pinned
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-0.5">
        <WorkspaceIconButton label="Search in channel" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </WorkspaceIconButton>
        <WorkspaceIconButton
          label={
            notificationsOn
              ? "Mute channel notifications"
              : "Enable notifications"
          }
          pressed={!notificationsOn}
          onClick={() => {
            setNotificationsOn((v) => !v);
            toast.success(
              notificationsOn ? "Channel muted" : "Notifications enabled"
            );
          }}
        >
          {notificationsOn ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </WorkspaceIconButton>
        {communityId && bookmarkHref ? (
          <BookmarkButton
            id={channel.id}
            kind={
              channel.type === "course"
                ? "course"
                : channel.type === "resources" || channel.type === "knowledge"
                  ? "resource"
                  : "channel"
            }
            communityId={communityId}
            title={channel.name}
            href={bookmarkHref}
            subtitle={group?.name}
            size="sm"
          />
        ) : null}
        <WorkspaceActionMenu
          label="Channel actions"
          items={[
            ...buildWorkspaceActions({
              muted: !notificationsOn,
              onMute: () => {
                if (!communityId) {
                  toast.error("Unable to update mute preferences");
                  return;
                }
                const next = !notificationsOn;
                const previous = notificationsOn;
                setNotificationsOn(next);
                void fetch(`/api/c/${communityId}/mute`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ muted: !next, roomId: channel.id }),
                })
                  .then(async (res) => {
                    if (!res.ok) {
                      const payload = await res.json().catch(() => null);
                      throw new Error(payload?.error || "Mute failed");
                    }
                    toast.success(next ? "Notifications enabled" : "Channel muted");
                  })
                  .catch((err: unknown) => {
                    setNotificationsOn(previous);
                    toast.error(err instanceof Error ? err.message : "Mute failed");
                  });
              },
              onInvite: () => {
                void navigator.clipboard?.writeText(window.location.href);
                toast.success("Invite link copied");
              },
            }),
          ]}
        />
      </div>
    </header>
  );
}
