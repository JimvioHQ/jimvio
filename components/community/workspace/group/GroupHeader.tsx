"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Clock3,
  Phone,
  Search,
  Users,
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
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-accent)] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(253,80,0,0.2)] ring-2 ring-white sm:h-11 sm:w-11 sm:text-[16px]"
      aria-hidden
    >
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon!} alt="" className="h-full w-full object-cover" />
      ) : icon ? (
        <span className="text-[18px] leading-none sm:text-[20px]">{icon}</span>
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
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
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
 * Premium Space header — compact icon, name, visibility, members, actions.
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
  lastActivityLabel,
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
  lastActivityLabel?: string | null;
  className?: string;
}) {
  const typeLabel = isSpaceType(spaceType)
    ? SPACE_TYPE_LABELS[spaceType]
    : "Discussion";
  const description = group.description?.trim() || null;
  const visibility = privacyLabel(group.privacy);

  return (
    <header
      className={cn(
        "relative shrink-0 border-b border-gray-100/90 bg-white/95 backdrop-blur-sm",
        "px-4 py-2.5 sm:px-5 sm:py-3",
        className
      )}
    >
      <div className="flex items-center gap-3 sm:gap-3.5">
        <SpaceAvatar name={group.name} icon={group.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-gray-900 sm:text-[18px]">
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
            <span className="hidden rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-gray-100 sm:inline-flex">
              {typeLabel}
            </span>
          </div>

          {description ? (
            <p className="mt-0.5 line-clamp-1 max-w-2xl text-[12px] leading-snug text-gray-500 sm:text-[12.5px]">
              {description}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
              <Users className="h-3 w-3" aria-hidden />
              {group.memberCount > 0
                ? `${formatCompactMembers(group.memberCount)} members`
                : "Members"}
            </span>
            {lastActivityLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-100">
                <Clock3 className="h-3 w-3" aria-hidden />
                {lastActivityLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
              "h-9 w-9 rounded-lg border border-gray-200/80 bg-white/90 text-gray-500 shadow-sm",
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
