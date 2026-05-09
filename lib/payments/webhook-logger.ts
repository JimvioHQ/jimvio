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
  // Use upsert with ignoreDuplicates to guarantee atomicity and prevent race conditions
  const { data: upserted, error: upsertError } = await db
    .from("webhook_events")
    .upsert(
      {
        provider: opts.provider,
        idempotency_key: opts.idempotencyKey,
        payload: opts.payload as object,
        status: "received" as WebhookEventStatus,
        order_id: opts.orderId ?? null,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    )
    .select("id, status")
    .maybeSingle();

  if (upsertError) {
    throw new Error(`Failed to log webhook event: ${upsertError.message}`);
  }

  // If upserted is null, ignoreDuplicates skipped insertion because the row already exists
  if (!upserted) {
    const { data: existing } = await db
      .from("webhook_events")
      .select("id, status")
      .eq("idempotency_key", opts.idempotencyKey)
      .single();

    if (existing) {
      return {
        isDuplicate: existing.status === "processed",
        eventId: existing.id,
      };
    }
  }

  return { isDuplicate: false, eventId: upserted?.id ?? null };
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
