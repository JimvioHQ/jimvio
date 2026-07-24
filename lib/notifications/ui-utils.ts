import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/types/supabase";
import {
  notificationPriorityWeight,
  type NotificationPriority,
} from "@/lib/community/personalization/types";

export type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

/** UI filter tabs — maps DB enum values into display categories. */
export type NotificationUiCategory =
    | "order"
    | "shipping"
    | "message"
    | "payment"
    | "community"
    | "system";

export function getNotificationUiCategory(n: Pick<DbNotification, "type" | "title" | "data">): NotificationUiCategory {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const title = (n.title ?? "").toLowerCase();

    if (n.type === "message") return "message";
    if (n.type === "community") return "community";
    if (n.type === "payment" || n.type === "affiliate") return "payment";
    if (
        title.includes("shipped") ||
        data.status === "shipped" ||
        Boolean(data.tracking_number)
    ) {
        return "shipping";
    }
    if (n.type === "order") return "order";
    if (n.type === "system" || n.type === "review" || n.type === "influencer") {
        return "system";
    }
    return "system";
}

/**
 * Smarter community notification priority — mentions/replies/live first.
 * Client-side ranking only; no API changes.
 */
export function classifyCommunityNotificationPriority(
  n: Pick<DbNotification, "type" | "title" | "message" | "data">
): NotificationPriority {
  const data = (n.data ?? {}) as Record<string, unknown>;
  const hay = `${n.title ?? ""} ${n.message ?? ""} ${String(data.kind ?? "")} ${String(data.event ?? "")}`.toLowerCase();

  if (hay.includes("mention") || data.is_mention === true) return "mention";
  if (hay.includes("replied") || hay.includes("reply") || data.is_reply === true)
    return "reply";
  if (hay.includes("live") || hay.includes("going live") || data.live === true)
    return "live";
  if (hay.includes("announcement") || data.announcement === true)
    return "announcement";
  if (hay.includes("course") || hay.includes("lesson published"))
    return "course";
  if (hay.includes("resource") || hay.includes("uploaded") || hay.includes("download"))
    return "resource";
  return "other";
}

export function sortNotificationsByPriority<T extends Pick<DbNotification, "type" | "title" | "message" | "data" | "is_read" | "created_at">>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    // Unread first
    if (Boolean(a.is_read) !== Boolean(b.is_read)) {
      return a.is_read ? 1 : -1;
    }
    const wa = notificationPriorityWeight(
      classifyCommunityNotificationPriority(a)
    );
    const wb = notificationPriorityWeight(
      classifyCommunityNotificationPriority(b)
    );
    if (wa !== wb) return wa - wb;
    return Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "");
  });
}

export function formatNotificationTime(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
        return "";
    }
}
