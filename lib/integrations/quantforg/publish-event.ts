import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  logWebhookEvent,
  markWebhookFailed,
  markWebhookProcessed,
} from "@/lib/payments/webhook-logger";
import {
  QUANTFORG_COMMUNITY_ID,
  QUANTFORG_ROOM_ID,
  QUANTFORG_SENDER_USER_ID,
  QUANTFORG_WEBHOOK_PROVIDER,
  quantForgIdempotencyKey,
} from "./constants";
import { formatQuantForgSpaceMessage } from "./format-message";
import type { QuantForgWebhookPayload } from "./types";

export type QuantForgPublishResult =
  | { ok: true; duplicate: true; messageId: string | null }
  | { ok: true; duplicate: false; messageId: string }
  | { ok: false; error: string; status: number };

export async function publishQuantForgEvent(
  payload: QuantForgWebhookPayload,
  db: SupabaseClient = createServiceRoleClient()
): Promise<QuantForgPublishResult> {
  const existingMessageId = await findMessageForEvent(db, payload.event_id);
  if (existingMessageId) {
    return { ok: true, duplicate: true, messageId: existingMessageId };
  }

  const idempotencyKey = quantForgIdempotencyKey(payload.event_id);

  const { isDuplicate, eventId } = await logWebhookEvent(db, {
    provider: QUANTFORG_WEBHOOK_PROVIDER,
    idempotencyKey,
    payload,
  });

  if (isDuplicate) {
    const messageId = (await findMessageForEvent(db, payload.event_id)) ?? existingMessageId;
    return { ok: true, duplicate: true, messageId };
  }

  const roomOk = await verifyDestinationRoom(db);
  if (!roomOk.ok) {
    if (eventId) await markWebhookFailed(db, eventId, roomOk.error);
    return { ok: false, error: roomOk.error, status: roomOk.status };
  }

  const body = formatQuantForgSpaceMessage(payload);
  const metadata = {
    source: QUANTFORG_WEBHOOK_PROVIDER,
    integration: true,
    event_id: payload.event_id,
    event_type: payload.event_type,
    timestamp: payload.timestamp,
    ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
  };

  const { data: message, error } = await db
    .from("community_messages")
    .insert({
      room_id: QUANTFORG_ROOM_ID,
      community_id: QUANTFORG_COMMUNITY_ID,
      sender_id: QUANTFORG_SENDER_USER_ID,
      body,
      message_type: "text",
      metadata,
    })
    .select("id")
    .single();

  if (error || !message?.id) {
    if (error?.code === "23505") {
      const messageId = await findMessageForEvent(db, payload.event_id);
      if (eventId) await markWebhookProcessed(db, eventId);
      return { ok: true, duplicate: true, messageId };
    }
    const msg = error?.message || "Failed to publish message";
    if (eventId) await markWebhookFailed(db, eventId, msg);
    return { ok: false, error: msg, status: 500 };
  }

  if (eventId) await markWebhookProcessed(db, eventId);
  return { ok: true, duplicate: false, messageId: message.id };
}

async function verifyDestinationRoom(
  db: SupabaseClient
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: room, error } = await db
    .from("rooms")
    .select("id, community_id, space_id, is_active, slug, name")
    .eq("id", QUANTFORG_ROOM_ID)
    .maybeSingle();

  if (error || !room) {
    return { ok: false, error: "Destination room not found", status: 500 };
  }
  if (room.is_active === false) {
    return { ok: false, error: "Destination room is inactive", status: 500 };
  }
  if (room.community_id !== QUANTFORG_COMMUNITY_ID) {
    return { ok: false, error: "Destination room community mismatch", status: 500 };
  }

  return { ok: true };
}

async function findMessageForEvent(
  db: SupabaseClient,
  eventId: string
): Promise<string | null> {
  const { data } = await db
    .from("community_messages")
    .select("id")
    .eq("room_id", QUANTFORG_ROOM_ID)
    .contains("metadata", { event_id: eventId, source: QUANTFORG_WEBHOOK_PROVIDER })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getQuantForgIntegrationStatus(db: SupabaseClient = createServiceRoleClient()) {
  const { data: lastEvent } = await db
    .from("webhook_events")
    .select("id, status, created_at, updated_at, error, payload")
    .eq("provider", QUANTFORG_WEBHOOK_PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = lastEvent?.payload as QuantForgWebhookPayload | null;

  return {
    configured: Boolean(process.env.QUANTFORG_WEBHOOK_SECRET?.trim()),
    destination: {
      community_id: QUANTFORG_COMMUNITY_ID,
      room_id: QUANTFORG_ROOM_ID,
      sender_user_id: QUANTFORG_SENDER_USER_ID,
    },
    last_event: lastEvent
      ? {
          id: lastEvent.id,
          status: lastEvent.status,
          event_id: payload?.event_id ?? null,
          event_type: payload?.event_type ?? null,
          received_at: lastEvent.created_at,
          processed_at:
            lastEvent.status === "processed" ? lastEvent.updated_at : null,
          error: lastEvent.error ?? null,
        }
      : null,
  };
}
