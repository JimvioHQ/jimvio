"use client";

import { toast } from "sonner";
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fd5000] text-[17px] font-bold text-white shadow-sm"
      aria-hidden
    >
      {icon ? <span className="text-[20px] leading-none">{icon}</span> : letter}
    </span>
  );
}

/**
 * Minimal Space header — logo, name, visibility, members, description, About, More.
 * No cover photo.
 */
export function GroupHeader({
  group,
  notificationsOn,
  onToggleNotifications,
  onInvite,
  onAbout,
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
  const description = group.description?.trim() || null;

  return (
    <header
      className={cn(
        "relative shrink-0 border-b border-gray-100 bg-white px-4 py-4 sm:px-6",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <SpaceAvatar name={group.name} icon={group.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[17px] font-bold tracking-tight text-gray-900">
              {group.name}
            </h1>
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
              {group.privacy === "public" ? "Public" : group.privacy}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {typeLabel} Space
            <span className="mx-1.5 text-gray-300" aria-hidden>
              ·
            </span>
            {group.memberCount > 0
              ? `${group.memberCount.toLocaleString()} members`
              : "Members"}
          </p>
          {description ? (
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-gray-600">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {onAbout ? (
            <button
              type="button"
              onClick={onAbout}
              className="inline-flex h-9 items-center rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50"
            >
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
