"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pin,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkspaceChannel, WorkspaceGroup } from "@/lib/community/workspace";

export function ChannelHeader({
  channel,
  group,
  memberCount,
  onlineCount,
  pinnedCount,
  onSearchClick,
  onOpenMembers,
  onOpenPinned,
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
  className?: string;
}) {
  const members = memberCount ?? channel.memberCount;
  const online = onlineCount ?? 0;
  const pins = pinnedCount ?? channel.pinnedCount;
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "flex shrink-0 items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 sm:px-4 sm:py-3.5",
        className
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10 text-[18px] ring-1 ring-[var(--color-accent)]/15"
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
          {channel.isLocked && (
            <span className="rounded-md bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
              Locked
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--color-text-secondary)]">
          {channel.description ??
            `${channel.type.charAt(0).toUpperCase()}${channel.type.slice(1)} channel`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={onOpenMembers}
            className="inline-flex items-center gap-1 transition hover:text-[var(--color-text-primary)]"
          >
            <Users className="h-3 w-3" aria-hidden />
            {members > 0 ? `${members.toLocaleString()} members` : "Members"}
          </button>
          {online > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {online.toLocaleString()} online
            </span>
          )}
          {pins > 0 && (
            <button
              type="button"
              onClick={onOpenPinned}
              className="inline-flex items-center gap-1 transition hover:text-[var(--color-text-primary)]"
            >
              <Pin className="h-3 w-3" aria-hidden />
              {pins} pinned
            </button>
          )}
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-0.5" ref={menuRef}>
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
          aria-label={
            notificationsOn ? "Mute channel notifications" : "Enable notifications"
          }
          aria-pressed={notificationsOn}
          onClick={() => {
            setNotificationsOn((v) => !v);
            toast.success(
              notificationsOn ? "Channel muted" : "Notifications enabled"
            );
          }}
          className={cn(
            "rounded-lg p-2 transition hover:bg-[var(--color-surface-secondary)]",
            notificationsOn
              ? "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              : "text-[var(--color-accent)]"
          )}
        >
          {notificationsOn ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="More channel actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
          >
            <MenuItem
              icon={Copy}
              label="Copy channel link"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                toast.success("Link copied");
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={Pin}
              label="View pinned"
              onClick={() => {
                onOpenPinned?.();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={Users}
              label="View members"
              onClick={() => {
                onOpenMembers?.();
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={ExternalLink}
              label="Open search"
              onClick={() => {
                onSearchClick?.();
                setMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
      {label}
    </button>
  );
}
