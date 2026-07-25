"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Phone,
  Search,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceGroup } from "@/lib/community/workspace";
import {
  SPACE_TYPE_LABELS,
  isSpaceType,
} from "@/lib/community/workspace/space-types";
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

function SpaceAvatar({
  name,
  icon,
}: {
  name: string;
  icon?: string | null;
}) {
  const letter = (name.trim()[0] || "S").toUpperCase();
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fd5000] text-[15px] font-bold text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl sm:text-[17px]"
      aria-hidden
    >
      {icon ? <span className="text-[18px] leading-none sm:text-[20px]">{icon}</span> : letter}
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
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-gray-200 bg-white text-gray-500",
        "transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/35"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Compact Space header — logo, name, PUBLIC, type · members, ghost actions.
 * No cover, no online count, no description block.
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
  spaceType,
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
  className?: string;
}) {
  const typeLabel = isSpaceType(spaceType)
    ? SPACE_TYPE_LABELS[spaceType]
    : "Discussion";

  return (
    <header
      className={cn(
        "relative shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <SpaceAvatar name={group.name} icon={group.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-gray-900 sm:text-[16px]">
              {group.name}
            </h1>
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">
              {group.privacy === "public" ? "Public" : group.privacy}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-gray-500">
            {typeLabel} Space
            <span className="mx-1.5 text-gray-300" aria-hidden>
              ·
            </span>
            {group.memberCount > 0
              ? `${formatCompactMembers(group.memberCount)} members`
              : "Members"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {onSearch ? (
            <GhostIconButton label="Search" onClick={onSearch}>
              <Search className="h-4 w-4" />
            </GhostIconButton>
          ) : null}
          {onAudioCall ? (
            <GhostIconButton label="Audio call" onClick={onAudioCall}>
              <Phone className="h-4 w-4" />
            </GhostIconButton>
          ) : null}
          {onVideoCall ? (
            <GhostIconButton label="Video call" onClick={onVideoCall}>
              <Video className="h-4 w-4" />
            </GhostIconButton>
          ) : null}

          <WorkspaceActionMenu
            label={`${group.name} actions`}
            buttonClassName={cn(
              "h-9 w-9 border border-gray-200 bg-white text-gray-500",
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
