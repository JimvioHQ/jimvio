"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { WORKSPACE_NOTIFICATION_FILTERS } from "@/lib/jimvio-workspace";
import type { WorkspaceNotification, WorkspaceNotificationType } from "@/lib/jimvio-workspace/types";
import { cn } from "@/lib/utils";

type FilterId = (typeof WORKSPACE_NOTIFICATION_FILTERS)[number]["id"];

type WorkspaceNotificationCenterProps = {
  notifications: WorkspaceNotification[];
  variant?: "embedded" | "full";
};

export function WorkspaceNotificationCenter({
  notifications,
  variant = "full",
}: WorkspaceNotificationCenterProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  return (
    <div className={cn("flex h-full flex-col", variant === "full" && "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          <Bell className="size-3.5" />
          Notification Center
        </p>
        <Link
          href="/dashboard/notifications"
          className="text-[10px] font-semibold text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
        >
          View all
        </Link>
      </div>

      <div
        className="mb-2 flex flex-wrap gap-1"
        role="group"
        aria-label="Filter notifications"
      >
        {WORKSPACE_NOTIFICATION_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-2 py-1 text-[9px] font-semibold transition-[transform,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
              filter === f.id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {filtered.length ? (
          filtered.slice(0, variant === "embedded" ? 6 : 12).map((n) => (
            <li key={n.id}>
              <div
                className={cn(
                  "rounded-lg border border-[var(--color-border)] px-2.5 py-2 transition-[transform,border-color] duration-200 hover:border-[var(--color-accent)]/30",
                  n.unread && "bg-[var(--color-accent)]/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{n.title}</p>
                  <span className="shrink-0 text-[9px] text-[var(--color-text-muted)]">{n.time}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-muted)]">{n.body}</p>
                <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {n.type}
                </span>
              </div>
            </li>
          ))
        ) : (
          <li className="py-4 text-center text-[12px] text-[var(--color-text-muted)]">No notifications in this filter.</li>
        )}
      </ul>
    </div>
  );
}
