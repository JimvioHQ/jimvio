"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Phone,
  Search,
  Settings,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import {
  WorkspaceActionMenu,
  buildWorkspaceActions,
} from "@/components/community/workspace/shared/WorkspaceActionMenu";

function formatCompactMembers(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

function memberCountLabel(n: number): string {
  if (n <= 0) return "Members";
  const compact = formatCompactMembers(n);
  return n === 1 ? `${compact} member` : `${compact} members`;
}

function privacyLabel(privacy: WorkspaceGroup["privacy"]) {
  if (privacy === "premium") return "Premium";
  if (privacy === "private") return "Private";
  return "Public";
}

function SpaceAvatar({
  name,
  icon,
}: {
  name: string;
  icon?: string | null;
}) {
  const letter = (name.trim()[0] || "S").toUpperCase();
  const isUrl = Boolean(icon && /^https?:\/\//.test(icon));
  return (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-accent)] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(253,80,0,0.18)] ring-2 ring-white sm:h-10 sm:w-10 sm:text-[15px]"
      aria-hidden
    >
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon!} alt="" className="h-full w-full object-cover" />
      ) : icon ? (
        <span className="text-[16px] leading-none sm:text-[18px]">{icon}</span>
      ) : (
        letter
      )}
    </span>
  );
}

function GhostIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8",
        "border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-text-muted)] shadow-sm",
        "transition-all duration-150 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Compact Space header — name, visibility, and member count on one line.
 */
export function GroupHeader({
  group,
  notificationsOn,
  onToggleNotifications,
  onInvite,
  onAbout,
  onSettings,
  onSearch,
  onAudioCall,
  onVideoCall,
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
  onSettings?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  communityId?: string;
  bookmarkHref?: string;
  compact?: boolean;
  spaceType?: string | null;
  verified?: boolean;
  /** Reserved for callers; intentionally not shown in the compact header. */
  lastActivityLabel?: string | null;
  className?: string;
}) {
  const visibility = privacyLabel(group.privacy);

  return (
    <header
      className={cn(
        "relative shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm",
        "px-3 py-1.5 sm:px-4 sm:py-2",
        className
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <SpaceAvatar name={group.name} icon={group.cover ?? group.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
            <h1 className="min-w-0 break-words text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[16px]">
              {group.name}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                visibility === "Public"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                  : visibility === "Premium"
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                    : "bg-violet-50 text-violet-700 ring-1 ring-violet-100"
              )}
            >
              {visibility}
            </span>
            <span className="text-[12px] font-medium text-[var(--color-text-muted)]" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-muted)]">
              <Users className="h-3 w-3" aria-hidden />
              {memberCountLabel(group.memberCount)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onSearch ? (
            <GhostIconButton label="Search" onClick={onSearch}>
              <Search className="h-3.5 w-3.5" />
            </GhostIconButton>
          ) : null}
          {onAudioCall ? (
            <GhostIconButton label="Audio call" onClick={onAudioCall}>
              <Phone className="h-3.5 w-3.5" />
            </GhostIconButton>
          ) : null}
          {onVideoCall ? (
            <GhostIconButton label="Video call" onClick={onVideoCall}>
              <Video className="h-3.5 w-3.5" />
            </GhostIconButton>
          ) : null}

          {onSettings ? (
            <GhostIconButton label="Space settings" onClick={onSettings}>
              <Settings className="h-3.5 w-3.5" />
            </GhostIconButton>
          ) : null}

          <WorkspaceActionMenu
            label={`${group.name} actions`}
            buttonClassName={cn(
              "h-9 w-9 min-h-9 min-w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/90 text-[var(--color-text-muted)] shadow-sm sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8",
              "hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35"
            )}
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
              onAbout,
            })}
          />
        </div>
      </div>
    </header>
  );
}
