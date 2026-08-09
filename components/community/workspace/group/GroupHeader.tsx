"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Phone,
  Search,
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
        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
        "border border-gray-200/80 bg-white/90 text-gray-500 shadow-sm",
        "transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800",
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
        "relative shrink-0 border-b border-gray-100/90 bg-white/95 backdrop-blur-sm",
        "px-3 py-2 sm:px-4 sm:py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <SpaceAvatar name={group.name} icon={group.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-gray-900 sm:text-[16px]">
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
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-500">
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

          <WorkspaceActionMenu
            label={`${group.name} actions`}
            buttonClassName={cn(
              "h-8 w-8 rounded-lg border border-gray-200/80 bg-white/90 text-gray-500 shadow-sm",
              "hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
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
