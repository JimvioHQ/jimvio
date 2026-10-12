/**
 * Unified notification publish pipeline.
 * All modules should publish through notifyUser / publishNotification.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailPayload } from "@/lib/email/transactional";
import { sendRenderedEmail } from "@/lib/email/transactional";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  categoryToDbType,
  type NotificationCategory,
  type NotificationDbType,
} from "@/lib/notifications/categories";
import {
  getPlatformPreferences,
  isCategoryEnabled,
  isInQuietHours,
} from "@/lib/notifications/preferences";
import { trackNotificationEvent } from "@/lib/notifications/analytics";

export type { EmailPayload };

export type PublishNotificationInput = {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  /** Override legacy DB enum when needed. */
  type?: NotificationDbType;
  /** Idempotency key (unique per user). */
  eventKey?: string;
  /** Collapse duplicates within GROUP_WINDOW_MS. */
  groupKey?: string;
  email?: EmailPayload;
  /** Skip preference category gate (admin critical). */
  force?: boolean;
  /** Actor that triggered the notify — used for spam rate limits. */
  actorId?: string;
};

const GROUP_WINDOW_MS = 60 * 60 * 1000;
const PER_USER_HOURLY_CAP = 120;
const PER_ACTOR_HOURLY_CAP = 300;

function adminDb(): SupabaseClient {
  return createServiceRoleClient() as any;
}

async function dispatchEmail(
  to: string,
  toName: string | null | undefined,
  email: EmailPayload
): Promise<void> {
  await sendRenderedEmail(
    { to, toName },
    {
      ...email,
      destinationLabel: email.destinationLabel ?? toName ?? undefined,
      idempotencyKey:
        email.idempotencyKey ??
        (email.orderId ? `${email.kind}.${email.orderId}` : undefined),
    },
  );
}

async function tryGroupExisting(
  db: SupabaseClient,
  input: PublishNotificationInput
): Promise<string | null> {
  if (!input.groupKey) return null;
  const since = new Date(Date.now() - GROUP_WINDOW_MS).toISOString();
  const { data: existing } = await (db as any)
    .from("notifications")
    .select("id, data, message")
    .eq("user_id", input.userId)
    .eq("group_key", input.groupKey)
    .is("archived_at", null)
    .eq("is_read", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing?.id) return null;

  const prevData = (existing.data ?? {}) as Record<string, unknown>;
  const repeat = Number(prevData.repeat_count ?? 1) + 1;
  const { error } = await (db as any)
    .from("notifications")
    .update({
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      data: {
        ...prevData,
        ...(input.data ?? {}),
        repeat_count: repeat,
        last_grouped_at: new Date().toISOString(),
      },
      delivered_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .eq("user_id", input.userId);

  if (error) return null;

  await trackNotificationEvent({
    userId: input.userId,
    notificationId: existing.id,
    eventName: "grouped",
    properties: { category: input.category, repeat_count: repeat },
  });
  return existing.id as string;
}

export type PublishResult = {
  ok: boolean;
  notificationId?: string;
  skipped?: boolean;
  reason?: string;
};

/**
 * Canonical publish entry — service-role insert, prefs, quiet hours, grouping, analytics.
 */
export async function publishNotification(
  input: PublishNotificationInput
): Promise<PublishResult> {
  if (!input.userId) return { ok: false, skipped: true, reason: "missing_user" };

  if (input.actorId && input.actorId === input.userId && !input.force) {
    return { ok: false, skipped: true, reason: "self_notify" };
  }

  const actorGate = rateLimit(
    `notif-actor:${input.actorId ?? "system"}`,
    PER_ACTOR_HOURLY_CAP,
    3_600_000
  );
  if (!actorGate.allowed && !input.force) {
    await trackNotificationEvent({
      userId: input.userId,
      eventName: "rate_limited",
      properties: { scope: "actor", category: input.category },
    });
    return { ok: false, skipped: true, reason: "actor_rate_limited" };
  }

  const userGate = rateLimit(`notif-user:${input.userId}`, PER_USER_HOURLY_CAP, 3_600_000);
  if (!userGate.allowed && !input.force) {
    await trackNotificationEvent({
      userId: input.userId,
      eventName: "rate_limited",
      properties: { scope: "user", category: input.category },
    });
    return { ok: false, skipped: true, reason: "user_rate_limited" };
  }

  let prefs;
  try {
    prefs = await getPlatformPreferences(input.userId);
  } catch {
    prefs = null;
  }

  if (prefs && !input.force && !isCategoryEnabled(prefs, input.category)) {
    await trackNotificationEvent({
      userId: input.userId,
      eventName: "skipped",
      properties: { reason: "category_disabled", category: input.category },
    });
    return { ok: false, skipped: true, reason: "category_disabled" };
  }

  if (!hasSupabaseSecretKey()) {
    console.error("[publishNotification] missing service role key");
    return { ok: false, reason: "no_service_role" };
  }

  const db = adminDb();
  const quiet = prefs ? isInQuietHours(prefs) : false;
  const dbType = input.type ?? categoryToDbType(input.category);
  const now = new Date().toISOString();

  // Dedup via event_key
  if (input.eventKey) {
    const { data: dup } = await (db as any)
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("event_key", input.eventKey)
      .maybeSingle();
    if (dup?.id) {
      return { ok: true, notificationId: dup.id, skipped: true, reason: "duplicate_event_key" };
    }
  }

  const groupedId = await tryGroupExisting(db, input);
  if (groupedId) {
    return { ok: true, notificationId: groupedId };
  }

  await trackNotificationEvent({
    userId: input.userId,
    eventName: "sent",
    properties: { category: input.category, type: dbType },
  });

  const payload = {
    user_id: input.userId,
    type: dbType,
    category: input.category,
    title: input.title,
    message: input.message,
    action_url: input.actionUrl ?? null,
    data: {
      ...(input.data ?? {}),
      category: input.category,
      quiet_hours: quiet,
      push_ready: Boolean(prefs?.push_enabled),
      sms_ready: Boolean(prefs?.sms_enabled),
    },
    group_key: input.groupKey ?? null,
    event_key: input.eventKey ?? null,
    delivery_channel: "in_app",
    delivered_at: now,
    is_read: false,
  };

  const { data: inserted, error } = await (db as any)
    .from("notifications")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    // Unique race on event_key
    if (String(error.code) === "23505" && input.eventKey) {
      const { data: existing } = await (db as any)
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("event_key", input.eventKey)
        .maybeSingle();
      return {
        ok: true,
        notificationId: existing?.id,
        skipped: true,
        reason: "duplicate_event_key",
      };
    }
    console.error("[publishNotification] insert failed:", error.message);
    return { ok: false, reason: error.message };
  }

  const notificationId = inserted?.id as string | undefined;
  await trackNotificationEvent({
    userId: input.userId,
    notificationId,
    eventName: "delivered",
    properties: { category: input.category, channel: "in_app" },
  });

  if (prefs?.push_enabled) {
    await trackNotificationEvent({
      userId: input.userId,
      notificationId,
      eventName: "push_ready",
      properties: { category: input.category },
    });
  }

  // Email channel
  if (input.email) {
    const emailAllowed =
      input.force ||
      (prefs?.email_enabled !== false && !quiet);
    if (!emailAllowed) {
      await trackNotificationEvent({
        userId: input.userId,
        notificationId,
        eventName: "email_suppressed",
        properties: { reason: quiet ? "quiet_hours" : "email_disabled" },
      });
    } else {
      try {
        const { data: profile } = await (db as any)
          .from("profiles")
          .select("email, full_name")
          .eq("id", input.userId)
          .maybeSingle();
        if (profile?.email) {
          await dispatchEmail(profile.email, profile.full_name, input.email);
          await trackNotificationEvent({
            userId: input.userId,
            notificationId,
            eventName: "email_queued",
            properties: { kind: input.email.kind },
          });
        }
      } catch (err) {
        console.warn("[publishNotification] email failed (non-fatal):", err);
      }
    }
  }

  return { ok: true, notificationId };
}

/** Fan-out helper with concurrency cap. */
export async function publishMany(
  inputs: PublishNotificationInput[],
  concurrency = 20
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  for (let i = 0; i < inputs.length; i += concurrency) {
    const chunk = inputs.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((input) => publishNotification(input)));
    results.push(...chunkResults);
  }
  return results;
}
