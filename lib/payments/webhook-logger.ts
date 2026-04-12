/**
 * lib/payments/webhook-logger.ts
 *
 * Centralized webhook event logger.
 * - Stores every incoming webhook in `webhook_events` for audit / replay.
 * - Implements idempotency: returns `isDuplicate: true` if the same
 *   idempotency key has already been processed successfully.
 *
 * Table DDL (run once in Supabase SQL editor):
 *
 *   create table if not exists webhook_events (
 *     id              uuid primary key default gen_random_uuid(),
 *     provider        text not null,
 *     idempotency_key text not null,
 *     payload         jsonb,
 *     status          text not null default 'received',   -- received | processed | failed
 *     error           text,
 *     order_id        uuid references orders(id),
 *     created_at      timestamptz not null default now(),
 *     updated_at      timestamptz not null default now(),
 *     unique (idempotency_key)
 *   );
 *   create index if not exists webhook_events_provider_idx on webhook_events(provider);
 *   create index if not exists webhook_events_order_id_idx  on webhook_events(order_id);
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookEventStatus = "received" | "processed" | "failed";

export interface LogWebhookOptions {
  provider: string;
  /** Must be globally unique per successful payment event (e.g. `flw-{txId}`) */
  idempotencyKey: string;
  payload: unknown;
  orderId?: string | null;
}

export interface LogWebhookResult {
  /** true when this exact key was already processed — caller should skip */
  isDuplicate: boolean;
  /** DB row id — pass back to markWebhookProcessed / markWebhookFailed */
  eventId: string | null;
}

/**
 * Insert a new webhook event row (idempotent).
 * Returns `isDuplicate: true` if a row with the same key already exists
 * with status = 'processed'.
 */
export async function logWebhookEvent(
  db: SupabaseClient,
  opts: LogWebhookOptions
): Promise<LogWebhookResult> {
  // Check for existing row first (avoids unique-violation noise in logs)
  const { data: existing } = await db
    .from("webhook_events")
    .select("id, status")
    .eq("idempotency_key", opts.idempotencyKey)
    .maybeSingle();

  if (existing) {
    if (existing.status === "processed") {
      return { isDuplicate: true, eventId: existing.id };
    }
    // Already inserted but not yet processed (e.g. previous crash) — reuse row
    return { isDuplicate: false, eventId: existing.id };
  }

  const { data: inserted } = await db
    .from("webhook_events")
    .insert({
      provider: opts.provider,
      idempotency_key: opts.idempotencyKey,
      payload: opts.payload as object,
      status: "received" as WebhookEventStatus,
      order_id: opts.orderId ?? null,
    })
    .select("id")
    .single();

  return { isDuplicate: false, eventId: inserted?.id ?? null };
}

/** Mark webhook row as successfully processed */
export async function markWebhookProcessed(
  db: SupabaseClient,
  eventId: string,
  orderId?: string | null
): Promise<void> {
  await db
    .from("webhook_events")
    .update({
      status: "processed" as WebhookEventStatus,
      order_id: orderId ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}

/** Mark webhook row as failed with error detail */
export async function markWebhookFailed(
  db: SupabaseClient,
  eventId: string,
  error: string
): Promise<void> {
  await db
    .from("webhook_events")
    .update({
      status: "failed" as WebhookEventStatus,
      error: error.slice(0, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}
