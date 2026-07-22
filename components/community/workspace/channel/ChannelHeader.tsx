"use client";

import {
  Bell,
  MoreHorizontal,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceChannel, WorkspaceGroup } from "@/lib/community/workspace";

export function ChannelHeader({
  channel,
  group,
  memberCount,
  onlineCount,
  onSearchClick,
  className,
}: {
  channel: WorkspaceChannel;
  group: WorkspaceGroup | null;
  memberCount?: number;
  onlineCount?: number;
  onSearchClick?: () => void;
  className?: string;
}) {
  const members = memberCount ?? channel.memberCount;
  const online = onlineCount ?? 0;

  return (
    <header
      className={cn(
        "flex shrink-0 items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-4 sm:py-3.5",
        className
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fd5000]/10 text-[18px]"
        aria-hidden
      >
        {channel.icon ?? "💬"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h1 className="truncate text-[15px] font-bold tracking-tight text-[var(--color-text-primary)] sm:text-[16px]">
            {channel.name}
          </h1>
          {group && (
            <span className="truncate text-[11px] font-medium text-[var(--color-text-muted)]">
              in {group.name}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--color-text-secondary)]">
          {channel.description ??
            `${channel.type.charAt(0).toUpperCase()}${channel.type.slice(1)} channel`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {members > 0 ? `${members.toLocaleString()} members` : "Members"}
          </span>
          {online > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {online.toLocaleString()} online
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label="Search in channel"
          onClick={onSearchClick}
          className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Channel notifications"
          className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="More channel actions"
          className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
