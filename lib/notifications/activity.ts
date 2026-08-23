/**
 * Unified activity-center query helpers (timeline, filters, search, pagination).
 */

import { createClient } from "@/lib/supabase/server";
import type { NotificationCategory } from "@/lib/notifications/categories";
import { groupActivityByDate } from "@/lib/notifications/ui-utils";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";

export type ActivityNotification = {
  id: string;
  user_id: string;
  type: string;
  category: string | null;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean | null;
  read_at: string | null;
  action_url: string | null;
  created_at: string | null;
  archived_at: string | null;
  group_key: string | null;
  event_key: string | null;
  delivered_at: string | null;
};

export type ActivityFeedQuery = {
  userId: string;
  cursor?: string | null;
  limit?: number;
  category?: NotificationCategory | "all" | null;
  type?: string | null;
  q?: string | null;
  unreadOnly?: boolean;
  includeArchived?: boolean;
};

export type ActivityFeedResult = {
  items: ActivityNotification[];
  nextCursor: string | null;
  hasMore: boolean;
};

const SELECT_COLS =
  "id, user_id, type, category, title, message, data, is_read, read_at, action_url, created_at, archived_at, group_key, event_key, delivered_at";

export async function getActivityFeed(
  query: ActivityFeedQuery
): Promise<ActivityFeedResult> {
  const supabase = (await createClient()) as any;
  const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);

  let q = supabase
    .from("notifications")
    .select(SELECT_COLS)
    .eq("user_id", query.userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (!query.includeArchived) {
    q = q.is("archived_at", null);
  }
  if (query.unreadOnly) {
    q = q.eq("is_read", false);
  }
  if (query.category && query.category !== "all") {
    q = q.eq("category", query.category);
  }
  if (query.type) {
    q = q.eq("type", query.type);
  }
  if (query.cursor) {
    q = q.lt("created_at", query.cursor);
  }
  if (query.q?.trim()) {
    const term = query.q.trim().replace(/[%_,.()]/g, " ");
    q = q.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) {
    // Fallback when migration columns are not yet present
    if (
      String(error.message).includes("category") ||
      String(error.message).includes("archived_at")
    ) {
      let legacy = supabase
        .from("notifications")
        .select(
          "id, user_id, type, title, message, data, is_read, read_at, action_url, created_at"
        )
        .eq("user_id", query.userId)
        .order("created_at", { ascending: false })
        .limit(limit + 1);
      if (query.unreadOnly) legacy = legacy.eq("is_read", false);
      if (query.type) legacy = legacy.eq("type", query.type);
      if (query.cursor) legacy = legacy.lt("created_at", query.cursor);
      if (query.q?.trim()) {
        const term = query.q.trim().replace(/[%_,.()]/g, " ");
        legacy = legacy.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
      }
      const legacyRes = await legacy;
      if (legacyRes.error) throw new Error(legacyRes.error.message);
      const rows = (legacyRes.data ?? []) as ActivityNotification[];
      const visible = rows.filter(
        (row) => !isTechnicalFeedBody(row.message) && !isTechnicalFeedBody(row.title),
      );
      const hasMore = rows.length > limit;
      const items = visible.slice(0, Math.min(limit, visible.length));
      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.created_at ?? null : null,
        hasMore,
      };
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ActivityNotification[];
  const visible = rows.filter(
    (row) => !isTechnicalFeedBody(row.message) && !isTechnicalFeedBody(row.title),
  );
  const hasMore = rows.length > limit;
  const items = visible.slice(0, Math.min(limit, visible.length));
  const nextCursor = hasMore ? items[items.length - 1]?.created_at ?? null : null;

  return { items, nextCursor, hasMore };
}

export { groupActivityByDate };

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc("get_unread_notification_count", {
    p_user_id: userId,
  });
  if (!error && (typeof data === "number" || typeof data === "string")) {
    return Number(data) || 0;
  }

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}
