import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean | null;
  read_at: string | null;
  action_url: string | null;
  created_at: string | null;
}

/**
 * Fetch the current user's notifications with optional filters.
 */
export async function getNotifications(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<AppNotification[]> {
  const supabase = createClient();
  const limit = opts?.limit ?? 20;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }
  return (data ?? []) as unknown as AppNotification[];
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);
}

/**
 * Mark all of the current user's notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("is_read", false);
}

/**
 * Delete a notification.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").delete().eq("id", notificationId);
}

/**
 * Create an in-app notification (called from server actions / server-side).
 * This uses the Supabase service role client, so it bypasses RLS.
 */
export async function createNotification(input: {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action_url?: string;
}): Promise<void> {
  const { createServiceRoleClient } = await import("@/lib/supabase/service-role");
  const supabase = createServiceRoleClient();
  await supabase.from("notifications").insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? {},
    action_url: input.action_url ?? null,
  });
}

/**
 * Icon name helper — maps notification types to lucide icon names.
 */
export function getNotificationIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    order: "ShoppingCart",
    payment: "DollarSign",
    affiliate: "Users",
    influencer: "Star",
    community: "UsersRound",
    system: "Bell",
    review: "MessageSquare",
    message: "MessageCircle",
  };
  return map[type] ?? "Bell";
}

/**
 * Color helper — maps notification types to a hex color for the icon badge.
 */
export function getNotificationColor(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    order: "#2563eb",
    payment: "#16a34a",
    affiliate: "#ca8a04",
    influencer: "#a855f7",
    community: "var(--color-accent)",
    system: "#6b7280",
    review: "#ec4899",
    message: "#3b82f6",
  };
  return map[type] ?? "#6b7280";
}

/**
 * Time-ago formatter for notification timestamps.
 */
export function formatNotificationTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
