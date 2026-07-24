"use client";

import Image from "next/image";
import {
  Bell,
  BellOff,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import { WorkspaceIconButton } from "@/components/community/workspace/channel/ChannelEmptyState";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";
import { BookmarkButton } from "@/components/community/personalization/BookmarkButton";

export function GroupHeader({
  group,
  ownerName,
  moderatorNames = [],
  isMember,
  notificationsOn,
  onToggleNotifications,
  onInvite,
  onSearch,
  onJoin,
  searchValue,
  onSearchChange,
  communityId,
  bookmarkHref,
  className,
}: {
  group: WorkspaceGroup;
  ownerName?: string | null;
  moderatorNames?: string[];
  isMember?: boolean;
  notificationsOn?: boolean;
  onToggleNotifications?: () => void;
  onInvite?: () => void;
  onSearch?: () => void;
  onJoin?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  communityId?: string;
  bookmarkHref?: string;
  className?: string;
}) {
  const cover =
    group.cover ||
    "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 55%, #1a1a1a), #0f172a 70%)";

  return (
    <header
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-[var(--color-border)]",
        className
      )}
    >
      <div
        className="relative h-28 w-full sm:h-36"
        style={group.cover ? undefined : { background: cover }}
        role="img"
        aria-label={`${group.name} cover`}
      >
        {group.cover && (
          <Image
            src={group.cover}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/40 to-transparent" />
      </div>

      <div className="relative -mt-10 px-4 pb-4 sm:-mt-12 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-3">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--color-surface)] bg-[var(--color-surface)] text-[28px] shadow-sm sm:h-20 sm:w-20 sm:text-[32px]"
              aria-hidden
            >
              {group.icon ?? "✦"}
            </span>
            <div className="min-w-0 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[22px]">
                  {group.name}
                </h1>
                {group.featured && (
                  <span className="rounded-md bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                    Featured
                  </span>
                )}
                <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
                  {group.privacy}
                </span>
              </div>
              {group.description && (
                <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {!isMember && onJoin && (
              <button
                type="button"
                onClick={onJoin}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 text-[12px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              >
                Join group
              </button>
            )}
            {isMember && (
              <span className="inline-flex min-h-10 items-center rounded-lg bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-600">
                Joined
              </span>
            )}
            <WorkspaceIconButton
              label="Invite members"
              onClick={() => {
                if (onInvite) {
                  onInvite();
                  return;
                }
                void navigator.clipboard?.writeText(window.location.href);
                toast.success("Invite link copied");
              }}
            >
              <UserPlus className="h-4 w-4" />
            </WorkspaceIconButton>
            <WorkspaceIconButton label="Search group" onClick={onSearch}>
              <Search className="h-4 w-4" />
            </WorkspaceIconButton>
            <WorkspaceIconButton
              label={
                notificationsOn
                  ? "Mute notifications"
                  : "Enable notifications"
              }
              pressed={!notificationsOn}
              onClick={onToggleNotifications}
            >
              {notificationsOn ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </WorkspaceIconButton>
            {communityId && bookmarkHref ? (
              <BookmarkButton
                id={group.id}
                kind="group"
                communityId={communityId}
                title={group.name}
                href={bookmarkHref}
                size="sm"
              />
            ) : null}
            <WorkspaceActionMenu
              label={`${group.name} actions`}
              items={buildWorkspaceActions({
                muted: !notificationsOn,
                pinned: group.featured,
                onInvite: () => {
                  if (onInvite) {
                    onInvite();
                    return;
                  }
                  void navigator.clipboard?.writeText(window.location.href);
                  toast.success("Invite link copied");
                },
                onMute: onToggleNotifications,
              })}
            />
          </div>
        </div>

        {onSearchChange && (
          <div className="mt-3 lg:hidden">
            <label className="sr-only" htmlFor="group-workspace-search-mobile">
              Search group workspace
            </label>
            <input
              id="group-workspace-search-mobile"
              type="search"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search channels, knowledge…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]/40 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1 font-medium">
            <Users className="h-3 w-3" aria-hidden />
            {group.memberCount > 0
              ? `${group.memberCount.toLocaleString()} members`
              : "Members"}
          </span>
          {group.onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-hidden
              />
              {group.onlineCount.toLocaleString()} online
            </span>
          )}
          {ownerName && (
            <span className="inline-flex items-center gap-1">
              <Shield
                className="h-3 w-3 text-[var(--color-accent)]"
                aria-hidden
              />
              Owner · {ownerName}
            </span>
          )}
          {moderatorNames.length > 0 && (
            <span>
              Mods · {moderatorNames.slice(0, 3).join(", ")}
              {moderatorNames.length > 3
                ? ` +${moderatorNames.length - 3}`
                : ""}
            </span>
          )}
        </div>

        {group.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {group.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}


