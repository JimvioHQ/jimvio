"use client";

import {
  Filter,
  MessageCircle,
  Monitor,
  Pin,
  Search,
  SquarePen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HubAvatar } from "../hub-ui";
import type { HubThread, MessagesTabId } from "./types";
import { formatShortTime } from "./utils";

const TABS: Array<{ id: MessagesTabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "spaces", label: "Spaces" },
];

export function ThreadSidebar({
  threads,
  loading,
  activeThreadId,
  activeTab,
  tabCounts,
  search,
  onSearchChange,
  onTabChange,
  onSelectThread,
  onNewMessage,
  onTogglePin,
  onOpenFilter,
  className,
}: {
  threads: HubThread[];
  loading: boolean;
  activeThreadId: string | null;
  activeTab: MessagesTabId;
  tabCounts: { all: number; unread: number; groups: number; spaces: number };
  search: string;
  onSearchChange: (v: string) => void;
  onTabChange: (t: MessagesTabId) => void;
  onSelectThread: (id: string) => void;
  onNewMessage: () => void;
  onTogglePin: (id: string) => void;
  onOpenFilter: () => void;
  className?: string;
}) {
  const count = (id: MessagesTabId) => tabCounts[id];

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] sm:w-[320px] sm:shrink-0",
        className
      )}
    >
      <div className="border-b border-[var(--color-border)] px-4 pb-0 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-[16px] font-black tracking-tight text-[var(--color-text-primary)]">
            <MessageCircle className="h-4 w-4 text-[var(--color-accent,#fd5000)]" />
            Messages
          </h1>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onNewMessage}
              className="rounded-xl p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="New message"
            >
              <SquarePen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenFilter}
              className="rounded-xl p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Filter conversations"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search messages"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary,#fafafa)] py-2 pl-9 pr-3 text-[12.5px] text-[var(--color-text-primary)] outline-none transition-shadow placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent,#fd5000)]/35 focus:ring-2 focus:ring-[var(--color-accent,#fd5000)]/15"
          />
        </div>

        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "relative shrink-0 pb-2.5 text-[12px] font-semibold transition-colors",
                  active
                    ? "text-[var(--color-accent,#fd5000)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                )}
              >
                {label} {count(id)}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--color-accent,#fd5000)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-xl bg-[var(--color-surface-secondary)]"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-6 py-12 text-center text-[12px] text-[var(--color-text-muted)]">
            No conversations yet
          </p>
        ) : (
          threads.map((thread) => {
            const active = activeThreadId === thread.id;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onTogglePin(thread.id);
                }}
                className={cn(
                  "relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  active
                    ? "bg-[var(--color-accent,#fd5000)]/[0.06]"
                    : "hover:bg-[var(--color-surface-secondary)]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-accent,#fd5000)]" />
                )}

                <div className="relative shrink-0">
                  {thread.kind === "group" ? (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
                      <Users className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                    </div>
                  ) : thread.kind === "space" ? (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                      <Monitor className="h-[18px] w-[18px]" />
                    </div>
                  ) : (
                    <HubAvatar
                      name={thread.name}
                      src={thread.avatarUrl}
                      size={44}
                      live={thread.isOnline}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {thread.isPinned && (
                        <Pin className="h-3 w-3 shrink-0 text-[var(--color-accent,#fd5000)]" />
                      )}
                      <span
                        className={cn(
                          "truncate text-[13px]",
                          active || thread.unreadCount > 0
                            ? "font-bold text-[var(--color-text-primary)]"
                            : "font-semibold text-[var(--color-text-primary)]/90"
                        )}
                      >
                        {thread.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-muted)]">
                      {formatShortTime(thread.lastMessageTime)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-[12px]",
                        thread.isTyping
                          ? "font-medium italic text-[var(--color-accent,#fd5000)]"
                          : thread.unreadCount > 0
                            ? "font-medium text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-muted)]"
                      )}
                    >
                      {thread.isTyping ? "Typing..." : thread.lastMessage}
                    </p>
                    {thread.unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent,#fd5000)] px-1.5 text-[10px] font-bold text-white">
                        {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
