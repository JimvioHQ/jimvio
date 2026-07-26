/**
 * Fine-grained notification categories used across Jimvio modules.
 * Maps onto DB `notifications.type` (enum) + `notifications.category` (text).
 */

import type { Database } from "@/types/supabase";

export type NotificationDbType = Database["public"]["Enums"]["notification_type"];

export const NOTIFICATION_CATEGORIES = [
  "new_message",
  "mention",
  "reply",
  "reaction",
  "community_invite",
  "space_invite",
  "live_started",
  "live_reminder",
  "course_enrollment",
  "lesson_completed",
  "certificate_issued",
  "product_purchased",
  "order_update",
  "shipping_update",
  "refund",
  "affiliate_commission",
  "campaign_update",
  "admin_announcement",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const DEFAULT_CATEGORY_ENABLED: Record<NotificationCategory, boolean> = {
  new_message: true,
  mention: true,
  reply: true,
  reaction: true,
  community_invite: true,
  space_invite: true,
  live_started: true,
  live_reminder: true,
  course_enrollment: true,
  lesson_completed: true,
  certificate_issued: true,
  product_purchased: true,
  order_update: true,
  shipping_update: true,
  refund: true,
  affiliate_commission: true,
  campaign_update: true,
  admin_announcement: true,
  system: true,
};

/** Map fine category → legacy notification_type enum for DB compatibility. */
export function categoryToDbType(category: NotificationCategory): NotificationDbType {
  switch (category) {
    case "new_message":
      return "message";
    case "mention":
    case "reply":
    case "reaction":
    case "community_invite":
    case "space_invite":
    case "live_started":
    case "live_reminder":
    case "course_enrollment":
    case "lesson_completed":
    case "certificate_issued":
      return "community";
    case "product_purchased":
    case "order_update":
    case "shipping_update":
    case "refund":
      return "order";
    case "affiliate_commission":
    case "campaign_update":
      return "affiliate";
    case "admin_announcement":
    case "system":
    default:
      return "system";
  }
}

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}
