"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Bell, CheckCheck } from "lucide-react";
import { OS_NOTIFICATION_FILTERS } from "@/lib/jimvio-os";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { cn } from "@/lib/utils";

type FilterId = (typeof OS_NOTIFICATION_FILTERS)[number]["id"];

export function OsNotificationPanel() {
  const notifications = useJimvioOsStore((s) => s.notifications);
  const markRead = useJimvioOsStore((s) => s.markNotificationRead);
  const markAllRead = useJimvioOsStore((s) => s.markAllNotificationsRead);
  const archive = useJimvioOsStore((s) => s.archiveNotification);
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    const visible = notifications.filter((n) => !n.archived);
    if (filter === "all") return visible;
    return visible.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;

  return (
    <section aria-label="Global notifications" className="flex h-full flex-col">
      <header className="mb-3 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-primary)]">
          <Bell className="size-4 text-[var(--color-accent)]" />
          Notifications
          {unreadCount > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] text-white">{unreadCount}</span>
          )}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
          <Link
            href="/settings/notifications"
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-accent)] hover:underline"
          >
            View all
          </Link>
        </div>
      </header>

      <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Filter notifications">
        {OS_NOTIFICATION_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-2 py-1 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
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
        {filtered.map((n) => (
          <li
            key={n.id}
            className={cn(
              "rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition-[transform,border-color] duration-200 hover:border-[var(--color-accent)]/30",
              !n.read && "bg-[var(--color-accent)]/5",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{n.body}</p>
                <span className="mt-1 inline-block text-[9px] font-bold uppercase text-[var(--color-accent)]">{n.category}</span>
              </div>
              <span className="shrink-0 text-[9px] text-[var(--color-text-muted)]">{n.time}</span>
            </div>
            <div className="mt-2 flex gap-1">
              {!n.read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => archive(n.id)}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
              >
                <Archive className="size-3" />
                Archive
              </button>
              {n.href && (
                <Link href={n.href} className="rounded px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] hover:underline">
                  Open
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
