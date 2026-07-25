"use client";

import {
  Bell,
  BellOff,
  BadgeCheck,
  Info,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import { SPACE_TYPE_LABELS, isSpaceType } from "@/lib/community/workspace/space-types";
import { WorkspaceIconButton } from "@/components/community/workspace/channel/ChannelEmptyState";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";

function SpaceAvatar({
  name,
  icon,
  color,
}: {
  name: string;
  icon?: string | null;
  color?: string | null;
}) {
  const letter = (name.trim()[0] || "S").toUpperCase();
  const bg =
    color ||
    "linear-gradient(135deg, #fd5000 0%, #ff8a4c 100%)";
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px] font-bold text-white shadow-sm ring-1 ring-black/5"
      style={{ background: icon ? undefined : bg }}
      aria-hidden
    >
      {icon ? (
        <span className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[20px]">
          {icon}
        </span>
      ) : (
        letter
      )}
    </span>
  );
}

/**
 * Space conversation header — avatar, name, members, join, bell, About, more.
 * No search / tabs / permanent About sidebar.
 */
export function GroupHeader({
  group,
  ownerName,
  isMember,
  notificationsOn,
  onToggleNotifications,
  onInvite,
  onJoin,
  onAbout,
  spaceType,
  verified = false,
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
  onAbout?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  communityId?: string;
  bookmarkHref?: string;
  /** @deprecated Compact is now the only conversation layout. */
  compact?: boolean;
  spaceType?: string | null;
  verified?: boolean;
  className?: string;
}) {
  const typeLabel = isSpaceType(spaceType)
    ? SPACE_TYPE_LABELS[spaceType]
    : "Discussion";

  return (
    <header
      className={cn(
        "relative shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <SpaceAvatar name={group.name} icon={group.icon} color={group.color} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[17px]">
              {group.name}
            </h1>
            {verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-violet-500"
                aria-label="Verified"
              />
            ) : null}
            <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
              {group.privacy === "public" ? "Public" : group.privacy}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--color-text-muted)]">
            <span>{typeLabel} Space</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {group.memberCount > 0
                ? `${group.memberCount.toLocaleString()} members`
                : "Members"}
            </span>
            {ownerName ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{ownerName}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!isMember && onJoin ? (
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Join
            </button>
          ) : isMember ? (
            <span className="hidden min-h-9 items-center rounded-lg bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-600 sm:inline-flex">
              Joined
            </span>
          ) : null}

          <WorkspaceIconButton
            label={
              notificationsOn ? "Mute notifications" : "Enable notifications"
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

          {onAbout ? (
            <button
              type="button"
              onClick={onAbout}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12px] font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Info className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
              About
            </button>
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
    </header>
  );
}
