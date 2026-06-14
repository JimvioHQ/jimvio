"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Bell, BellOff, Package, Truck, MessageSquare,
    DollarSign, ShieldCheck, ArrowUpRight, Check, X, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
    dismissNotification,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/lib/actions/notifications";
import {
    formatNotificationTime,
    getNotificationUiCategory,
    type DbNotification,
    type NotificationUiCategory,
} from "@/lib/notifications/ui-utils";

const CATEGORY: Record<NotificationUiCategory, { icon: React.ReactNode; label: string; accent: string }> = {
    order: { icon: <Package className="h-4 w-4" />, label: "Order", accent: "#0ea5e9" },
    shipping: { icon: <Truck className="h-4 w-4" />, label: "Shipping", accent: "#6366f1" },
    message: { icon: <MessageSquare className="h-4 w-4" />, label: "Message", accent: "#10b981" },
    payment: { icon: <DollarSign className="h-4 w-4" />, label: "Payment", accent: "#f59e0b" },
    system: { icon: <ShieldCheck className="h-4 w-4" />, label: "System", accent: "#f43f5e" },
};

function NotificationRow({
    n,
    onRead,
    onDismiss,
    index,
    busy,
}: {
    n: DbNotification;
    onRead: (id: string) => void;
    onDismiss: (id: string) => void;
    index: number;
    busy: string | null;
}) {
    const uiType = getNotificationUiCategory(n);
    const cat = CATEGORY[uiType] ?? CATEGORY.system;
    const isRead = Boolean(n.is_read);
    const isBusy = busy === n.id;

    return (
        <div
            className={cn(
                "group relative flex items-start gap-5 px-6 py-5 rounded-xl border transition-all duration-200",
                "animate-in fade-in slide-in-from-bottom-2",
                isRead
                    ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm"
            )}
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
        >
            {!isRead && (
                <div
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                    style={{ background: cat.accent }}
                />
            )}

            <div
                className="mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                    background: isRead ? "transparent" : `${cat.accent}18`,
                    color: isRead ? "#9ca3af" : cat.accent,
                    border: `1px solid ${isRead ? "#e5e7eb" : `${cat.accent}30`}`,
                }}
            >
                {cat.icon}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={cn(
                                "text-sm font-semibold leading-snug",
                                isRead ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-900 dark:text-white"
                            )}
                        >
                            {n.title}
                        </span>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ background: `${cat.accent}15`, color: cat.accent }}
                        >
                            {cat.label}
                        </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0 mt-0.5">
                        {formatNotificationTime(n.created_at)}
                    </span>
                </div>

                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {n.message}
                </p>

                <div className="flex items-center gap-4 pt-1 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150">
                    {n.action_url && (
                        <Link
                            href={n.action_url}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                            View details <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    )}
                    {!isRead && (
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onRead(n.id)}
                            className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                            style={{ color: cat.accent }}
                        >
                            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Mark read
                        </button>
                    )}
                </div>
            </div>

            <button
                type="button"
                disabled={isBusy}
                onClick={() => onDismiss(n.id)}
                className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-50"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="flex items-start gap-5 px-6 py-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                        <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-md w-2/5" />
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-md w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<DbNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<NotificationUiCategory | "all">("all");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const loadNotifications = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
            .from("notifications")
            .select("id, user_id, type, title, message, data, is_read, read_at, action_url, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) {
            console.error("[NotificationsPage] load failed:", error.message);
        }

        setNotifications(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (!userId) return;

        const supabase = createClient();
        const channel = supabase
            .channel(`dashboard-notifications-${userId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
                () => {
                    loadNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, loadNotifications]);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const filtered = filter === "all"
        ? notifications
        : notifications.filter((n) => getNotificationUiCategory(n) === filter);

    const markRead = async (id: string) => {
        setBusyId(id);
        const prev = notifications;
        setNotifications((list) =>
            list.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
        );
        const result = await markNotificationRead(id);
        if (!result.ok) setNotifications(prev);
        setBusyId(null);
    };

    const markAllRead = async () => {
        setBusyId("all");
        const prev = notifications;
        setNotifications((list) =>
            list.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        const result = await markAllNotificationsRead();
        if (!result.ok) setNotifications(prev);
        setBusyId(null);
    };

    const dismiss = async (id: string) => {
        setBusyId(id);
        const prev = notifications;
        setNotifications((list) => list.filter((n) => n.id !== id));
        const result = await dismissNotification(id);
        if (!result.ok) setNotifications(prev);
        setBusyId(null);
    };

    const filterTabs: { key: NotificationUiCategory | "all"; label: string }[] = [
        { key: "all", label: "All" },
        { key: "order", label: "Orders" },
        { key: "shipping", label: "Shipping" },
        { key: "message", label: "Messages" },
        { key: "payment", label: "Payments" },
        { key: "system", label: "System" },
    ];

    return (
        <div className="min-h-screen pb-24" style={{ background: "var(--color-bg, #f9fafb)" }}>
            <div className="max-w-2xl mx-auto px-4 pt-10 space-y-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <span className="h-6 min-w-6 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500">
                            Orders, messages, and platform updates
                        </p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            type="button"
                            disabled={busyId === "all"}
                            onClick={markAllRead}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mt-1 disabled:opacity-50"
                        >
                            {busyId === "all" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    {filterTabs.map((tab) => {
                        const count = tab.key === "all"
                            ? notifications.length
                            : notifications.filter((n) => getNotificationUiCategory(n) === tab.key).length;
                        if (count === 0 && tab.key !== "all") return null;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150",
                                    filter === tab.key
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    "text-[10px] tabular-nums",
                                    filter === tab.key ? "opacity-70" : "opacity-50"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <Skeleton />
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center space-y-4">
                        <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <BellOff className="h-6 w-6 text-zinc-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                {filter === "all" ? "You're all caught up" : `No ${filter} notifications`}
                            </p>
                            <p className="text-xs text-zinc-400">
                                We&apos;ll let you know when something needs your attention.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((n, i) => (
                            <NotificationRow
                                key={n.id}
                                n={n}
                                index={i}
                                busy={busyId}
                                onRead={markRead}
                                onDismiss={dismiss}
                            />
                        ))}
                    </div>
                )}

                {!loading && notifications.length > 0 && (
                    <div className="flex items-center justify-between pt-4 pb-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <Bell className="h-3.5 w-3.5" />
                            Live updates enabled
                        </div>
                        <Link
                            href="/dashboard/settings"
                            className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
                        >
                            Settings <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
