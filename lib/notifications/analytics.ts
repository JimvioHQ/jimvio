/**
 * Notification lifecycle analytics (sent / delivered / read / CTR / engagement).
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type NotificationEventName =
  | "sent"
  | "delivered"
  | "read"
  | "click"
  | "archived"
  | "deleted"
  | "email_queued"
  | "email_suppressed"
  | "push_ready"
  | "grouped"
  | "rate_limited"
  | "skipped";

function db() {
  return createServiceRoleClient() as any;
}

export async function trackNotificationEvent(input: {
  userId: string;
  notificationId?: string | null;
  eventName: NotificationEventName;
  properties?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db().from("notification_events").insert({
      user_id: input.userId,
      notification_id: input.notificationId ?? null,
      event_name: input.eventName,
      properties: input.properties ?? {},
    });
  } catch (err) {
    console.warn("[trackNotificationEvent] non-fatal:", err);
  }
}

export type NotificationAnalyticsSummary = {
  sent: number;
  delivered: number;
  read: number;
  clicks: number;
  archived: number;
  deleted: number;
  ctr: number;
  engagement: number;
};

export async function getUserNotificationAnalytics(
  userId: string,
  opts?: { days?: number }
): Promise<NotificationAnalyticsSummary> {
  const days = Math.min(Math.max(opts?.days ?? 30, 1), 365);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await db()
    .from("notification_events")
    .select("event_name")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(5000);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const name = String(row.event_name);
    counts[name] = (counts[name] ?? 0) + 1;
  }

  const sent = counts.sent ?? 0;
  const delivered = counts.delivered ?? sent;
  const read = counts.read ?? 0;
  const clicks = counts.click ?? 0;
  const archived = counts.archived ?? 0;
  const deleted = counts.deleted ?? 0;
  const denom = delivered > 0 ? delivered : Math.max(sent, 1);
  const ctr = clicks / denom;
  const engagement = (read + clicks) / denom;

  return {
    sent,
    delivered,
    read,
    clicks,
    archived,
    deleted,
    ctr: Number(ctr.toFixed(4)),
    engagement: Number(engagement.toFixed(4)),
  };
}
