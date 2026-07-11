"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
} from "@/lib/notifications";
import * as LucideIcons from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications({ limit: 10 }),
        getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      /* silently fail — the panel will just appear empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const DynamicIcon = ({ name, color }: { name: string; color: string }) => {
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[name] ?? Bell;
    return <Icon className="h-4 w-4" style={{ color }} />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fd5000] px-1 text-[8px] font-black text-white leading-none shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <h3 className="text-[13px] font-black text-[var(--color-text-primary)]">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                >
                  <CheckCheck className="size-3" /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="size-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#fd5000]" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-2 size-8 text-[var(--color-text-muted)] opacity-40" />
                <p className="text-[12px] font-semibold text-[var(--color-text-muted)]">No notifications yet</p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)] opacity-60">
                  We&apos;ll notify you when something happens
                </p>
              </div>
            )}

            {notifications.map((notif) => {
              const iconName = getNotificationIcon(notif.type);
              const iconColor = getNotificationColor(notif.type);
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "group relative flex items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-secondary)]",
                    !notif.is_read && "bg-[#fd5000]/[0.03]"
                  )}
                >
                  {/* Icon */}
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${iconColor}15` }}
                  >
                    <DynamicIcon name={iconName} color={iconColor} />
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[12px] leading-tight", notif.is_read ? "text-[var(--color-text-secondary)]" : "font-bold text-[var(--color-text-primary)]")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#fd5000]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] opacity-60">
                      <span>{formatNotificationTime(notif.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 top-2 hidden gap-0.5 group-hover:flex">
                    {!notif.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notif.id)}
                        className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                        title="Mark as read"
                      >
                        <CheckCheck className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Link */}
                  {notif.action_url && (
                    <Link
                      href={notif.action_url}
                      className="absolute inset-0"
                      onClick={() => { if (!notif.is_read) handleMarkRead(notif.id); setOpen(false); }}
                      aria-label={notif.title}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border)] px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-xl py-2 text-center text-[11px] font-bold text-[#fd5000] hover:bg-[#fd5000]/5 transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
