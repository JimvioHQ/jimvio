import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { EmailPayload } from "@/lib/email/transactional";
import {
  publishNotification,
  type PublishNotificationInput,
  type PublishResult,
} from "@/lib/notifications/platform";
import type { NotificationCategory } from "@/lib/notifications/categories";

type NotificationType = Database["public"]["Enums"]["notification_type"];

export type { EmailPayload };

export type NotifyUserInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  email?: EmailPayload;
  /** Preferred fine-grained category; inferred from type/data when omitted. */
  category?: NotificationCategory;
  eventKey?: string;
  groupKey?: string;
  actorId?: string;
  force?: boolean;
};

function inferCategory(input: NotifyUserInput): NotificationCategory {
  if (input.category) return input.category;
  const data = (input.data ?? {}) as Record<string, unknown>;
  const event = String(data.event ?? data.kind ?? "").toLowerCase();
  const title = (input.title ?? "").toLowerCase();

  if (event.includes("mention") || title.includes("mentioned")) return "mention";
  if (event.includes("reply") || title.includes("replied")) return "reply";
  if (event.includes("reaction") || title.includes("reacted")) return "reaction";
  if (event === "live_started" || title.includes("going live") || title.includes("live started"))
    return "live_started";
  if (event === "live_reminder" || title.includes("reminder")) return "live_reminder";
  if (event.includes("invite") && event.includes("space")) return "space_invite";
  if (event.includes("invite") || title.includes("invite")) return "community_invite";
  if (event.includes("enroll") || title.includes("enrolled")) return "course_enrollment";
  if (event.includes("lesson") || title.includes("lesson")) return "lesson_completed";
  if (event.includes("certificate") || title.includes("certificate")) return "certificate_issued";
  if (event.includes("affiliate") || input.type === "affiliate") return "affiliate_commission";
  if (event.includes("campaign")) return "campaign_update";
  if (event.includes("refund") || title.includes("refund")) return "refund";
  if (event.includes("ship") || title.includes("shipped")) return "shipping_update";
  if (input.type === "message") return "new_message";
  if (input.type === "order" || input.type === "payment") {
    if (title.includes("purchased") || event.includes("purchase")) return "product_purchased";
    return "order_update";
  }
  if (event.includes("admin") || title.includes("announcement")) return "admin_announcement";
  if (input.type === "community") return "reply";
  return "system";
}

/**
 * Backward-compatible facade. Always publishes via the unified platform
 * (service-role insert + prefs + analytics). The `db` arg is ignored for writes.
 */
export async function notifyUser(
  _db: SupabaseClient,
  input: NotifyUserInput
): Promise<PublishResult | void> {
  const payload: PublishNotificationInput = {
    userId: input.userId,
    category: inferCategory(input),
    type: input.type,
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl,
    data: input.data,
    email: input.email,
    eventKey: input.eventKey,
    groupKey: input.groupKey,
    actorId: input.actorId,
    force: input.force,
  };

  try {
    return await publishNotification(payload);
  } catch (err) {
    console.error("[notifyUser] publish error:", err);
  }
}

export { publishNotification, publishMany } from "@/lib/notifications/platform";
